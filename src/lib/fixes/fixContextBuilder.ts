/**
 * Phase 7 — Fix Context Builder & Evidence Grounding
 *
 * Gathers target file content, surrounding code lines, symbol definitions,
 * and finding evidence, while ensuring all secret material is defensively redacted
 * and untrusted repository contents are properly sandboxed.
 */

import { CodebaseIntelligence } from '../intelligence/types';
import { RepositoryIndex } from '../repository/types';
import { maskSecret, maskTextSecrets } from '../security/redactor';
import { CodeFixEvidence, CodeFixRequest } from './types';

export interface BuiltFixContext {
  targetFile: string;
  fileContent: string;
  targetSymbol?: string;
  startLine?: number;
  endLine?: number;
  surroundingCode: string;
  relevantImports: string[];
  findingSummary: string;
  findingRule?: string;
  findingRecommendation?: string;
  redactedEvidence: CodeFixEvidence;
  promptContext: string;
}

/**
 * Validates that a file path is safe and stays within repository boundaries
 */
export function isSafeRepositoryPath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false;
  const normalized = filePath.replace(/\\/g, '/').trim();

  // Block path traversal and absolute paths
  if (
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.includes('\0')
  ) {
    return false;
  }

  return true;
}

/**
 * Builds grounded context for generating a code fix proposal
 */
export function buildFixContext(
  request: CodeFixRequest,
  repoIndex: RepositoryIndex,
  intelligence?: CodebaseIntelligence | null
): BuiltFixContext {
  const targetFile = request.filePath || '';

  if (!isSafeRepositoryPath(targetFile)) {
    throw new Error(`Target file path '${targetFile}' is invalid or violates repository boundaries.`);
  }

  // Find file in repository index
  const fileNode = (repoIndex.files || []).find(f => f.path === targetFile);
  if (!fileNode) {
    throw new Error(`Target file '${targetFile}' does not exist in repository '${request.repositoryId}'.`);
  }

  const fileContent = fileNode.content || '';
  const lines = fileContent.split('\n');

  // Determine line range
  let startLine = 1;
  let endLine = Math.min(lines.length, 50);

  if (request.lineRange) {
    const parts = request.lineRange.split(/[-–]/).map(p => parseInt(p.trim(), 10));
    if (parts[0] && !isNaN(parts[0])) {
      startLine = Math.max(1, parts[0]);
    }
    if (parts[1] && !isNaN(parts[1])) {
      endLine = Math.min(lines.length, parts[1]);
    } else {
      endLine = Math.min(lines.length, startLine + 10);
    }
  }

  // Extract surrounding context (e.g. 5 lines before and after)
  const windowStart = Math.max(1, startLine - 5);
  const windowEnd = Math.min(lines.length, endLine + 5);
  const surroundingCode = lines
    .slice(windowStart - 1, windowEnd)
    .map((line, idx) => `${windowStart + idx}: ${line}`)
    .join('\n');

  // Extract relevant imports from Phase 3 intelligence or source
  let relevantImports: string[] = [];
  if (intelligence) {
    const fileIntel = intelligence.files.find(f => f.filePath === targetFile);
    if (fileIntel) {
      relevantImports = fileIntel.imports.map(i => i.importPath);
    }
  }

  if (relevantImports.length === 0) {
    relevantImports = lines
      .filter(l => l.trim().startsWith('import ') || l.trim().startsWith('const ') && l.includes('require('))
      .slice(0, 10);
  }

  // Build defensively redacted evidence
  const rawEvidenceSummary = request.evidence?.summary || request.findingDescription || '';
  const sanitizedEvidenceSummary = maskTextSecrets(rawEvidenceSummary);
  const sanitizedRedactedContent = request.evidence?.redactedContent
    ? maskTextSecrets(request.evidence.redactedContent)
    : undefined;

  const redactedEvidence: CodeFixEvidence = {
    summary: sanitizedEvidenceSummary,
    references: request.evidence?.references || [
      {
        file: targetFile,
        line: startLine,
        rule: request.findingRule,
      },
    ],
    redactedContent: sanitizedRedactedContent,
  };

  const sanitizedFindingDesc = maskTextSecrets(request.findingDescription || sanitizedEvidenceSummary);
  const sanitizedSurrounding = maskTextSecrets(surroundingCode);

  const promptContext = [
    `Target Repository: ${request.repositoryId} (Commit: ${request.commitSha})`,
    `Target File: ${targetFile}`,
    request.symbol ? `Target Symbol: ${request.symbol}` : null,
    `Finding Rule: ${request.findingRule || 'N/A'}`,
    `Finding Description: ${sanitizedFindingDesc}`,
    request.findingRecommendation ? `Recommendation: ${maskTextSecrets(request.findingRecommendation)}` : null,
    '',
    `Surrounding Code Context (Lines ${windowStart}-${windowEnd}):`,
    '```',
    sanitizedSurrounding,
    '```',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    targetFile,
    fileContent,
    targetSymbol: request.symbol,
    startLine,
    endLine,
    surroundingCode,
    relevantImports,
    findingSummary: sanitizedEvidenceSummary,
    findingRule: request.findingRule,
    findingRecommendation: request.findingRecommendation,
    redactedEvidence,
    promptContext,
  };
}
