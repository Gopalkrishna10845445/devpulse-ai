import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { RepositoryIndex } from '@/lib/repository/types';

// Mock auth modules
vi.mock('@/lib/auth/accessControl', () => ({
  requireAuth: vi.fn(async () => ({
    id: 'usr_test123',
    githubLogin: 'testuser',
    role: 'MEMBER',
  })),
  authorizeRepositoryAccess: vi.fn(async (_user, repoId) => {
    if (repoId && repoId.includes('forbidden-private-repo')) {
      return { authorized: false, reason: 'Repository access forbidden.' };
    }
    return { authorized: true };
  }),
  createAuthErrorResponse: vi.fn((err) => ({
    status: err.statusCode || 401,
    json: async () => ({ error: err.message }),
  })),
}));

// Mock repositories persistence
vi.mock('@/lib/db/repositories', () => ({
  ReportDatabaseRepository: {
    getCodebaseIntelligence: vi.fn(async (repoId) => {
      if (repoId === 'cached/repo') {
        return {
          projectType: 'Full-Stack Web Application (Next.js)',
          repository: { fullName: 'cached/repo' },
          summary: { overview: 'Cached repository overview' },
        };
      }
      return null;
    }),
    saveCodebaseIntelligence: vi.fn(async () => {}),
  },
}));

const mockIndex: RepositoryIndex = {
  repository: {
    owner: 'Gopalkrishna10845445',
    name: 'devpulse-ai',
    fullName: 'Gopalkrishna10845445/devpulse-ai',
    defaultBranch: 'main',
    url: 'https://github.com/Gopalkrishna10845445/devpulse-ai',
    description: 'DevPulse platform',
    stars: 5,
    forks: 1,
    openIssues: 0,
    isPrivate: false,
    isFork: false,
    isArchived: false,
    sizeKb: 1000,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-10',
  },
  ingestion: {
    status: 'complete',
    isComplete: true,
    totalFilesCounted: 2,
    indexedFilesCount: 2,
    skippedFilesCount: 0,
    directoryCount: 2,
    totalBytes: 2000,
    indexedBytes: 2000,
    treeTruncated: false,
    durationMs: 50,
    apiRequestsCount: 1,
    rateLimited: false,
  },
  files: [
    {
      path: 'src/app/page.tsx',
      name: 'page.tsx',
      type: 'file',
      sizeBytes: 1000,
      extension: 'tsx',
      language: 'TypeScript',
      isBinary: false,
      isSensitive: false,
      status: 'indexed',
      skipReason: null,
    },
    {
      path: 'src/app/api/codebase/route.ts',
      name: 'route.ts',
      type: 'file',
      sizeBytes: 1000,
      extension: 'ts',
      language: 'TypeScript',
      isBinary: false,
      isSensitive: false,
      status: 'indexed',
      skipReason: null,
    },
  ],
  directories: [],
  languages: [{ name: 'TypeScript', fileCount: 2, bytes: 2000, percentage: 100 }],
  frameworks: [{ name: 'Next.js', category: 'fullstack', confidence: 'high', evidence: ['package.json: next'] }],
  dependencies: [{ name: 'next', manifestPath: 'package.json', ecosystem: 'npm', isDev: false }],
  manifests: [],
  modules: [{ name: 'app', path: 'src/app', fileCount: 2, totalBytes: 2000, detectedRole: 'app_router', description: 'App', primaryLanguage: 'TypeScript' }],
  skippedFiles: [],
  indexedAt: new Date().toISOString(),
};

describe('Codebase Intelligence API Routes (/api/codebase/analyze)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/codebase/analyze with pre-ingested index returns valid intelligence response', async () => {
    const req = new Request('http://localhost:3000/api/codebase/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: mockIndex }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.intelligence).toBeDefined();
    expect(data.intelligence.projectType).toBe('Full-Stack Web Application (Next.js)');
    expect(data.intelligence.metrics.totalFiles).toBe(2);

    // Verify no secret leakage
    const stringified = JSON.stringify(data);
    expect(stringified).not.toContain('ghp_');
    expect(stringified).not.toContain('postgres://');
    expect(stringified).not.toContain('redis://');
  });

  it('POST /api/codebase/analyze with missing repository coordinates returns 400', async () => {
    const req = new Request('http://localhost:3000/api/codebase/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INVALID_REPOSITORY');
  });

  it('POST /api/codebase/analyze with forbidden repository returns 403', async () => {
    const req = new Request('http://localhost:3000/api/codebase/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'forbidden-private-repo/secret-project' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/codebase/analyze retrieves cached intelligence if available', async () => {
    const req = new Request('http://localhost:3000/api/codebase/analyze?fullName=cached/repo', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.source).toBe('database');
    expect(data.intelligence.repository.fullName).toBe('cached/repo');
  });

  it('GET /api/codebase/analyze without repository parameters returns 400', async () => {
    const req = new Request('http://localhost:3000/api/codebase/analyze', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INVALID_REPOSITORY');
  });
});
