/**
 * Tests for GET & POST /api/engineering/analyze and /api/repository/engineering
 */

import { describe, it, expect } from 'vitest';
import { GET, POST } from '../analyze/route';
import { GET as repoGET, POST as repoPOST } from '../../repository/engineering/route';
import { createMockRepoIndex, createMockRepoRef } from '@/lib/security/__tests__/testHelpers';

describe('/api/engineering/analyze & /api/repository/engineering API Routes', () => {
  const mockIndex = createMockRepoIndex({
    repository: createMockRepoRef({
      name: 'engineering-test',
      owner: 'owner',
      fullName: 'owner/engineering-test',
    }),
    files: [
      {
        path: 'src/app.ts',
        name: 'app.ts',
        type: 'file',
        language: 'typescript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
        content: 'export const app = () => {};',
        sizeBytes: 100,
        extension: '.ts',
        sha: '1',
      },
      {
        path: 'README.md',
        name: 'README.md',
        type: 'file',
        language: 'markdown',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
        content: '# Test App\nDocumentation.',
        sizeBytes: 80,
        extension: '.md',
        sha: '2',
      },
    ],
  });

  it('GET /api/engineering/analyze returns 400 when fullName is missing', async () => {
    const req = new Request('http://localhost:3000/api/engineering/analyze', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Valid repository fullName');
  });

  it('POST /api/engineering/analyze returns 400 when fullName/repositoryId is missing', async () => {
    const req = new Request('http://localhost:3000/api/engineering/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Valid repository');
  });

  it('POST /api/engineering/analyze generates engineering report with preloaded index', async () => {
    const req = new Request('http://localhost:3000/api/engineering/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'owner/engineering-test',
        preloadedIndex: mockIndex,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.report).toBeDefined();
    expect(data.report.repository.fullName).toBe('owner/engineering-test');
    expect(data.report.summary.overallStatus).toBeDefined();
  });

  it('GET /api/repository/engineering returns 400 when repositoryId is missing', async () => {
    const req = new Request('http://localhost:3000/api/repository/engineering', {
      method: 'GET',
    });

    const res = await repoGET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Valid repositoryId');
  });

  it('POST /api/repository/engineering generates engineering report with preloaded index', async () => {
    const req = new Request('http://localhost:3000/api/repository/engineering', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryId: 'owner/engineering-test',
        preloadedIndex: mockIndex,
      }),
    });

    const res = await repoPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.report).toBeDefined();
    expect(data.report.repository.fullName).toBe('owner/engineering-test');
  });
});
