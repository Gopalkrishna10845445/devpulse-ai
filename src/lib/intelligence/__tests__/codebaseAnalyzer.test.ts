import { describe, it, expect } from 'vitest';
import { analyzeCodebase } from '../codebaseAnalyzer';
import { RepositoryIndex } from '../../repository/types';

describe('codebaseAnalyzer', () => {
  it('analyzes codebase from repository index and extracts symbols, imports, and relationships', async () => {
    const mockIndex: RepositoryIndex = {
      repository: {
        owner: 'Gopalkrishna10845445',
        name: 'devpulse-ai',
        fullName: 'Gopalkrishna10845445/devpulse-ai',
        defaultBranch: 'main',
        url: 'https://github.com/Gopalkrishna10845445/devpulse-ai',
        description: 'Engineering profile evaluator',
        stars: 10,
        forks: 2,
        openIssues: 0,
        isPrivate: false,
        isFork: false,
        isArchived: false,
        sizeKb: 1500,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-10',
      },
      ingestion: {
        status: 'complete',
        isComplete: true,
        totalFilesCounted: 3,
        indexedFilesCount: 3,
        skippedFilesCount: 0,
        directoryCount: 3,
        totalBytes: 5000,
        indexedBytes: 5000,
        treeTruncated: false,
        durationMs: 120,
        apiRequestsCount: 2,
        rateLimited: false,
      },
      files: [
        {
          path: 'src/app/page.tsx',
          name: 'page.tsx',
          type: 'file',
          sizeBytes: 1500,
          extension: 'tsx',
          language: 'TypeScript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
        },
        {
          path: 'src/components/Sidebar.tsx',
          name: 'Sidebar.tsx',
          type: 'file',
          sizeBytes: 2000,
          extension: 'tsx',
          language: 'TypeScript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
        },
        {
          path: 'src/lib/hygieneScore.ts',
          name: 'hygieneScore.ts',
          type: 'file',
          sizeBytes: 1500,
          extension: 'ts',
          language: 'TypeScript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
        },
      ],
      directories: [],
      languages: [{ name: 'TypeScript', fileCount: 3, bytes: 5000, percentage: 100 }],
      frameworks: [{ name: 'Next.js', category: 'fullstack', confidence: 'high', evidence: ['package.json: next'] }],
      dependencies: [{ name: 'next', manifestPath: 'package.json', ecosystem: 'npm' }],
      manifests: [],
      modules: [
        { name: 'app', path: 'src/app', fileCount: 1, totalBytes: 1500, detectedRole: 'app_router', description: 'App', primaryLanguage: 'TypeScript' },
        { name: 'components', path: 'src/components', fileCount: 1, totalBytes: 2000, detectedRole: 'components', description: 'Components', primaryLanguage: 'TypeScript' },
        { name: 'lib', path: 'src/lib', fileCount: 1, totalBytes: 1500, detectedRole: 'lib_utilities', description: 'Lib', primaryLanguage: 'TypeScript' },
      ],
      skippedFiles: [],
      indexedAt: new Date().toISOString(),
    };

    const mockContents = new Map<string, string>([
      [
        'src/app/page.tsx',
        `
import React from 'react';
import { Sidebar } from '@/components/Sidebar';

export default function Home() {
  return <Sidebar />;
}
`,
      ],
      [
        'src/components/Sidebar.tsx',
        `
import React from 'react';
import { scoreRepo } from '@/lib/hygieneScore';

export const Sidebar = () => {
  return <div>Sidebar</div>;
};
`,
      ],
      [
        'src/lib/hygieneScore.ts',
        `
export function scoreRepo(signals: any) {
  return { total: 100 };
}
`,
      ],
    ]);

    const intel = await analyzeCodebase({
      index: mockIndex,
      providedContents: mockContents,
    });

    expect(intel.status).toBe('complete');
    expect(intel.files).toHaveLength(3);
    expect(intel.symbols.length).toBeGreaterThanOrEqual(3);

    const symbolNames = intel.symbols.map(s => s.name);
    expect(symbolNames).toContain('Home');
    expect(symbolNames).toContain('Sidebar');
    expect(symbolNames).toContain('scoreRepo');

    // Check dependency resolution
    const pageFile = intel.files.find(f => f.filePath === 'src/app/page.tsx')!;
    expect(pageFile.internalDependencies).toContain('src/components/Sidebar.tsx');

    const sidebarFile = intel.files.find(f => f.filePath === 'src/components/Sidebar.tsx')!;
    expect(sidebarFile.internalDependencies).toContain('src/lib/hygieneScore.ts');
    expect(sidebarFile.dependents).toContain('src/app/page.tsx');

    // Check architectural model
    expect(intel.architecture.pattern).toBe('Next.js App Router Monolith');
    expect(intel.relationships.length).toBeGreaterThan(0);
  });
});
