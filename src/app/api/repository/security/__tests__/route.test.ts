/**
 * Tests for /api/repository/security and /api/security/analyze API Routes
 */

import { describe, it, expect } from 'vitest';
import { GET, POST } from '../route';
import { GET as analyzeGET, POST as analyzePOST } from '@/app/api/security/analyze/route';
import { createMockRepoIndex, createMockRepoRef } from '@/lib/security/__tests__/testHelpers';

describe('Security Intelligence API Routes (/api/repository/security & /api/security/analyze)', () => {
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

  it('POST /api/repository/security returns 400 when repositoryId is missing or empty', async () => {
    const req = new Request('http://localhost:3000/api/repository/security', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Valid repositoryId');
  });

  it('GET /api/repository/security returns 400 when fullName/repositoryId param is missing', async () => {
    const req = new Request('http://localhost:3000/api/repository/security', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Valid repository fullName');
  });

  it('POST /api/repository/security generates security report for preloaded repository index', async () => {
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

  it('POST /api/security/analyze generates security report with preloaded index alias', async () => {
    const req = new Request('http://localhost:3000/api/security/analyze', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'owner/security-test',
        preloadedIndex: mockIndex,
      }),
    });

    const res = await analyzePOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.report).toBeDefined();
    expect(data.report.summary.repositoryId).toBe('owner/security-test');
  });

  it('GET /api/security/analyze returns 400 when query parameter is missing', async () => {
    const req = new Request('http://localhost:3000/api/security/analyze', {
      method: 'GET',
    });

    const res = await analyzeGET(req);
    expect(res.status).toBe(400);
  });
});
