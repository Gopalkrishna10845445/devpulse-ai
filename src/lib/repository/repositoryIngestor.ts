/**
 * Phase 2 — Repository Ingestor Service
 *
 * Orchestrates full repository ingestion:
 *   1. Validates repository coordinates
 *   2. Single-flight promise deduplication & short-term TTL caching
 *   3. Fetches repository metadata from GitHub REST API
 *   4. Fetches recursive repository tree
 *   5. Runs deterministic file filtering, binary & sensitive classification
 *   6. Fetches and parses dependency manifests with bounded concurrency
 *   7. Assembles the typed `RepositoryIndex`
 *
 * Strict server-side execution — GITHUB_TOKEN never leaves the server.
 */

import {
  DEFAULT_INGESTION_LIMITS,
  classifyFile,
  getFileExtension,
} from './fileFilter';
import { detectFileLanguage } from './languageDetector';
import { parseManifestContent } from './dependencyDetector';
import { assembleRepositoryIndex } from './repositoryIndexer';
import {
  IngestRepositoryRequest,
  IngestionErrorCode,
  IngestionLimits,
  RepositoryFileNode,
  RepositoryIndex,
  RepositoryManifest,
  RepositoryRef,
} from './types';

const API_BASE = 'https://api.github.com';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory TTL

// ─── Single-Flight Coalescing & Memory Cache ───────────────────────────────────

const inFlightIngestions = new Map<string, Promise<RepositoryIndex>>();
const indexCache = new Map<string, { index: RepositoryIndex; timestamp: number }>();

export function clearIngestionCache(): void {
  indexCache.clear();
  inFlightIngestions.clear();
}

export class IngestionError extends Error {
  code: IngestionErrorCode;
  details?: string;
  retryAfterSeconds?: number;

  constructor(code: IngestionErrorCode, message: string, details?: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'IngestionError';
    this.code = code;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// ─── Coordinate Parser ─────────────────────────────────────────────────────────

export function parseRepositoryCoordinates(input: IngestRepositoryRequest): {
  owner: string;
  repo: string;
  branch?: string;
} {
  let owner = input.owner?.trim() || '';
  let repo = input.repository?.trim() || '';
  const branch = input.branch?.trim() || undefined;

  // Handle fullName: "owner/repo"
  if (!owner && input.fullName) {
    const parts = input.fullName.split('/');
    if (parts.length >= 2) {
      owner = parts[0].trim();
      repo = parts[1].trim();
    }
  }

  // Handle url: "https://github.com/owner/repo"
  if ((!owner || !repo) && input.url) {
    const cleanUrl = input.url
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/\/$/, '');
    const parts = cleanUrl.split('/');
    if (parts.length >= 2) {
      owner = parts[0].trim();
      repo = parts[1].trim();
    }
  }

  // Sanitize
  owner = owner.replace(/[^a-zA-Z0-9._-]/g, '');
  repo = repo.replace(/[^a-zA-Z0-9._-]/g, '');

  if (!owner || !repo) {
    throw new IngestionError(
      'INVALID_REPOSITORY',
      'Please specify a valid repository owner and name (or a valid GitHub repository URL).'
    );
  }

  return { owner, repo, branch };
}

// ─── Helper: Auth Headers ──────────────────────────────────────────────────────

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'DevPilot-Repository-Ingestor/2.0',
    Accept: 'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

// ─── Fetch Single Manifest Content ────────────────────────────────────────────

async function fetchFileContent(
  owner: string,
  repo: string,
  filePath: string,
  ref: string,
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const url = `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(ref)}`;
    const res = await fetch(url, { headers });

    if (res.status === 200) {
      const data = await res.json() as any;
      if (data.content && data.encoding === 'base64') {
        const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
        return decoded;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Main Ingestor Function (With Single-Flight & TTL Cache) ────────────────────

export async function ingestRepository(
  request: IngestRepositoryRequest,
  limits: IngestionLimits = DEFAULT_INGESTION_LIMITS
): Promise<RepositoryIndex> {
  const { owner, repo, branch: requestedBranch } = parseRepositoryCoordinates(request);
  const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}@${requestedBranch || 'default'}`;

  // 1. Check in-memory TTL cache
  const cached = indexCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.index;
  }

  // 2. Check single-flight in-flight promise (coalesce duplicate parallel calls)
  const inFlight = inFlightIngestions.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  // 3. Create execution promise and register it
  const executionPromise = (async () => {
    try {
      const index = await doIngestRepository(owner, repo, requestedBranch, limits);
      indexCache.set(cacheKey, { index, timestamp: Date.now() });
      return index;
    } finally {
      inFlightIngestions.delete(cacheKey);
    }
  })();

  inFlightIngestions.set(cacheKey, executionPromise);
  return executionPromise;
}

// ─── Core Ingestion Implementation ─────────────────────────────────────────────

async function doIngestRepository(
  owner: string,
  repo: string,
  requestedBranch: string | undefined,
  limits: IngestionLimits
): Promise<RepositoryIndex> {
  const startTime = Date.now();
  let apiRequestsCount = 0;
  let rateLimited = false;

  const headers = buildHeaders();

  // ── 1. Fetch Repository Metadata ───────────────────────────────────────────
  apiRequestsCount++;
  let repoData: any;
  try {
    const metaRes = await fetch(`${API_BASE}/repos/${owner}/${repo}`, { headers });

    if (metaRes.status === 401) {
      throw new IngestionError(
        'ACCESS_DENIED',
        'GitHub API authentication failed (401). Please check that GITHUB_TOKEN is valid.'
      );
    }
    if (metaRes.status === 404) {
      throw new IngestionError(
        'REPOSITORY_NOT_FOUND',
        `GitHub repository "${owner}/${repo}" was not found or is inaccessible.`
      );
    }
    if (metaRes.status === 403 || metaRes.status === 429) {
      rateLimited = true;
      throw new IngestionError(
        'RATE_LIMITED',
        'GitHub API rate limit reached. Configure GITHUB_TOKEN in .env.local to raise the limit to 5000 requests/hour.'
      );
    }
    if (!metaRes.ok) {
      throw new IngestionError(
        'GITHUB_UNAVAILABLE',
        `GitHub API returned status ${metaRes.status} when fetching repository metadata.`
      );
    }

    repoData = await metaRes.json();
  } catch (err) {
    if (err instanceof IngestionError) throw err;
    throw new IngestionError('GITHUB_UNAVAILABLE', `Network error accessing GitHub API: ${String(err)}`);
  }

  const defaultBranch = requestedBranch || repoData.default_branch || 'main';

  const repositoryRef: RepositoryRef = {
    owner: repoData.owner?.login || owner,
    name: repoData.name || repo,
    fullName: repoData.full_name || `${owner}/${repo}`,
    defaultBranch,
    url: repoData.html_url || `https://github.com/${owner}/${repo}`,
    description: repoData.description || '',
    stars: repoData.stargazers_count || 0,
    forks: repoData.forks_count || 0,
    openIssues: repoData.open_issues_count || 0,
    isPrivate: Boolean(repoData.private),
    isFork: Boolean(repoData.fork),
    isArchived: Boolean(repoData.archived),
    sizeKb: repoData.size || 0,
    createdAt: repoData.created_at ? String(repoData.created_at).split('T')[0] : '',
    updatedAt: repoData.updated_at ? String(repoData.updated_at).split('T')[0] : '',
  };

  // ── 2. Fetch Recursive Git Tree ─────────────────────────────────────────────
  apiRequestsCount++;
  let treeItems: any[] = [];
  let treeTruncated = false;

  try {
    const treeRes = await fetch(
      `${API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
      { headers }
    );

    if (treeRes.status === 401) {
      throw new IngestionError(
        'ACCESS_DENIED',
        'GitHub API authentication failed (401) while fetching repository tree.'
      );
    }
    if (treeRes.status === 404) {
      throw new IngestionError(
        'EMPTY_REPOSITORY',
        `Repository tree not found for branch "${defaultBranch}". The repository may be empty.`
      );
    }
    if (treeRes.status === 403 || treeRes.status === 429) {
      rateLimited = true;
      throw new IngestionError('RATE_LIMITED', 'GitHub API rate limit reached while fetching repository tree.');
    }
    if (!treeRes.ok) {
      throw new IngestionError(
        'GITHUB_UNAVAILABLE',
        `GitHub API returned status ${treeRes.status} when fetching repository tree.`
      );
    }

    const treeData = await treeRes.json() as any;
    treeItems = Array.isArray(treeData.tree) ? treeData.tree : [];
    treeTruncated = Boolean(treeData.truncated);
  } catch (err) {
    if (err instanceof IngestionError) throw err;
    throw new IngestionError('INGESTION_FAILED', `Failed to retrieve repository tree: ${String(err)}`);
  }

  if (treeItems.length === 0) {
    throw new IngestionError('EMPTY_REPOSITORY', 'Repository contains no files or commits.');
  }

  // ── 3. Classify & Filter Tree Items ────────────────────────────────────────
  const fileNodes: RepositoryFileNode[] = [];
  let currentIndexedFiles = 0;
  let currentIndexedBytes = 0;

  for (const item of treeItems) {
    if (item.type !== 'blob') continue;

    const path = item.path as string;
    const name = path.split('/').pop() || '';
    const sizeBytes = typeof item.size === 'number' ? item.size : 0;
    const extension = getFileExtension(path);
    const language = detectFileLanguage(path);

    // Initial classification
    const classification = classifyFile(path, sizeBytes, limits);

    let status = classification.status;
    let skipReason = classification.skipReason;

    // Check repository-wide limits
    if (status === 'indexed' || status === 'manifest_parsed') {
      if (currentIndexedFiles >= limits.maxFiles || currentIndexedBytes + sizeBytes > limits.maxTotalBytes) {
        status = 'skipped';
        skipReason = 'repository_limits_reached';
      } else {
        currentIndexedFiles++;
        currentIndexedBytes += sizeBytes;
      }
    }

    fileNodes.push({
      path,
      name,
      type: 'file',
      sizeBytes,
      extension,
      language,
      isBinary: classification.isBinary,
      isSensitive: classification.isSensitive,
      status,
      skipReason,
      sha: item.sha,
    });
  }

  // ── 4. Fetch & Parse Dependency Manifests ──────────────────────────────────
  const manifestCandidates = fileNodes
    .filter(f => f.status === 'manifest_parsed')
    .slice(0, limits.maxManifestFetchCount);

  const parsedManifests: RepositoryManifest[] = [];

  for (const manifestNode of manifestCandidates) {
    apiRequestsCount++;
    const content = await fetchFileContent(owner, repo, manifestNode.path, defaultBranch, headers);
    if (content) {
      const manifest = parseManifestContent(manifestNode.path, content);
      parsedManifests.push(manifest);
    }
  }

  const durationMs = Date.now() - startTime;

  // ── 5. Assemble and Return Repository Index ─────────────────────────────────
  const index = assembleRepositoryIndex({
    repository: repositoryRef,
    files: fileNodes,
    manifests: parsedManifests,
    treeTruncated,
    durationMs,
    apiRequestsCount,
    rateLimited,
    limits,
  });

  // ── 6. Persist to PostgreSQL (Idempotent & Fallback Safe) ───────────────────
  try {
    const { RepositoryDatabaseRepository } = await import('../db/repositories');
    await RepositoryDatabaseRepository.saveIngestedIndex(index);
  } catch {
    // Non-fatal if database is unconfigured or in memory fallback
  }

  return index;
}
