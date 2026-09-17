/**
 * Phase 7 — Patch Validation Engine
 *
 * Validates proposed code fixes against repository files, AST symbols,
 * in-memory diff consistency, and secret leakage prevention.
 */

import { RepositoryIndex } from '../repository/types';
import { isPlaceholderSecret } from '../security/redactor';
import { applyPatchInMemory, computeDiffHash, validateDiffConsistency } from './diffUtils';
import { isSafeRepositoryPath } from './fixContextBuilder';
import { CodeFixProposal } from './types';

export interface PatchValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProposalPatch(
  proposal: CodeFixProposal,
  repoIndex: RepositoryIndex
): PatchValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Verify safe target file path
  if (!isSafeRepositoryPath(proposal.targetFile)) {
    errors.push(`Target file '${proposal.targetFile}' violates repository path boundaries.`);
  }

  // 2. Verify file exists in repository index
  const fileNode = (repoIndex.files || []).find(f => f.path === proposal.targetFile);
  if (!fileNode) {
    errors.push(`Target file '${proposal.targetFile}' was not found in repository index.`);
  }

  // 3. Verify repository match
  const repoFullName = repoIndex.repository?.fullName || `${repoIndex.repository?.owner}/${repoIndex.repository?.name}`;
  if (proposal.repositoryId !== repoFullName && proposal.repositoryId !== repoIndex.repository?.name) {
    errors.push(`Proposal repository '${proposal.repositoryId}' does not match repository index '${repoFullName}'.`);
  }

  // 4. Verify commit match / stale commit check
  const currentBranchOrCommit = repoIndex.repository?.defaultBranch || 'main';
  if (proposal.commitSha && proposal.commitSha !== currentBranchOrCommit && proposal.commitSha !== 'main') {
    warnings.push(`Proposal commit SHA '${proposal.commitSha}' differs from current index '${currentBranchOrCommit}'.`);
  }

  // 5. Verify beforeCode exists in source content
  if (fileNode && fileNode.content) {
    const patchCheck = applyPatchInMemory(fileNode.content, proposal.beforeCode, proposal.afterCode);
    if (!patchCheck.success) {
      errors.push(patchCheck.error || 'Failed to apply proposed patch in memory against source file.');
    }
  } else if (!proposal.beforeCode) {
    errors.push('Proposed beforeCode snippet is empty.');
  }

  // 6. Verify diff consistency
  if (!validateDiffConsistency(proposal.beforeCode, proposal.afterCode, proposal.unifiedDiff)) {
    errors.push('Unified diff does not match the beforeCode and afterCode transformation.');
  }

  // 7. Verify diff hash
  const expectedHash = computeDiffHash(proposal.unifiedDiff);
  if (proposal.diffHash && proposal.diffHash !== expectedHash) {
    errors.push('Diff hash integrity mismatch.');
  }

  // 8. Verify no raw unmasked secrets in afterCode
  if (proposal.afterCode) {
    const rawKeyRegex = /\b(?:sk-(?:proj-|live-)?[a-zA-Z0-9_-]{20,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36})\b/g;
    let match: RegExpExecArray | null;
    while ((match = rawKeyRegex.exec(proposal.afterCode)) !== null) {
      if (!isPlaceholderSecret(match[0])) {
        errors.push(`Proposed fix appears to introduce a hardcoded credential: ${match[0].slice(0, 4)}••••`);
      }
    }
  }

  // 9. Minimal patch scope: verify only targetFile is declared in affectedFiles
  if (proposal.affectedFiles.length > 1) {
    warnings.push(`Proposal affects multiple files (${proposal.affectedFiles.join(', ')}). Phase 7 prefers atomic single-file patches.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
