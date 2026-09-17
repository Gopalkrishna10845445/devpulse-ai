import { describe, it, expect } from 'vitest';
import { POST } from '../route';
import { createMockRepoIndex, createMockRepoRef } from '@/lib/security/__tests__/testHelpers';

describe('POST /api/repository/security API Route', () => {
  it('returns 400 when repositoryId is missing or empty', async () => {
    const req = new Request('http://localhost:3000/api/repository/security', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Valid repositoryId');
  });

  it('generates security report for preloaded repository index', async () => {
    const mockIndex = createMockRepoIndex({
      repository: createMockRepoRef({
        name: 'security-test',
        owner: 'owner',
        fullName: 'owner/security-test',
      }),
      files: [
        {
          path: 'src/main.ts',
          name: 'main.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'export const status = "secure";',
          sizeBytes: 40,
          extension: '.ts',
          sha: '1',
        },
      ],
    });

    const req = new Request('http://localhost:3000/api/repository/security', {
      method: 'POST',
      body: JSON.stringify({
        repositoryId: 'owner/security-test',
        preloadedIndex: mockIndex,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.report).toBeDefined();
    expect(data.report.repository.fullName).toBe('owner/security-test');
    expect(data.report.summary.overallStatus).toBe('secure');
  });
});
