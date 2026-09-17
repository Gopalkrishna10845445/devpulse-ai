/**
 * Phase 2 — Repository Ingestion Types
 *
 * Defines the structural representation of an ingested GitHub repository.
 * Strictly deterministic — no embeddings, vector representations, or LLM data.
 */

export type IngestionStatusCode =
  | 'complete'
  | 'partial'
  | 'failed'
  | 'rate_limited';

export type FileStatus =
  | 'indexed'
  | 'skipped'
  | 'manifest_parsed';

export type SkipReason =
  | 'vendor_directory'
  | 'build_artifact'
  | 'cache_directory'
  | 'binary_file'
  | 'sensitive_file'
  | 'file_too_large'
  | 'repository_limits_reached'
  | 'lockfile'
  | 'unsupported_extension';

export type FrameworkCategory =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'testing'
  | 'build_tool'
  | 'styling'
  | 'database'
  | 'devops'
  | 'mobile';

export type FrameworkConfidence = 'high' | 'medium' | 'low';

export type ManifestEcosystem =
  | 'npm'
  | 'pypi'
  | 'cargo'
  | 'go'
  | 'maven'
  | 'gradle'
  | 'rubygems'
  | 'composer'
  | 'hex'
  | 'clojure'
  | 'swift'
  | 'unknown';

export type ModuleRole =
  | 'source_root'
  | 'app_router'
  | 'pages_router'
  | 'components'
  | 'lib_utilities'
  | 'api_routes'
  | 'services'
  | 'database_models'
  | 'controllers'
  | 'tests'
  | 'configuration'
  | 'documentation'
  | 'assets'
  | 'build_tooling';

// ─── Repository Reference ──────────────────────────────────────────────────────

export interface RepositoryRef {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  url: string;
  description: string;
  stars: number;
  forks: number;
  openIssues: number;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  sizeKb: number;
  createdAt: string;
  updatedAt: string;
}

// ─── File & Directory Nodes ────────────────────────────────────────────────────

export interface RepositoryFileNode {
  path: string;
  name: string;
  type: 'file';
  sizeBytes: number;
  extension: string;
  language: string | null;
  isBinary: boolean;
  isSensitive: boolean;
  status: FileStatus;
  skipReason: SkipReason | null;
  sha?: string;
  content?: string;
}

export interface RepositoryDirectoryNode {
  path: string;
  name: string;
  type: 'directory';
  fileCount: number;
  directFileCount: number;
  directSubdirCount: number;
  totalBytes: number;
}

// ─── Language & Framework Summaries ────────────────────────────────────────────

export interface RepositoryLanguageSummary {
  name: string;
  fileCount: number;
  bytes: number;
  percentage: number;
  color?: string;
}

export interface RepositoryFramework {
  name: string;
  category: FrameworkCategory;
  confidence: FrameworkConfidence;
  evidence: string[];
}

// ─── Dependencies & Manifests ──────────────────────────────────────────────────

export interface RepositoryDependency {
  name: string;
  versionConstraint?: string;
  isDev?: boolean;
  category?: string;
  manifestPath: string;
  ecosystem: ManifestEcosystem;
}

export interface RepositoryManifest {
  path: string;
  ecosystem: ManifestEcosystem;
  dependencyCount: number;
  devDependencyCount: number;
  dependencies: RepositoryDependency[];
  devDependencies: RepositoryDependency[];
}

// ─── Architectural Modules ─────────────────────────────────────────────────────

export interface RepositoryModule {
  name: string;
  path: string;
  fileCount: number;
  totalBytes: number;
  detectedRole: ModuleRole;
  description: string;
  primaryLanguage: string | null;
}

// ─── Ingestion Summary & Limits ────────────────────────────────────────────────

export interface IngestionLimits {
  maxFiles: number;
  maxTotalBytes: number;
  maxSingleFileBytes: number;
  maxManifestFetchCount: number;
}

export interface IngestionSummary {
  status: IngestionStatusCode;
  isComplete: boolean;
  reason?: string;
  totalFilesCounted: number;
  indexedFilesCount: number;
  skippedFilesCount: number;
  directoryCount: number;
  totalBytes: number;
  indexedBytes: number;
  treeTruncated: boolean;
  durationMs: number;
  apiRequestsCount: number;
  rateLimited: boolean;
}

export interface SkippedFileEntry {
  path: string;
  reason: SkipReason;
  sizeBytes?: number;
}

// ─── Root Repository Index ─────────────────────────────────────────────────────

export interface RepositoryIndex {
  repository: RepositoryRef;
  ingestion: IngestionSummary;
  files: RepositoryFileNode[];
  directories: RepositoryDirectoryNode[];
  languages: RepositoryLanguageSummary[];
  frameworks: RepositoryFramework[];
  dependencies: RepositoryDependency[];
  manifests: RepositoryManifest[];
  modules: RepositoryModule[];
  skippedFiles: SkippedFileEntry[];
  indexedAt: string;
}

// ─── Ingestion API Request & Response ──────────────────────────────────────────

export interface IngestRepositoryRequest {
  owner?: string;
  repository?: string;
  fullName?: string;
  url?: string;
  branch?: string;
}

export interface IngestionApiSuccessResponse {
  success: true;
  index: RepositoryIndex;
}

export type IngestionErrorCode =
  | 'INVALID_REPOSITORY'
  | 'REPOSITORY_NOT_FOUND'
  | 'ACCESS_DENIED'
  | 'RATE_LIMITED'
  | 'REPOSITORY_TOO_LARGE'
  | 'EMPTY_REPOSITORY'
  | 'INGESTION_FAILED'
  | 'GITHUB_UNAVAILABLE';

export interface IngestionApiErrorResponse {
  success: false;
  error: {
    code: IngestionErrorCode;
    message: string;
    details?: string;
    retryAfterSeconds?: number;
  };
}

export type IngestApiResponse = IngestionApiSuccessResponse | IngestionApiErrorResponse;
