/**
 * Phase 2 — Repository Indexer
 *
 * Compiles file nodes, directory trees, parsed manifests, languages,
 * frameworks, and architectural modules into the structured `RepositoryIndex`.
 */

import {
  IngestionLimits,
  IngestionStatusCode,
  IngestionSummary,
  RepositoryDependency,
  RepositoryDirectoryNode,
  RepositoryFileNode,
  RepositoryIndex,
  RepositoryManifest,
  RepositoryRef,
  SkippedFileEntry,
} from './types';
import { aggregateLanguages } from './languageDetector';
import { detectFrameworks } from './frameworkDetector';
import { detectModules } from './moduleDetector';

export function buildDirectoryNodes(files: RepositoryFileNode[]): RepositoryDirectoryNode[] {
  const dirMap = new Map<string, {
    fileCount: number;
    directFileCount: number;
    subdirs: Set<string>;
    totalBytes: number;
  }>();

  // Initialize root directory
  dirMap.set('', { fileCount: 0, directFileCount: 0, subdirs: new Set(), totalBytes: 0 });

  for (const file of files) {
    const parts = file.path.split('/');
    const fileName = parts.pop() || '';
    const fileDir = parts.join('/');

    // Traverse all ancestors
    let currentDir = '';
    for (let i = 0; i < parts.length; i++) {
      const parent = currentDir;
      const part = parts[i];
      currentDir = parent ? `${parent}/${part}` : part;

      if (!dirMap.has(currentDir)) {
        dirMap.set(currentDir, { fileCount: 0, directFileCount: 0, subdirs: new Set(), totalBytes: 0 });
      }

      if (parent !== currentDir) {
        dirMap.get(parent)?.subdirs.add(currentDir);
      }

      const dirData = dirMap.get(currentDir)!;
      dirData.fileCount += 1;
      dirData.totalBytes += file.sizeBytes;
    }

    // Direct parent count
    const directParent = dirMap.get(fileDir);
    if (directParent) {
      directParent.directFileCount += 1;
    }
  }

  const result: RepositoryDirectoryNode[] = [];

  for (const [path, data] of dirMap.entries()) {
    if (!path) continue; // skip internal root marker
    const name = path.split('/').pop() || path;
    result.push({
      path,
      name,
      type: 'directory',
      fileCount: data.fileCount,
      directFileCount: data.directFileCount,
      directSubdirCount: data.subdirs.size,
      totalBytes: data.totalBytes,
    });
  }

  return result.sort((a, b) => a.path.localeCompare(b.path));
}

export function assembleRepositoryIndex(params: {
  repository: RepositoryRef;
  files: RepositoryFileNode[];
  manifests: RepositoryManifest[];
  treeTruncated: boolean;
  durationMs: number;
  apiRequestsCount: number;
  rateLimited: boolean;
  limits: IngestionLimits;
  customReason?: string;
}): RepositoryIndex {
  const {
    repository,
    files,
    manifests,
    treeTruncated,
    durationMs,
    apiRequestsCount,
    rateLimited,
    limits,
    customReason,
  } = params;

  // Flatten all dependencies from manifests
  const allDependencies: RepositoryDependency[] = [];
  for (const m of manifests) {
    allDependencies.push(...m.dependencies, ...m.devDependencies);
  }

  // Aggregate languages, frameworks, modules, directories
  const languages = aggregateLanguages(files);
  const frameworks = detectFrameworks(files, allDependencies);
  const modules = detectModules(files);
  const directories = buildDirectoryNodes(files);

  // Calculate file & byte statistics
  const totalFilesCounted = files.length;
  const indexedFiles = files.filter(f => f.status === 'indexed' || f.status === 'manifest_parsed');
  const indexedFilesCount = indexedFiles.length;
  const skippedFilesNodes = files.filter(f => f.status === 'skipped');
  const skippedFilesCount = skippedFilesNodes.length;

  const totalBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const indexedBytes = indexedFiles.reduce((acc, f) => acc + f.sizeBytes, 0);

  const skippedFiles: SkippedFileEntry[] = skippedFilesNodes.map(f => ({
    path: f.path,
    reason: f.skipReason || 'unsupported_extension',
    sizeBytes: f.sizeBytes,
  }));

  // Determine status & completeness
  let status: IngestionStatusCode = 'complete';
  let isComplete = true;
  let reason: string | undefined = customReason;

  if (rateLimited) {
    status = 'rate_limited';
    isComplete = false;
    reason = 'GitHub API rate limit reached during repository inspection.';
  } else if (treeTruncated) {
    status = 'partial';
    isComplete = false;
    reason = 'GitHub recursive tree truncated at 100,000 nodes. Large repository partially indexed.';
  } else if (indexedFilesCount >= limits.maxFiles || indexedBytes >= limits.maxTotalBytes) {
    status = 'partial';
    isComplete = false;
    reason = `Repository limits reached (max files: ${limits.maxFiles}, max bytes: ${limits.maxTotalBytes}). Partial index returned.`;
  }

  const ingestion: IngestionSummary = {
    status,
    isComplete,
    reason,
    totalFilesCounted,
    indexedFilesCount,
    skippedFilesCount,
    directoryCount: directories.length,
    totalBytes,
    indexedBytes,
    treeTruncated,
    durationMs,
    apiRequestsCount,
    rateLimited,
  };

  return {
    repository,
    ingestion,
    files,
    directories,
    languages,
    frameworks,
    dependencies: allDependencies,
    manifests,
    modules,
    skippedFiles,
    indexedAt: new Date().toISOString(),
  };
}
