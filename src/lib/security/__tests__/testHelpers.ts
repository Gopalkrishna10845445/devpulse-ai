import { RepositoryIndex, RepositoryRef } from '../../repository/types';

export function createMockRepoRef(override?: Partial<RepositoryRef>): RepositoryRef {
  return {
    owner: 'org',
    name: 'repo',
    fullName: 'org/repo',
    defaultBranch: 'main',
    url: 'https://github.com/org/repo',
    description: 'Test repository',
    stars: 10,
    forks: 2,
    openIssues: 0,
    isPrivate: false,
    isFork: false,
    isArchived: false,
    sizeKb: 100,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    ...override,
  };
}

export function createMockRepoIndex(override?: Partial<RepositoryIndex>): RepositoryIndex {
  return {
    repository: createMockRepoRef(override?.repository),
    ingestion: {
      status: 'complete',
      isComplete: true,
      totalFilesCounted: override?.files?.length || 0,
      indexedFilesCount: override?.files?.length || 0,
      skippedFilesCount: 0,
      directoryCount: 0,
      totalBytes: 100,
      indexedBytes: 100,
      treeTruncated: false,
      durationMs: 50,
      apiRequestsCount: 1,
      rateLimited: false,
      ...(override?.ingestion || {}),
    },
    files: override?.files || [],
    directories: override?.directories || [],
    languages: override?.languages || [],
    frameworks: override?.frameworks || [],
    dependencies: override?.dependencies || [],
    manifests: override?.manifests || [],
    modules: override?.modules || [],
    skippedFiles: override?.skippedFiles || [],
    indexedAt: override?.indexedAt || new Date().toISOString(),
  };
}
