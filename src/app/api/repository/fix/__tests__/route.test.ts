import { describe, it, expect } from 'vitest';
import { POST } from '../route';
import { POST as POST_APPLY } from '../apply/route';
import { createMockRepoIndex, createMockRepoRef } from '@/lib/security/__tests__/testHelpers';

describe('POST /api/repository/fix & /api/repository/fix/apply API Routes', () => {
  const mockIndex = createMockRepoIndex({
    repository: createMockRepoRef({
      name: 'fix-test',
      owner: 'owner',
      fullName: 'owner/fix-test',
    }),
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
        content: 'const API_TOKEN = "ghp_123456789012345678901234567890123456";',
        sizeBytes: 60,
        extension: '.ts',
        sha: '1',
      },
    ],
  });

  it('validates request parameters and returns 400 when missing fields', async () => {
    const req = new Request('http://localhost:3000/api/repository/fix', {
      method: 'POST',
      body: JSON.stringify({ repositoryId: 'owner/fix-test' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Valid findingId');
  });

  it('generates a valid reviewable CodeFixProposal via POST /api/repository/fix', async () => {
    const req = new Request('http://localhost:3000/api/repository/fix', {
      method: 'POST',
      body: JSON.stringify({
        repositoryId: 'owner/fix-test',
        findingId: 'secret-ghp-1',
        category: 'security',
        filePath: 'src/config.ts',
        findingRule: 'RULE_SECRET_GITHUB_TOKEN',
        preloadedIndex: mockIndex,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.proposal).toBeDefined();
    expect(data.proposal.status).toBe('proposed');
    expect(data.proposal.unifiedDiff).toContain('--- a/src/config.ts');

    // Test apply route
    const applyReq = new Request('http://localhost:3000/api/repository/fix/apply', {
      method: 'POST',
      body: JSON.stringify({
        proposalId: data.proposal.id,
        repositoryId: 'owner/fix-test',
        commitSha: 'main',
        expectedDiffHash: data.proposal.diffHash,
        confirmedByUser: true,
        preloadedIndex: mockIndex,
      }),
    });

    const applyRes = await POST_APPLY(applyReq);
    expect(applyRes.status).toBe(200);
    const applyData = await applyRes.json();
    expect(applyData.success).toBe(true);
    expect(applyData.proposal.status).toBe('applied');
    expect(applyData.modifiedFiles[0].patchedContent).toContain('process.env.');
  });
});
