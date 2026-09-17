/**
 * Phase 8 — GitHub Pull Request Fetcher
 *
 * Retrieves authoritative Pull Request metadata, changed files list,
 * and unified diffs directly from the GitHub REST API v3.
 * Server-side execution only — GITHUB_TOKEN is kept strictly confidential.
 */

import { PullRequestMetadata, PRChangedFile } from './types';

const API_BASE = 'https://api.github.com';

export class GitHubPRError extends Error {
  code: 'NOT_FOUND' | 'RATE_LIMITED' | 'UNAUTHORIZED' | 'NETWORK_ERROR' | 'INVALID_REQUEST';
  statusCode?: number;

  constructor(code: 'NOT_FOUND' | 'RATE_LIMITED' | 'UNAUTHORIZED' | 'NETWORK_ERROR' | 'INVALID_REQUEST', message: string, statusCode?: number) {
    super(message);
    this.name = 'GitHubPRError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function buildHeaders(accept: string = 'application/vnd.github.v3+json'): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'DevPilot-PR-Review-Engine/2.0',
    Accept: accept,
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

export function parseRepoOwnerAndName(repoIdentifier: string): { owner: string; repo: string } {
  const clean = repoIdentifier
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/$/, '');

  const parts = clean.split('/');
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new GitHubPRError(
      'INVALID_REQUEST',
      `Invalid repository identifier "${repoIdentifier}". Expected format "owner/repo" or a GitHub repository URL.`
    );
  }

  const owner = parts[0].replace(/[^a-zA-Z0-9._-]/g, '');
  const repo = parts[1].replace(/[^a-zA-Z0-9._-]/g, '');

  if (!owner || !repo) {
    throw new GitHubPRError('INVALID_REQUEST', 'Repository owner or name contains invalid characters.');
  }

  return { owner, repo };
}

/**
 * Fetches authoritative Pull Request metadata from GitHub.
 */
export async function fetchPullRequestMetadata(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PullRequestMetadata> {
  const url = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: buildHeaders(), cache: 'no-store' });
  } catch (err: any) {
    throw new GitHubPRError('NETWORK_ERROR', `Failed to connect to GitHub API: ${err.message}`);
  }

  if (res.status === 404) {
    throw new GitHubPRError('NOT_FOUND', `Pull Request #${pullNumber} not found in repository "${owner}/${repo}".`, 404);
  }
  if (res.status === 403 || res.status === 429) {
    const rateLimitRemaining = res.headers.get('x-ratelimit-remaining');
    if (rateLimitRemaining === '0') {
      throw new GitHubPRError('RATE_LIMITED', 'GitHub API rate limit exceeded. Please configure a valid GITHUB_TOKEN.', res.status);
    }
    throw new GitHubPRError('UNAUTHORIZED', 'Access denied to repository. Repository may be private or token has insufficient permissions.', res.status);
  }
  if (!res.ok) {
    throw new GitHubPRError('NETWORK_ERROR', `GitHub API returned unexpected status ${res.status} when fetching PR metadata.`, res.status);
  }

  const data = await res.json() as any;

  return {
    number: data.number,
    title: data.title || `PR #${pullNumber}`,
    body: data.body || null,
    author: data.user?.login || 'unknown',
    authorAvatarUrl: data.user?.avatar_url,
    state: data.merged_at ? 'merged' : (data.state === 'closed' ? 'closed' : 'open'),
    baseBranch: data.base?.ref || 'main',
    headBranch: data.head?.ref || 'patch',
    baseSha: data.base?.sha || '',
    headSha: data.head?.sha || '',
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
    mergedAt: data.merged_at || null,
    additions: data.additions || 0,
    deletions: data.deletions || 0,
    changedFilesCount: data.changed_files || 0,
    htmlUrl: data.html_url || `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
    draft: Boolean(data.draft),
  };
}

/**
 * Fetches list of changed files for the Pull Request.
 */
export async function fetchPullRequestFiles(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PRChangedFile[]> {
  const url = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/files?per_page=100`;

  let res: Response;
  try {
    res = await fetch(url, { headers: buildHeaders(), cache: 'no-store' });
  } catch (err: any) {
    throw new GitHubPRError('NETWORK_ERROR', `Failed to fetch PR changed files: ${err.message}`);
  }

  if (!res.ok) {
    return [];
  }

  const data = await res.json() as any[];
  if (!Array.isArray(data)) return [];

  return data.map(item => {
    let status: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified';
    if (item.status === 'added') status = 'added';
    else if (item.status === 'removed') status = 'deleted';
    else if (item.status === 'renamed') status = 'renamed';

    return {
      filePath: item.filename,
      oldPath: item.previous_filename,
      status,
      additions: item.additions || 0,
      deletions: item.deletions || 0,
      changes: item.changes || 0,
      patch: item.patch,
      rawContent: undefined,
    };
  });
}

/**
 * Fetches the authoritative unified diff of the PR.
 */
export async function fetchPullRequestDiff(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<string> {
  const url = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: buildHeaders('application/vnd.github.v3.diff'),
      cache: 'no-store',
    });
  } catch (err: any) {
    throw new GitHubPRError('NETWORK_ERROR', `Failed to fetch PR unified diff: ${err.message}`);
  }

  if (!res.ok) {
    return '';
  }

  return await res.text();
}
