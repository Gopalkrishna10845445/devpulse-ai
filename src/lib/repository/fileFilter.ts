/**
 * Phase 2 — File Filtering Engine
 *
 * Deterministically classifies repository tree nodes into indexed, skipped,
 * sensitive, binary, or oversized files.
 *
 * Enforces strict boundaries:
 *   - Vendor, build, and cache artifacts are excluded.
 *   - Sensitive files (.env, keys, credentials) are flagged & skipped.
 *   - Binary files are identified and excluded from code ingestion.
 *   - Dependency manifests are explicitly preserved.
 *   - Size limits prevent single-file memory exhaustion.
 */

import { FileStatus, IngestionLimits, SkipReason } from './types';

// ─── Default Limits ────────────────────────────────────────────────────────────

export const DEFAULT_INGESTION_LIMITS: IngestionLimits = {
  maxFiles: 800,                    // Max total files to index
  maxTotalBytes: 15 * 1024 * 1024,  // 15 MB total indexed bytes
  maxSingleFileBytes: 250 * 1024,   // 250 KB max single file size
  maxManifestFetchCount: 20,        // Max manifests to fetch deep content for
};

// ─── Filter Constants ──────────────────────────────────────────────────────────

/** Directory segments that represent vendor, build, or cache artifacts */
const EXCLUDED_DIR_PATTERNS = [
  /(?:^|\/)\.git(?:\/|$)/i,
  /(?:^|\/)node_modules(?:\/|$)/i,
  /(?:^|\/)\.next(?:\/|$)/i,
  /(?:^|\/)dist(?:\/|$)/i,
  /(?:^|\/)build(?:\/|$)/i,
  /(?:^|\/)out(?:\/|$)/i,
  /(?:^|\/)coverage(?:\/|$)/i,
  /(?:^|\/)\.nyc_output(?:\/|$)/i,
  /(?:^|\/)venv(?:\/|$)/i,
  /(?:^|\/)\.venv(?:\/|$)/i,
  /(?:^|\/)env(?:\/|$)/i,
  /(?:^|\/)__pycache__(?:\/|$)/i,
  /(?:^|\/)\.pytest_cache(?:\/|$)/i,
  /(?:^|\/)\.mypy_cache(?:\/|$)/i,
  /(?:^|\/)target(?:\/|$)/i,           // Rust / Maven target
  /(?:^|\/)vendor(?:\/|$)/i,           // Go / PHP / Ruby vendor
  /(?:^|\/)bin(?:\/|$)/i,              // C# / Go bin
  /(?:^|\/)obj(?:\/|$)/i,              // C# obj
  /(?:^|\/)\.turbo(?:\/|$)/i,
  /(?:^|\/)\.cache(?:\/|$)/i,
  /(?:^|\/)\.nuxt(?:\/|$)/i,
  /(?:^|\/)\.output(?:\/|$)/i,
  /(?:^|\/)\.docusaurus(?:\/|$)/i,
  /(?:^|\/)\.svelte-kit(?:\/|$)/i,
  /(?:^|\/)\.parcel-cache(?:\/|$)/i,
  /(?:^|\/)\.idea(?:\/|$)/i,
  /(?:^|\/)\.vscode(?:\/|$)/i,
  /(?:^|\/)\.gradle(?:\/|$)/i,
];

/** Lockfile names that are skipped to avoid indexing large lock trees */
const LOCKFILE_PATTERNS = [
  /^package-lock\.json$/i,
  /^yarn\.lock$/i,
  /^pnpm-lock\.yaml$/i,
  /^Cargo\.lock$/i,
  /^poetry\.lock$/i,
  /^Gemfile\.lock$/i,
  /^composer\.lock$/i,
  /^mix\.lock$/i,
  /^pubspec\.lock$/i,
  /^packages\.lock\.json$/i,
];

/**
 * Primary dependency manifests — MUST be retained and parsed.
 * Never filter these even if they match broad pattern rules.
 */
export const MANIFEST_FILENAMES = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'Pipfile',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'go.mod',
  'Cargo.toml',
  'Gemfile',
  'composer.json',
  'pubspec.yaml',
  'Package.swift',
  'mix.exs',
  'project.clj',
  'deps.edn',
];

/** Common binary file extensions */
const BINARY_EXTENSIONS = new Set([
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tiff', 'tif', 'psd', 'ai',
  // Audio & Video
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'ogg', 'flac', 'm4a',
  // Archives & Compressed
  'zip', 'tar', 'gz', 'tgz', '7z', 'rar', 'bz2', 'xz', 'iso', 'dmg',
  // Executables & Libraries
  'exe', 'dll', 'so', 'dylib', 'bin', 'class', 'jar', 'war', 'ear',
  // Fonts
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  // Compiled bytecodes
  'pyc', 'pyo', 'pyd', 'wasm', 'elc',
  // Documents & DBs
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'db', 'sqlite', 'sqlite3',
]);

/** Sensitive file patterns — secrets, private keys, environment files */
const SENSITIVE_PATTERNS = [
  /^\.env(?:\..+)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /\.pkcs12$/i,
  /^id_rsa(?:\..+)?$/i,
  /^id_ed25519(?:\..+)?$/i,
  /^id_dsa(?:\..+)?$/i,
  /^id_ecdsa(?:\..+)?$/i,
  /^credentials.*\.json$/i,
  /^service[-_.]?account.*\.json$/i,
  /^secrets?(?:\..+)?\.(?:json|ya?ml|env|txt)$/i,
  /\.keystore$/i,
  /\.jks$/i,
];

// ─── Helper Functions ──────────────────────────────────────────────────────────

export function getFileExtension(filePath: string): string {
  const fileName = filePath.split('/').pop() || '';
  if (fileName.startsWith('.') && !fileName.slice(1).includes('.')) {
    return fileName.toLowerCase(); // e.g. .gitignore, .env
  }
  const parts = fileName.split('.');
  return parts.length > 1 ? (parts.pop() || '').toLowerCase() : '';
}

export function isManifestFile(filePath: string): boolean {
  const fileName = filePath.split('/').pop() || '';
  return MANIFEST_FILENAMES.includes(fileName);
}

export function isSensitivePath(filePath: string): boolean {
  const fileName = filePath.split('/').pop() || '';
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(fileName));
}

export function isBinaryPath(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return BINARY_EXTENSIONS.has(ext);
}

export function isExcludedDirectory(filePath: string): boolean {
  return EXCLUDED_DIR_PATTERNS.some(pattern => pattern.test(filePath));
}

export function isLockfile(filePath: string): boolean {
  const fileName = filePath.split('/').pop() || '';
  return LOCKFILE_PATTERNS.some(pattern => pattern.test(fileName));
}

// ─── Main Classification Function ─────────────────────────────────────────────

export interface FileClassification {
  status: FileStatus;
  skipReason: SkipReason | null;
  isBinary: boolean;
  isSensitive: boolean;
}

export function classifyFile(
  filePath: string,
  sizeBytes: number,
  limits: IngestionLimits = DEFAULT_INGESTION_LIMITS
): FileClassification {
  const fileName = filePath.split('/').pop() || '';

  // 1. Check for sensitive files FIRST — security critical
  if (isSensitivePath(filePath)) {
    return {
      status: 'skipped',
      skipReason: 'sensitive_file',
      isBinary: false,
      isSensitive: true,
    };
  }

  // 2. Check for excluded directory paths (vendor, build, cache)
  if (isExcludedDirectory(filePath)) {
    let skipReason: SkipReason = 'vendor_directory';
    if (/node_modules|vendor/i.test(filePath)) {
      skipReason = 'vendor_directory';
    } else if (/\.next|dist|build|out|target|bin|obj/i.test(filePath)) {
      skipReason = 'build_artifact';
    } else {
      skipReason = 'cache_directory';
    }

    return {
      status: 'skipped',
      skipReason,
      isBinary: false,
      isSensitive: false,
    };
  }

  // 3. Manifest files are prioritized and preserved
  if (isManifestFile(filePath)) {
    return {
      status: 'manifest_parsed',
      skipReason: null,
      isBinary: false,
      isSensitive: false,
    };
  }

  // 4. Lockfiles are skipped
  if (isLockfile(filePath)) {
    return {
      status: 'skipped',
      skipReason: 'lockfile',
      isBinary: false,
      isSensitive: false,
    };
  }

  // 5. Binary file detection
  if (isBinaryPath(filePath)) {
    return {
      status: 'skipped',
      skipReason: 'binary_file',
      isBinary: true,
      isSensitive: false,
    };
  }

  // 6. Single file size limit enforcement
  if (sizeBytes > limits.maxSingleFileBytes) {
    return {
      status: 'skipped',
      skipReason: 'file_too_large',
      isBinary: false,
      isSensitive: false,
    };
  }

  // 7. Retained for indexing
  return {
    status: 'indexed',
    skipReason: null,
    isBinary: false,
    isSensitive: false,
  };
}
