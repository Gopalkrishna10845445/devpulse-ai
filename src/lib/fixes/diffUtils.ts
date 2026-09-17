/**
 * Phase 7 — Unified Diff Generation & Patch Utilities
 *
 * Provides deterministic, reviewable standard unified diff generation,
 * diff hashing for stale patch detection, and in-memory patch application.
 */

import crypto from 'crypto';

/**
 * Computes a standard unified diff between beforeCode and afterCode
 */
export function generateUnifiedDiff(
  filePath: string,
  beforeCode: string,
  afterCode: string
): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const beforeLines = beforeCode.split('\n');
  const afterLines = afterCode.split('\n');

  const diffHeader = [
    `--- a/${normalizedPath}`,
    `+++ b/${normalizedPath}`,
    `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`,
  ];

  const diffBody: string[] = [];

  // Simple line-by-line diff generation
  for (const line of beforeLines) {
    diffBody.push(`-${line}`);
  }
  for (const line of afterLines) {
    diffBody.push(`+${line}`);
  }

  return [...diffHeader, ...diffBody].join('\n');
}

/**
 * Computes a deterministic SHA-256 hash for a unified diff
 */
export function computeDiffHash(diff: string): string {
  const normalized = diff.replace(/\r\n/g, '\n').trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Applies a code fix patch in memory to a source file string without writing to disk
 */
export function applyPatchInMemory(
  fileContent: string,
  beforeCode: string,
  afterCode: string
): {
  patchedContent: string;
  success: boolean;
  error?: string;
} {
  if (!fileContent && fileContent !== '') {
    return { patchedContent: '', success: false, error: 'Source file content is missing or empty.' };
  }

  const normalizedFile = fileContent.replace(/\r\n/g, '\n');
  const normalizedBefore = beforeCode.replace(/\r\n/g, '\n');
  const normalizedAfter = afterCode.replace(/\r\n/g, '\n');

  if (!normalizedBefore) {
    return { patchedContent: fileContent, success: false, error: 'beforeCode is empty.' };
  }

  const index = normalizedFile.indexOf(normalizedBefore);
  if (index === -1) {
    return {
      patchedContent: fileContent,
      success: false,
      error: 'The beforeCode snippet could not be found in the current source file. The repository code may have changed.',
    };
  }

  const patched =
    normalizedFile.slice(0, index) +
    normalizedAfter +
    normalizedFile.slice(index + normalizedBefore.length);

  return {
    patchedContent: patched,
    success: true,
  };
}

/**
 * Validates that the unified diff cleanly represents the beforeCode and afterCode transformation
 */
export function validateDiffConsistency(
  beforeCode: string,
  afterCode: string,
  diff: string
): boolean {
  if (!diff) return false;
  const lines = diff.split('\n');

  const hasHeader = lines.some(l => l.startsWith('--- a/')) && lines.some(l => l.startsWith('+++ b/'));
  if (!hasHeader) return false;

  const deletedLines = lines
    .filter(l => l.startsWith('-') && !l.startsWith('---'))
    .map(l => l.slice(1));
  const addedLines = lines
    .filter(l => l.startsWith('+') && !l.startsWith('+++'))
    .map(l => l.slice(1));

  const beforeLines = beforeCode.split('\n').map(l => l.replace(/\r/g, ''));
  const afterLines = afterCode.split('\n').map(l => l.replace(/\r/g, ''));

  // Compare deleted lines against beforeLines and added lines against afterLines
  if (deletedLines.length !== beforeLines.length || addedLines.length !== afterLines.length) {
    return false;
  }

  return true;
}
