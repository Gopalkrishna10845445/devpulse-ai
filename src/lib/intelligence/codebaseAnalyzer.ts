/**
 * Phase 3 — Codebase Intelligence Analyzer & Orchestrator
 *
 * Consumes the Phase 2 Repository Index, fetches source contents for primary files,
 * extracts language-aware symbols, resolves import dependency graphs, computes
 * module coupling relationships, and synthesizes the full architectural model.
 *
 * Single-flight deduplication & 5-minute memory caching prevents repeated redundant analysis.
 */

import { RepositoryIndex, RepositoryRef } from '../repository/types';
import { parseSymbols } from './symbolParser';
import {
  buildModuleRelationships,
  parseExports,
  parseImports,
  resolveImportPath,
} from './importResolver';
import { classifyArchitecture } from './architectureClassifier';
import {
  CodeExport,
  CodeImport,
  CodeSymbol,
  CodebaseIntelligence,
  FileIntelligence,
  FileRole,
} from './types';

const API_BASE = 'https://api.github.com';
const MAX_SOURCE_FETCH_LIMIT = 40;
const CODEBASE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

// ─── Single-Flight Coalescing & Memory Cache ───────────────────────────────────

const inFlightCodebaseAnalysis = new Map<string, Promise<CodebaseIntelligence>>();
const codebaseCache = new Map<string, { intelligence: CodebaseIntelligence; timestamp: number }>();

export function clearCodebaseAnalysisCache(): void {
  codebaseCache.clear();
  inFlightCodebaseAnalysis.clear();
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'DevPilot-Codebase-Intelligence/3.0',
    Accept: 'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

// ─── Fetch Source Content from GitHub ─────────────────────────────────────────

async function fetchSourceContent(
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
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Determine File Role ──────────────────────────────────────────────────────

export function determineFileRole(filePath: string): FileRole {
  const lower = filePath.toLowerCase();
  const name = lower.split('/').pop() || '';

  if (/page\.[jt]sx?$/.test(name)) return 'page';
  if (/layout\.[jt]sx?$/.test(name)) return 'layout';
  if (/route\.[jt]s$/.test(name) || lower.includes('/api/')) return 'api_route';
  if (lower.includes('/components/') || /\.(?:tsx|jsx)$/.test(name)) return 'component';
  if (lower.includes('/models/') || lower.includes('/entities/') || lower.includes('/schema/')) return 'model';
  if (lower.includes('/services/')) return 'service';
  if (lower.includes('/controllers/')) return 'controller';
  if (lower.includes('/lib/') || lower.includes('/utils/')) return 'util';
  if (lower.includes('/hooks/')) return 'hook';
  if (name.includes('types') || name.endsWith('.d.ts')) return 'type_definition';
  if (name.includes('.test.') || name.includes('.spec.') || lower.includes('__tests__')) return 'test';
  if (name.includes('.config.')) return 'config';

  return 'unknown';
}

// ─── Main Analyze Codebase Function (With Single-Flight & TTL Cache) ───────────

export async function analyzeCodebase(params: {
  index: RepositoryIndex;
  providedContents?: Map<string, string>;
} | RepositoryIndex): Promise<CodebaseIntelligence> {
  const index: RepositoryIndex = (params as any)?.index || (params as any);
  const providedContents = (params as any)?.providedContents;
  const cacheKey = index?.repository?.fullName
    ? `${index.repository.fullName.toLowerCase()}@${index.repository.defaultBranch || 'main'}`
    : 'unknown@main';

  // If contents are provided in-memory (e.g. tests or local fixtures), bypass cache
  if (!providedContents && cacheKey !== 'unknown@main') {
    const cached = codebaseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CODEBASE_CACHE_TTL_MS) {
      return cached.intelligence;
    }

    const inFlight = inFlightCodebaseAnalysis.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const executionPromise = (async () => {
    try {
      const intelligence = await doAnalyzeCodebase({ index, providedContents });
      if (!providedContents) {
        codebaseCache.set(cacheKey, { intelligence, timestamp: Date.now() });
      }
      return intelligence;
    } finally {
      if (!providedContents) {
        inFlightCodebaseAnalysis.delete(cacheKey);
      }
    }
  })();

  if (!providedContents) {
    inFlightCodebaseAnalysis.set(cacheKey, executionPromise);
  }

  return executionPromise;
}

// ─── Core Analysis Implementation ──────────────────────────────────────────────

async function doAnalyzeCodebase(params: {
  index: RepositoryIndex;
  providedContents?: Map<string, string>;
}): Promise<CodebaseIntelligence> {
  const startTime = Date.now();
  const { index, providedContents } = params;
  const { repository, files: indexedFiles } = index;
  const headers = buildHeaders();

  // 1. Select candidate source files to inspect
  const candidateFiles = indexedFiles.filter(f =>
    f.status === 'indexed' &&
    f.language !== null &&
    !['JSON', 'YAML', 'Markdown', 'Dockerfile', 'TOML'].includes(f.language)
  );

  // Prioritize primary modules (app, components, lib, services, routes)
  const prioritizedCandidates = candidateFiles.sort((a, b) => {
    const aPriority = /(?:app|components|lib|services|api|routes)\//.test(a.path) ? 1 : 0;
    const bPriority = /(?:app|components|lib|services|api|routes)\//.test(b.path) ? 1 : 0;
    return bPriority - aPriority;
  }).slice(0, MAX_SOURCE_FETCH_LIMIT);

  const allFilePaths = indexedFiles.map(f => f.path);
  const fileModuleMap = new Map<string, string>();
  for (const f of indexedFiles) {
    const parts = f.path.split('/');
    if (parts.length > 2 && parts[0] === 'src') {
      fileModuleMap.set(f.path, `src/${parts[1]}`);
    } else {
      fileModuleMap.set(f.path, parts[0] || 'root');
    }
  }

  const fileIntelligenceList: FileIntelligence[] = [];
  const allSymbols: CodeSymbol[] = [];
  const allImports: CodeImport[] = [];
  const allExports: CodeExport[] = [];

  // 2. Fetch and parse each candidate file
  for (const fileNode of prioritizedCandidates) {
    let content: string | null = null;

    if (providedContents && providedContents.has(fileNode.path)) {
      content = providedContents.get(fileNode.path)!;
    } else {
      content = await fetchSourceContent(
        repository.owner,
        repository.name,
        fileNode.path,
        repository.defaultBranch,
        headers
      );
    }

    if (!content) continue;

    const loc = content.split('\n').length;
    const role = determineFileRole(fileNode.path);

    // Extract symbols
    const symbols = parseSymbols(fileNode.path, content, fileNode.language);
    allSymbols.push(...symbols);

    // Extract imports and exports
    const rawImports = parseImports(fileNode.path, content, fileNode.language);
    const exports = parseExports(fileNode.path, content, fileNode.language);
    allExports.push(...exports);

    // Resolve internal import targets
    const resolvedImports: CodeImport[] = [];
    const internalDependencies: string[] = [];

    for (const imp of rawImports) {
      const resolved = resolveImportPath(fileNode.path, imp.importPath, allFilePaths);
      resolvedImports.push({
        ...imp,
        resolvedFilePath: resolved,
      });
      if (resolved && !internalDependencies.includes(resolved)) {
        internalDependencies.push(resolved);
      }
    }
    allImports.push(...resolvedImports);

    fileIntelligenceList.push({
      filePath: fileNode.path,
      language: fileNode.language,
      role,
      loc,
      sizeBytes: fileNode.sizeBytes,
      symbols,
      imports: resolvedImports,
      exports,
      internalDependencies,
      dependents: [], // populated in pass 2
    });
  }

  // 3. Populate reverse dependents list
  const fileIntelMap = new Map(fileIntelligenceList.map(f => [f.filePath, f]));
  for (const fi of fileIntelligenceList) {
    for (const depPath of fi.internalDependencies) {
      const target = fileIntelMap.get(depPath);
      if (target && !target.dependents.includes(fi.filePath)) {
        target.dependents.push(fi.filePath);
      }
    }
  }

  // 4. Build module relationships
  const relationships = buildModuleRelationships(allImports, fileModuleMap);

  // 5. Synthesize architectural model
  const architecture = classifyArchitecture({
    repository,
    frameworks: index.frameworks,
    modules: index.modules,
    files: fileIntelligenceList,
    symbols: allSymbols,
    relationships,
  });

  const durationMs = Date.now() - startTime;

  return {
    repository,
    files: fileIntelligenceList,
    symbols: allSymbols,
    imports: allImports,
    exports: allExports,
    relationships,
    architecture,
    analyzedAt: new Date().toISOString(),
    status: fileIntelligenceList.length > 0 ? 'complete' : 'partial',
    durationMs,
  };
}
