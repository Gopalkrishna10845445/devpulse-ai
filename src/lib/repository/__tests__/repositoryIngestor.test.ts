import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseRepositoryCoordinates,
  ingestRepository,
  IngestionError,
} from '../repositoryIngestor';
import { IngestionLimits } from '../types';

describe('parseRepositoryCoordinates', () => {
  it('parses separate owner and repository', () => {
    const coords = parseRepositoryCoordinates({
      owner: 'facebook',
      repository: 'react',
    });
    expect(coords.owner).toBe('facebook');
    expect(coords.repo).toBe('react');
  });

  it('parses fullName', () => {
    const coords = parseRepositoryCoordinates({
      fullName: 'vercel/next.js',
    });
    expect(coords.owner).toBe('vercel');
    expect(coords.repo).toBe('next.js');
  });

  it('parses full GitHub URL', () => {
    const coords = parseRepositoryCoordinates({
      url: 'https://github.com/Gopalkrishna10845445/devpulse-ai.git',
    });
    expect(coords.owner).toBe('Gopalkrishna10845445');
    expect(coords.repo).toBe('devpulse-ai');
  });

  it('throws IngestionError on invalid input', () => {
    expect(() => parseRepositoryCoordinates({})).toThrowError(IngestionError);
  });
});

describe('ingestRepository with mocked GitHub API', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('successfully ingests repository and extracts structure, languages, frameworks, manifests', async () => {
    const mockRepoMeta = {
      name: 'devpulse-ai',
      full_name: 'Gopalkrishna10845445/devpulse-ai',
      owner: { login: 'Gopalkrishna10845445' },
      default_branch: 'main',
      html_url: 'https://github.com/Gopalkrishna10845445/devpulse-ai',
      description: 'Engineering profile evaluator',
      stargazers_count: 10,
      forks_count: 2,
      open_issues_count: 0,
      private: false,
      fork: false,
      archived: false,
      size: 1500,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z',
    };

    const mockTree = {
      truncated: false,
      tree: [
        { path: 'package.json', type: 'blob', size: 500, sha: 'sha1' },
        { path: 'next.config.js', type: 'blob', size: 300, sha: 'sha2' },
        { path: 'src/app/page.tsx', type: 'blob', size: 2000, sha: 'sha3' },
        { path: 'src/components/Sidebar.tsx', type: 'blob', size: 4000, sha: 'sha4' },
        { path: 'node_modules/foo/index.js', type: 'blob', size: 1000, sha: 'sha5' },
        { path: '.env.local', type: 'blob', size: 100, sha: 'sha6' },
      ],
    };

    const mockPackageJson = JSON.stringify({
      dependencies: {
        next: '^14.2.0',
        react: '^18.3.0',
      },
      devDependencies: {
        typescript: '^5.6.0',
        vitest: '^2.1.0',
      },
    });

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/repos/Gopalkrishna10845445/devpulse-ai/git/trees')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve(mockTree),
        });
      }
      if (url.includes('/repos/Gopalkrishna10845445/devpulse-ai/contents/package.json')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({
            encoding: 'base64',
            content: Buffer.from(mockPackageJson).toString('base64'),
          }),
        });
      }
      if (url.includes('/repos/Gopalkrishna10845445/devpulse-ai')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve(mockRepoMeta),
        });
      }
      return Promise.resolve({ status: 404, ok: false });
    });

    vi.stubGlobal('fetch', mockFetch);

    const index = await ingestRepository({
      owner: 'Gopalkrishna10845445',
      repository: 'devpulse-ai',
    });

    expect(index.repository.name).toBe('devpulse-ai');
    expect(index.ingestion.status).toBe('complete');
    expect(index.ingestion.isComplete).toBe(true);
    expect(index.ingestion.totalFilesCounted).toBe(6);

    // Filtered vendor & sensitive
    const envFile = index.files.find(f => f.path === '.env.local')!;
    expect(envFile.status).toBe('skipped');
    expect(envFile.skipReason).toBe('sensitive_file');

    const nodeModuleFile = index.files.find(f => f.path === 'node_modules/foo/index.js')!;
    expect(nodeModuleFile.status).toBe('skipped');
    expect(nodeModuleFile.skipReason).toBe('vendor_directory');

    // Languages detected
    expect(index.languages.map(l => l.name)).toContain('TypeScript');
    expect(index.languages.map(l => l.name)).toContain('JavaScript');

    // Frameworks detected
    expect(index.frameworks.map(f => f.name)).toContain('Next.js');
    expect(index.frameworks.map(f => f.name)).toContain('React');
    expect(index.frameworks.map(f => f.name)).toContain('Vitest');

    // Manifests parsed
    expect(index.manifests).toHaveLength(1);
    expect(index.manifests[0].path).toBe('package.json');
    expect(index.dependencies.map(d => d.name)).toContain('next');
  });

  it('handles truncated GitHub trees gracefully', async () => {
    const mockRepoMeta = {
      name: 'large-repo',
      owner: { login: 'octocat' },
      default_branch: 'main',
    };

    const mockTree = {
      truncated: true,
      tree: [{ path: 'main.py', type: 'blob', size: 500 }],
    };

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/trees/')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve(mockTree),
        });
      }
      return Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve(mockRepoMeta),
      });
    }));

    const index = await ingestRepository({
      owner: 'octocat',
      repository: 'large-repo',
    });

    expect(index.ingestion.treeTruncated).toBe(true);
    expect(index.ingestion.status).toBe('partial');
    expect(index.ingestion.isComplete).toBe(false);
  });

  it('handles 404 repository not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
    }));

    await expect(
      ingestRepository({ owner: 'not-real', repository: 'does-not-exist' })
    ).rejects.toThrowError(IngestionError);
  });

  it('handles 403 / 429 rate limit error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 403,
      ok: false,
    }));

    try {
      await ingestRepository({ owner: 'octocat', repository: 'hello-world' });
      expect.unreachable();
    } catch (err: any) {
      expect(err).toBeInstanceOf(IngestionError);
      expect(err.code).toBe('RATE_LIMITED');
    }
  });

  it('handles empty repositories', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/trees/')) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ truncated: false, tree: [] }),
        });
      }
      return Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ name: 'empty', owner: { login: 'octocat' } }),
      });
    }));

    try {
      await ingestRepository({ owner: 'octocat', repository: 'empty' });
      expect.unreachable();
    } catch (err: any) {
      expect(err).toBeInstanceOf(IngestionError);
      expect(err.code).toBe('EMPTY_REPOSITORY');
    }
  });
});
