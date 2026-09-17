import { describe, it, expect, beforeEach } from 'vitest';
import { createMockRepoIndex } from '../../security/__tests__/testHelpers';
import { CodeFixEngine } from '../fixEngine';
import { CodeFixRequest } from '../types';

describe('Phase 7: CodeFixEngine Proposal Lifecycle & In-Memory Patching', () => {
  let engine: CodeFixEngine;

  beforeEach(() => {
    engine = new CodeFixEngine();
  });

  const repoIndex = createMockRepoIndex({
    files: [
      {
        path: 'src/auth.ts',
        name: 'auth.ts',
        type: 'file',
        language: 'typescript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
        content: 'const secret = "ghp_111111111111111111111111111111111111";',
        sizeBytes: 60,
        extension: '.ts',
        sha: '1',
      },
    ],
  });

  const request: CodeFixRequest = {
    repositoryId: 'org/repo',
    commitSha: 'main',
    findingId: 'find-ghp-1',
    category: 'security',
    filePath: 'src/auth.ts',
    lineRange: '1',
    findingRule: 'RULE_SECRET_GITHUB_TOKEN',
  };

  it('generates, reviews (approves), and applies a code fix proposal in memory', async () => {
    // 1. Generate Fix
    const proposal = await engine.generateFix(request, { repoIndex });
    expect(proposal.status).toBe('proposed');
    expect(proposal.targetFile).toBe('src/auth.ts');

    // 2. Review (Approve)
    const approved = await engine.reviewFix(proposal.id, 'approve');
    expect(approved.status).toBe('approved');

    // 3. Apply In-Memory
    const applyResult = await engine.applyFix(
      {
        proposalId: proposal.id,
        repositoryId: 'org/repo',
        commitSha: 'main',
        expectedDiffHash: proposal.diffHash,
        confirmedByUser: true,
      },
      repoIndex
    );

    expect(applyResult.success).toBe(true);
    expect(applyResult.proposal.status).toBe('applied');
    expect(applyResult.modifiedFiles.length).toBe(1);
    expect(applyResult.modifiedFiles[0].patchedContent).toContain('process.env.');
    expect(applyResult.modifiedFiles[0].patchedContent).not.toContain('ghp_111111111111111111111111111111111111');
  });

  it('handles review rejection flow and saves rejection reason', async () => {
    const proposal = await engine.generateFix(request, { repoIndex });
    const rejected = await engine.reviewFix(proposal.id, 'reject', 'Prefer manual credential rotation');

    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Prefer manual credential rotation');

    // Applying a rejected proposal must throw error
    await expect(
      engine.applyFix(
        {
          proposalId: proposal.id,
          repositoryId: 'org/repo',
          commitSha: 'main',
          expectedDiffHash: proposal.diffHash,
          confirmedByUser: true,
        },
        repoIndex
      )
    ).rejects.toThrow('Cannot apply proposal with status \'rejected\'');
  });

  it('rejects patch application without explicit user confirmation', async () => {
    const proposal = await engine.generateFix(request, { repoIndex });

    await expect(
      engine.applyFix(
        {
          proposalId: proposal.id,
          repositoryId: 'org/repo',
          commitSha: 'main',
          expectedDiffHash: proposal.diffHash,
          confirmedByUser: false,
        },
        repoIndex
      )
    ).rejects.toThrow('User confirmation is required');
  });

  it('detects stale commit and refuses to apply patch to different commit', async () => {
    const proposal = await engine.generateFix(request, { repoIndex });

    await expect(
      engine.applyFix(
        {
          proposalId: proposal.id,
          repositoryId: 'org/repo',
          commitSha: 'old-stale-sha-123',
          expectedDiffHash: proposal.diffHash,
          confirmedByUser: true,
        },
        repoIndex
      )
    ).rejects.toThrow('Repository state changed');
  });
});
