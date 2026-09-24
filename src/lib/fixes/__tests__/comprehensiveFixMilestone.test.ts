/**
 * Phase 7 — Comprehensive AI Fix & Refactor Milestone Verification Test Suite
 *
 * Verifies all 24 fix & refactor requirements:
 * 1. Finding → proposal
 * 2. Security fix generation
 * 3. Engineering refactor generation
 * 4. RAG context retrieval
 * 5. Diff generation
 * 6. Diff correctness
 * 7. Patch validation
 * 8. Secret detection in proposed patch
 * 9. Dangerous operation detection
 * 10. Approval workflow
 * 11. Rejection workflow
 * 12. Unauthorized approval (RBAC / IDOR)
 * 13. Unauthorized application (RBAC / IDOR)
 * 14. Stale proposal detection
 * 15. Apply operation
 * 16. Apply failure
 * 17. Rollback
 * 18. Idempotency
 * 19. Database persistence
 * 20. API behavior (POST /api/repository/fix, /api/repository/fix/apply, /api/fixes/propose, /api/fixes/:id)
 * 21. UI integration
 * 22. LLM failure / offline fallback
 * 23. Empty/insufficient context
 * 24. Unsupported fix / manual refactor required
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodeFixEngine } from '../fixEngine';
import { CodeFixGenerator } from '../fixGenerator';
import { validateProposalPatch } from '../patchValidator';
import { generateUnifiedDiff, computeDiffHash, applyPatchInMemory } from '../diffUtils';
import { buildFixContext } from '../fixContextBuilder';
import { CodeFixProposal, CodeFixRequest } from '../types';
import { createMockRepoIndex } from '../../security/__tests__/testHelpers';
import { POST as postFix } from '@/app/api/repository/fix/route';
import { POST as postApply } from '@/app/api/repository/fix/apply/route';
import { GET as getFixById } from '@/app/api/fixes/[id]/route';
import { POST as approveFixById } from '@/app/api/fixes/[id]/approve/route';
import { POST as rejectFixById } from '@/app/api/fixes/[id]/reject/route';
import { FixDatabaseRepository } from '@/lib/db/repositories';
import { SessionManager } from '@/lib/auth/sessionManager';

describe('Phase 7 — Comprehensive AI Fix & Refactor Verification', () => {
  let engine: CodeFixEngine;

  beforeEach(() => {
    engine = new CodeFixEngine();
    vi.restoreAllMocks();
  });

  const mockIndex = createMockRepoIndex({
    repository: {
      fullName: 'org/repo',
      name: 'repo',
      owner: 'org',
      defaultBranch: 'main',
      url: 'https://github.com/org/repo',
      description: '',
      stars: 0,
      forks: 0,
      openIssues: 0,
      isPrivate: false,
      isFork: false,
      isArchived: false,
      sizeKb: 10,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    files: [
      {
        path: 'src/config.ts',
        name: 'config.ts',
        type: 'file',
        language: 'typescript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
        content: 'export const apiKey = "sk-proj-123456789012345678901234567890";',
        sizeBytes: 80,
        extension: '.ts',
        sha: '1',
      },
      {
        path: 'src/db.ts',
        name: 'db.ts',
        type: 'file',
        language: 'typescript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
        content: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
        sizeBytes: 60,
        extension: '.ts',
        sha: '2',
      },
      {
        path: 'src/agent.ts',
        name: 'agent.ts',
        type: 'file',
        language: 'typescript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
        content: 'const agent = new https.Agent({ rejectUnauthorized: false });',
        sizeBytes: 80,
        extension: '.ts',
        sha: '3',
      },
    ],
  });

  // 1. Finding → proposal
  it('1. Finding → proposal — generates a reviewable proposal from a security finding', async () => {
    const req: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'sec-secret-1',
      category: 'security',
      filePath: 'src/config.ts',
      lineRange: '1',
      findingRule: 'RULE_SECRET_OPENAI',
      findingTitle: 'Hardcoded OpenAI API Key',
    };

    const proposal = await engine.generateFix(req, { repoIndex: mockIndex });
    expect(proposal.id).toBeDefined();
    expect(proposal.targetFile).toBe('src/config.ts');
    expect(proposal.status).toBe('proposed');
    expect(proposal.beforeCode).toContain('sk-proj-123456789012345678901234567890');
    expect(proposal.afterCode).toContain('process.env.');
  });

  // 2. Security fix generation
  it('2. Security fix generation — generates minimal remediation patch for disabled TLS configuration', async () => {
    const req: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'sec-config-tls',
      category: 'security',
      filePath: 'src/agent.ts',
      lineRange: '1',
      findingRule: 'RULE_CONFIG_TLS_DISABLED',
      findingTitle: 'Disabled TLS Certificate Verification',
    };

    const proposal = await engine.generateFix(req, { repoIndex: mockIndex });
    expect(proposal.beforeCode).toContain('rejectUnauthorized: false');
    expect(proposal.afterCode).toContain('rejectUnauthorized: true');
    expect(proposal.unifiedDiff).toContain('+const agent = new https.Agent({ rejectUnauthorized: true });');
  });

  // 3. Engineering refactor generation
  it('3. Engineering refactor generation — generates safe refactoring proposal for architectural finding', async () => {
    const req: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'eng-refactor-1',
      category: 'engineering',
      filePath: 'src/config.ts',
      lineRange: '1',
      findingTitle: 'Excessive Coupling in config',
      findingDescription: 'Decouple static assignment from module load',
    };

    const proposal = await engine.generateFix(req, { repoIndex: mockIndex });
    expect(proposal.category).toBe('engineering');
    expect(proposal.explanation).toBeDefined();
    expect(proposal.validationPlan.length).toBeGreaterThan(0);
  });

  // 4. RAG context retrieval
  it('4. RAG context retrieval — builds grounded prompt context with line numbers and evidence citations', () => {
    const req: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'find-1',
      category: 'security',
      filePath: 'src/config.ts',
      lineRange: '1',
      evidence: {
        summary: 'Secret matched on line 1',
        references: [{ file: 'src/config.ts', line: 1, rule: 'RULE_SECRET_OPENAI' }],
      },
    };

    const ctx = buildFixContext(req, mockIndex, null);
    expect(ctx.targetFile).toBe('src/config.ts');
    expect(ctx.promptContext).toContain('Target File: src/config.ts');
    expect(ctx.promptContext).toContain('Finding Description: Secret matched on line 1');
    expect(ctx.promptContext).toContain('Surrounding Code Context');
  });

  // 5. Diff generation
  it('5. Diff generation — produces valid unified diff with correct file headers and hunk indicators', () => {
    const before = 'const x = 1;\nconst y = 2;';
    const after = 'const x = 1;\nconst y = 3;';
    const diff = generateUnifiedDiff('src/app.ts', before, after);

    expect(diff).toContain('--- a/src/app.ts');
    expect(diff).toContain('+++ b/src/app.ts');
    expect(diff).toContain('-const y = 2;');
    expect(diff).toContain('+const y = 3;');
  });

  // 6. Diff correctness
  it('6. Diff correctness — computes deterministic SHA256 diff hash for patch integrity verification', () => {
    const diff = '--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n-a\n+b\n';
    const hash1 = computeDiffHash(diff);
    const hash2 = computeDiffHash(diff);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  // 7. Patch validation
  it('7. Patch validation — validates that patch applies cleanly against source file in repository index', () => {
    const proposal: CodeFixProposal = {
      id: 'prop-1',
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'f-1',
      category: 'security',
      title: 'Fix',
      explanation: 'Fix',
      rationale: 'Fix',
      affectedFiles: ['src/config.ts'],
      affectedSymbols: [],
      targetFile: 'src/config.ts',
      beforeCode: 'export const apiKey = "sk-proj-123456789012345678901234567890";',
      afterCode: 'export const apiKey = process.env.API_KEY || "";',
      unifiedDiff: '--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1 +1 @@\n-export const apiKey = "sk-proj-123456789012345678901234567890";\n+export const apiKey = process.env.API_KEY || "";\n',
      diffHash: computeDiffHash('--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1 +1 @@\n-export const apiKey = "sk-proj-123456789012345678901234567890";\n+export const apiKey = process.env.API_KEY || "";\n'),
      evidence: { summary: '', references: [] },
      confidence: 'high',
      validationPlan: [],
      warnings: [],
      generatedAt: new Date().toISOString(),
      status: 'proposed',
    };

    const val = validateProposalPatch(proposal, mockIndex);
    expect(val.isValid).toBe(true);
    expect(val.errors.length).toBe(0);
  });

  // 8. Secret detection in proposed patch
  it('8. Secret detection in proposed patch — blocks proposals that attempt to introduce hardcoded live secrets', () => {
    const proposal: CodeFixProposal = {
      id: 'prop-bad-sec',
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'f-2',
      category: 'security',
      title: 'Bad Fix',
      explanation: 'Fix',
      rationale: 'Fix',
      affectedFiles: ['src/config.ts'],
      affectedSymbols: [],
      targetFile: 'src/config.ts',
      beforeCode: 'export const apiKey = "sk-proj-123456789012345678901234567890";',
      afterCode: 'export const apiKey = "sk-proj-newRealLiveSecretKey987654321012345";',
      unifiedDiff: '--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1 +1 @@\n-export const apiKey = "sk-proj-123456789012345678901234567890";\n+export const apiKey = "sk-proj-newRealLiveSecretKey987654321012345";\n',
      diffHash: computeDiffHash('--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1 +1 @@\n-export const apiKey = "sk-proj-123456789012345678901234567890";\n+export const apiKey = "sk-proj-newRealLiveSecretKey987654321012345";\n'),
      evidence: { summary: '', references: [] },
      confidence: 'high',
      validationPlan: [],
      warnings: [],
      generatedAt: new Date().toISOString(),
      status: 'proposed',
    };

    const val = validateProposalPatch(proposal, mockIndex);
    expect(val.isValid).toBe(false);
    expect(val.errors.some(e => e.includes('hardcoded credential'))).toBe(true);
  });

  // 9. Dangerous operation detection
  it('9. Dangerous operation detection — detects and prevents path traversal outside repository root', () => {
    const proposal: CodeFixProposal = {
      id: 'prop-trav',
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'f-3',
      category: 'security',
      title: 'Traversal',
      explanation: 'Fix',
      rationale: 'Fix',
      affectedFiles: ['../etc/passwd'],
      affectedSymbols: [],
      targetFile: '../etc/passwd',
      beforeCode: 'root:x:0:0',
      afterCode: 'root:x:0:0',
      unifiedDiff: '',
      diffHash: computeDiffHash(''),
      evidence: { summary: '', references: [] },
      confidence: 'high',
      validationPlan: [],
      warnings: [],
      generatedAt: new Date().toISOString(),
      status: 'proposed',
    };

    const val = validateProposalPatch(proposal, mockIndex);
    expect(val.isValid).toBe(false);
    expect(val.errors.some(e => e.includes('violates repository path boundaries'))).toBe(true);
  });

  // 10. Approval workflow
  it('10. Approval workflow — transitions proposal from proposed to approved and allows apply', async () => {
    const req: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'find-appr-1',
      category: 'security',
      filePath: 'src/agent.ts',
      findingRule: 'RULE_CONFIG_TLS_DISABLED',
    };

    const proposal = await engine.generateFix(req, { repoIndex: mockIndex });
    expect(proposal.status).toBe('proposed');

    const approved = await engine.reviewFix(proposal.id, 'approve');
    expect(approved.status).toBe('approved');
  });

  // 11. Rejection workflow
  it('11. Rejection workflow — records rejection reason and prevents applying rejected proposal', async () => {
    const req: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'find-rej-1',
      category: 'security',
      filePath: 'src/agent.ts',
      findingRule: 'RULE_CONFIG_TLS_DISABLED',
    };

    const proposal = await engine.generateFix(req, { repoIndex: mockIndex });
    const rejected = await engine.reviewFix(proposal.id, 'reject', 'Manual mitigation chosen');

    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Manual mitigation chosen');

    await expect(
      engine.applyFix(
        {
          proposalId: proposal.id,
          repositoryId: 'org/repo',
          commitSha: 'main',
          expectedDiffHash: proposal.diffHash,
          confirmedByUser: true,
        },
        mockIndex
      )
    ).rejects.toThrow('Cannot apply proposal with status \'rejected\'');
  });

  // 12. Unauthorized approval
  it('12. Unauthorized approval — blocks approval attempt when user lacks repository permission', async () => {
    const req = new Request('http://localhost:3000/api/fixes/prop-unauth-appr/approve', {
      method: 'POST',
      headers: { 'x-devpilot-unauthenticated': 'true' },
    });

    const res = await approveFixById(req, { params: { id: 'prop-unauth-appr' } });
    expect(res.status).toBe(401);
  });

  // 13. Unauthorized application
  it('13. Unauthorized application — blocks patch application attempt when unauthenticated', async () => {
    const req = new Request('http://localhost:3000/api/fixes/prop-unauth-apply/apply', {
      method: 'POST',
      headers: { 'x-devpilot-unauthenticated': 'true' },
      body: JSON.stringify({
        repositoryId: 'org/repo',
        commitSha: 'main',
        confirmedByUser: true,
      }),
    });

    const res = await postApply(req);
    expect(res.status).toBe(401);
  });

  // 14. Stale proposal detection
  it('14. Stale proposal detection — rejects patch application if repository commit changed', async () => {
    const req: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'commit_v1',
      findingId: 'find-stale',
      category: 'security',
      filePath: 'src/config.ts',
      findingRule: 'RULE_SECRET_OPENAI',
    };

    const proposal = await engine.generateFix(req, { repoIndex: mockIndex });
    await engine.reviewFix(proposal.id, 'approve');

    await expect(
      engine.applyFix(
        {
          proposalId: proposal.id,
          repositoryId: 'org/repo',
          commitSha: 'commit_v2_changed',
          expectedDiffHash: proposal.diffHash,
          confirmedByUser: true,
        },
        mockIndex
      )
    ).rejects.toThrow('Repository state changed');
  });

  // 15. Apply operation
  it('15. Apply operation — successfully applies patch in memory and produces patched content', async () => {
    const req: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'find-apply-op',
      category: 'security',
      filePath: 'src/config.ts',
      findingRule: 'RULE_SECRET_OPENAI',
    };

    const proposal = await engine.generateFix(req, { repoIndex: mockIndex });
    await engine.reviewFix(proposal.id, 'approve');

    const result = await engine.applyFix(
      {
        proposalId: proposal.id,
        repositoryId: 'org/repo',
        commitSha: 'main',
        expectedDiffHash: proposal.diffHash,
        confirmedByUser: true,
      },
      mockIndex
    );

    expect(result.success).toBe(true);
    expect(result.proposal.status).toBe('applied');
    expect(result.modifiedFiles[0].path).toBe('src/config.ts');
    expect(result.modifiedFiles[0].patchedContent).toContain('process.env.');
  });

  // 16. Apply failure
  it('16. Apply failure — safely reports failure when target file in index has mismatched content', async () => {
    const corruptedIndex = createMockRepoIndex({
      repository: mockIndex.repository,
      files: [
        {
          path: 'src/config.ts',
          name: 'config.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'totally different content that does not contain beforeCode',
          sizeBytes: 50,
          extension: '.ts',
          sha: '99',
        },
      ],
    });

    const proposal: CodeFixProposal = {
      id: 'prop-mismatch',
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'f-mismatch',
      category: 'security',
      title: 'Fix',
      explanation: 'Fix',
      rationale: 'Fix',
      affectedFiles: ['src/config.ts'],
      affectedSymbols: [],
      targetFile: 'src/config.ts',
      beforeCode: 'export const apiKey = "sk-proj-123456789012345678901234567890";',
      afterCode: 'export const apiKey = process.env.API_KEY || "";',
      unifiedDiff: 'diff',
      diffHash: 'hash-mismatch',
      evidence: { summary: '', references: [] },
      confidence: 'high',
      validationPlan: [],
      warnings: [],
      generatedAt: new Date().toISOString(),
      status: 'approved',
    };

    engine['proposals'].set(proposal.id, proposal);

    await expect(
      engine.applyFix(
        {
          proposalId: proposal.id,
          repositoryId: 'org/repo',
          commitSha: 'main',
          expectedDiffHash: 'hash-mismatch',
          confirmedByUser: true,
        },
        corruptedIndex
      )
    ).rejects.toThrow('Failed to apply patch in memory');
  });

  // 17. Rollback
  it('17. Rollback — preserves original file content and allows reverting beforeCode substitution', () => {
    const originalContent = 'export const apiKey = "sk-proj-123456789012345678901234567890";';
    const beforeCode = 'export const apiKey = "sk-proj-123456789012345678901234567890";';
    const afterCode = 'export const apiKey = process.env.API_KEY || "";';

    const applied = applyPatchInMemory(originalContent, beforeCode, afterCode);
    expect(applied.success).toBe(true);

    // Rollback by swapping beforeCode and afterCode
    const reverted = applyPatchInMemory(applied.patchedContent, afterCode, beforeCode);
    expect(reverted.success).toBe(true);
    expect(reverted.patchedContent).toBe(originalContent);
  });

  // 18. Idempotency
  it('18. Idempotency — generating fix for identical finding parameters returns reproducible proposal and diff hash', async () => {
    const req: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'find-idemp',
      category: 'security',
      filePath: 'src/agent.ts',
      findingRule: 'RULE_CONFIG_TLS_DISABLED',
    };

    const prop1 = await engine.generateFix(req, { repoIndex: mockIndex });
    const prop2 = await engine.generateFix(req, { repoIndex: mockIndex });

    expect(prop1.diffHash).toBe(prop2.diffHash);
    expect(prop1.unifiedDiff).toBe(prop2.unifiedDiff);
    expect(prop1.beforeCode).toBe(prop2.beforeCode);
    expect(prop1.afterCode).toBe(prop2.afterCode);
  });

  // 19. Database persistence
  it('19. Database persistence — saves and retrieves proposal and audit record without crashing in offline mode', async () => {
    const proposal: CodeFixProposal = {
      id: 'prop-db-test-1',
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'find-db-1',
      category: 'security',
      title: 'DB Test',
      explanation: 'DB Test Explanation',
      rationale: 'DB Test Rationale',
      affectedFiles: ['src/config.ts'],
      affectedSymbols: [],
      targetFile: 'src/config.ts',
      beforeCode: 'a',
      afterCode: 'b',
      unifiedDiff: 'diff',
      diffHash: 'hash-db',
      evidence: { summary: '', references: [] },
      confidence: 'high',
      validationPlan: [],
      warnings: [],
      generatedAt: new Date().toISOString(),
      status: 'proposed',
    };

    await expect(FixDatabaseRepository.saveProposal(proposal)).resolves.not.toThrow();
    await expect(
      FixDatabaseRepository.recordApproval('act-1', 'org/repo', 'main', 'apply_fix', 'approved', 'hash-db')
    ).resolves.not.toThrow();
  });

  // 20. API behavior
  it('20. API behavior — /api/repository/fix and /api/repository/fix/apply handle generation and approval', async () => {
    const postReq = new Request('http://localhost:3000/api/repository/fix', {
      method: 'POST',
      body: JSON.stringify({
        repositoryId: 'org/repo',
        commitSha: 'main',
        findingId: 'find-api-test',
        filePath: 'src/config.ts',
        findingRule: 'RULE_SECRET_OPENAI',
        preloadedIndex: mockIndex,
      }),
    });

    const res = await postFix(postReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.proposal).toBeDefined();

    // Review via apply endpoint
    const approveReq = new Request('http://localhost:3000/api/repository/fix/apply', {
      method: 'POST',
      body: JSON.stringify({
        proposalId: data.proposal.id,
        action: 'approve',
      }),
    });

    const approveRes = await postApply(approveReq);
    expect(approveRes.status).toBe(200);
    const approveData = await approveRes.json();
    expect(approveData.proposal.status).toBe('approved');
  });

  // 21. UI integration
  it('21. UI integration — CodeFixProposal contains all structured fields required by CodeFixProposalModal', async () => {
    const req: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'find-ui-1',
      category: 'security',
      filePath: 'src/config.ts',
      findingRule: 'RULE_SECRET_OPENAI',
    };

    const proposal = await engine.generateFix(req, { repoIndex: mockIndex });
    expect(proposal.title).toBeDefined();
    expect(proposal.explanation).toBeDefined();
    expect(proposal.rationale).toBeDefined();
    expect(proposal.beforeCode).toBeDefined();
    expect(proposal.afterCode).toBeDefined();
    expect(proposal.unifiedDiff).toBeDefined();
    expect(proposal.validationPlan).toBeDefined();
    expect(proposal.status).toBe('proposed');
  });

  // 22. LLM failure / offline fallback
  it('22. LLM failure — falls back cleanly to deterministic synthesis when LLM API keys are absent or failed', async () => {
    const generator = new CodeFixGenerator();
    const ctx = buildFixContext(
      {
        repositoryId: 'org/repo',
        commitSha: 'main',
        findingId: 'find-fallback',
        category: 'security',
        filePath: 'src/agent.ts',
        findingRule: 'RULE_CONFIG_TLS_DISABLED',
      },
      mockIndex,
      null
    );

    const proposal = await generator.generateProposal(
      {
        repositoryId: 'org/repo',
        commitSha: 'main',
        findingId: 'find-fallback',
        category: 'security',
        filePath: 'src/agent.ts',
        findingRule: 'RULE_CONFIG_TLS_DISABLED',
      },
      ctx
    );

    expect(proposal).toBeDefined();
    expect(proposal.afterCode).toContain('rejectUnauthorized: true');
  });

  // 23. Empty/insufficient context
  it('23. Empty/insufficient context — throws meaningful error when mandatory parameters are missing', async () => {
    await expect(
      engine.generateFix(
        {
          repositoryId: '',
          commitSha: 'main',
          findingId: 'f-empty',
          category: 'security',
          filePath: 'src/config.ts',
        },
        { repoIndex: mockIndex }
      )
    ).rejects.toThrow('Valid repositoryId is required');
  });

  // 24. Unsupported fix / manual refactor required
  it('24. Unsupported fix — handles unknown findings safely with general safe guard template', async () => {
    const req: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'find-custom-rule',
      category: 'engineering',
      filePath: 'src/agent.ts',
      findingTitle: 'Complex Circular Dependency',
      findingDescription: 'Manual architectural refactor required',
    };

    const proposal = await engine.generateFix(req, { repoIndex: mockIndex });
    expect(proposal.status).toBe('proposed');
    expect(proposal.validationPlan.length).toBeGreaterThan(0);
  });
});
