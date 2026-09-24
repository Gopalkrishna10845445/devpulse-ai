import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeCodebase, clearCodebaseAnalysisCache } from '../codebaseAnalyzer';
import { RepositoryIndex } from '../../repository/types';

describe('codebaseAnalyzer', () => {
  beforeEach(() => {
    clearCodebaseAnalysisCache();
  });

  const baseMockIndex: RepositoryIndex = {
    repository: {
      owner: 'Gopalkrishna10845445',
      name: 'devpulse-ai',
      fullName: 'Gopalkrishna10845445/devpulse-ai',
      defaultBranch: 'main',
      url: 'https://github.com/Gopalkrishna10845445/devpulse-ai',
      description: 'Engineering profile evaluator and intelligence platform',
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
      totalFilesCounted: 6,
      indexedFilesCount: 5,
      skippedFilesCount: 1,
      directoryCount: 4,
      totalBytes: 15000,
      indexedBytes: 14500,
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
        path: 'src/app/api/analyze/route.ts',
        name: 'route.ts',
        type: 'file',
        sizeBytes: 2500,
        extension: 'ts',
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
      {
        path: 'src/lib/db/schema.sql',
        name: 'schema.sql',
        type: 'file',
        sizeBytes: 7000,
        extension: 'sql',
        language: 'SQL',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
      {
        path: '.env.local',
        name: '.env.local',
        type: 'file',
        sizeBytes: 500,
        extension: 'local',
        language: null,
        isBinary: false,
        isSensitive: true,
        status: 'skipped',
        skipReason: 'sensitive_file',
      },
    ],
    directories: [
      { path: 'src/app', name: 'app', type: 'directory', fileCount: 2, directFileCount: 1, directSubdirCount: 1, totalBytes: 4000 },
      { path: 'src/components', name: 'components', type: 'directory', fileCount: 1, directFileCount: 1, directSubdirCount: 0, totalBytes: 2000 },
      { path: 'src/lib', name: 'lib', type: 'directory', fileCount: 2, directFileCount: 1, directSubdirCount: 1, totalBytes: 8500 },
    ],
    languages: [
      { name: 'TypeScript', fileCount: 4, bytes: 7500, percentage: 51.7 },
      { name: 'SQL', fileCount: 1, bytes: 7000, percentage: 48.3 },
    ],
    frameworks: [
      { name: 'Next.js', category: 'fullstack', confidence: 'high', evidence: ['package.json: next'] },
      { name: 'React', category: 'frontend', confidence: 'high', evidence: ['package.json: react'] },
    ],
    dependencies: [
      { name: 'next', manifestPath: 'package.json', ecosystem: 'npm', isDev: false },
      { name: 'react', manifestPath: 'package.json', ecosystem: 'npm', isDev: false },
      { name: 'pg', manifestPath: 'package.json', ecosystem: 'npm', isDev: false },
      { name: 'vitest', manifestPath: 'package.json', ecosystem: 'npm', isDev: true },
    ],
    manifests: [
      {
        path: 'package.json',
        ecosystem: 'npm',
        dependencyCount: 3,
        devDependencyCount: 1,
        dependencies: [
          { name: 'next', manifestPath: 'package.json', ecosystem: 'npm', isDev: false },
          { name: 'react', manifestPath: 'package.json', ecosystem: 'npm', isDev: false },
          { name: 'pg', manifestPath: 'package.json', ecosystem: 'npm', isDev: false },
        ],
        devDependencies: [
          { name: 'vitest', manifestPath: 'package.json', ecosystem: 'npm', isDev: true },
        ],
      },
    ],
    modules: [
      { name: 'app', path: 'src/app', fileCount: 2, totalBytes: 4000, detectedRole: 'app_router', description: 'App Router', primaryLanguage: 'TypeScript' },
      { name: 'components', path: 'src/components', fileCount: 1, totalBytes: 2000, detectedRole: 'components', description: 'Components', primaryLanguage: 'TypeScript' },
      { name: 'lib', path: 'src/lib', fileCount: 2, totalBytes: 8500, detectedRole: 'lib_utilities', description: 'Lib', primaryLanguage: 'TypeScript' },
    ],
    skippedFiles: [{ path: '.env.local', reason: 'sensitive_file', sizeBytes: 500 }],
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
      'src/app/api/analyze/route.ts',
      `
import { NextResponse } from 'next/server';
import { scoreRepo } from '@/lib/hygieneScore';

export async function POST(req: Request) {
  const result = scoreRepo({});
  return NextResponse.json(result);
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
    [
      'src/lib/db/schema.sql',
      `
CREATE TABLE repositories (
  id VARCHAR(255) PRIMARY KEY
);
`,
    ],
  ]);

  it('1. performs complete codebase analysis and extracts symbols, imports, and relationships', async () => {
    const intel = await analyzeCodebase({
      index: baseMockIndex,
      providedContents: mockContents,
    });

    expect(intel.status).toBe('complete');
    expect(intel.files.length).toBeGreaterThanOrEqual(4);
    expect(intel.symbols.length).toBeGreaterThanOrEqual(4);

    const symbolNames = intel.symbols.map((s) => s.name);
    expect(symbolNames).toContain('Home');
    expect(symbolNames).toContain('POST');
    expect(symbolNames).toContain('Sidebar');
    expect(symbolNames).toContain('scoreRepo');

    // Dependency linkages
    const pageFile = intel.files.find((f) => f.filePath === 'src/app/page.tsx')!;
    expect(pageFile.internalDependencies).toContain('src/components/Sidebar.tsx');

    const sidebarFile = intel.files.find((f) => f.filePath === 'src/components/Sidebar.tsx')!;
    expect(sidebarFile.internalDependencies).toContain('src/lib/hygieneScore.ts');
    expect(sidebarFile.dependents).toContain('src/app/page.tsx');
  });

  it('2. detects technology stack including database, testing, and frameworks', async () => {
    const intel = await analyzeCodebase({
      index: baseMockIndex,
      providedContents: mockContents,
    });

    expect(intel.technologyStack.languages).toHaveLength(2);
    expect(intel.technologyStack.frameworks.map((f) => f.name)).toContain('Next.js');
    expect(intel.technologyStack.database.detected).toBe(true);
    expect(intel.technologyStack.database.type).toBe('PostgreSQL');
    expect(intel.technologyStack.testing.detected).toBe(true);
    expect(intel.technologyStack.testing.frameworks).toContain('Vitest');
  });

  it('3. detects architectural patterns and dimensions', async () => {
    const intel = await analyzeCodebase({
      index: baseMockIndex,
      providedContents: mockContents,
    });

    expect(intel.architecture.pattern).toBe('Next.js App Router Monolith');
    expect(intel.patterns.frontend).toContain('Next.js App Router');
    expect(intel.patterns.api).toContain('Next.js');
    expect(intel.patterns.database).toContain('PostgreSQL');
    expect(intel.patterns.components).toContain('Reusable');
  });

  it('4. calculates comprehensive engineering metrics', async () => {
    const intel = await analyzeCodebase({
      index: baseMockIndex,
      providedContents: mockContents,
    });

    expect(intel.metrics.totalFiles).toBe(6);
    expect(intel.metrics.analyzedFiles).toBeGreaterThanOrEqual(4);
    expect(intel.metrics.skippedFiles).toBe(1);
    expect(intel.metrics.totalLinesOfCode).toBeGreaterThan(0);
    expect(intel.metrics.dependenciesCount).toBe(3);
    expect(intel.metrics.devDependenciesCount).toBe(1);
    expect(intel.metrics.modularityScore).toBeGreaterThanOrEqual(80);
    expect(intel.metrics.internalCouplingScore).toBeGreaterThanOrEqual(0);
  });

  it('5. analyzes repository structure (major directories, important files, entrypoints)', async () => {
    const intel = await analyzeCodebase({
      index: baseMockIndex,
      providedContents: mockContents,
    });

    expect(intel.structure.majorDirectories.length).toBeGreaterThanOrEqual(2);
    expect(intel.structure.importantFiles.length).toBeGreaterThanOrEqual(2);
    expect(intel.structure.frontendComponents.map((c) => c.name)).toContain('Sidebar');
    expect(intel.structure.apiEndpoints.length).toBeGreaterThanOrEqual(1);
  });

  it('6. generates concise deterministic engineering summary', async () => {
    const intel = await analyzeCodebase({
      index: baseMockIndex,
      providedContents: mockContents,
    });

    expect(intel.summary.overview).toContain('Gopalkrishna10845445/devpulse-ai');
    expect(intel.summary.technologies).toContain('TypeScript');
    expect(intel.summary.technologies).toContain('Next.js');
    expect(intel.summary.executionModel).toBeDefined();
    expect(intel.summary.engineeringObservations.length).toBeGreaterThan(0);
  });

  it('7. strictly excludes sensitive files from source inspection candidates', async () => {
    const intel = await analyzeCodebase({
      index: baseMockIndex,
      providedContents: mockContents,
    });

    const analyzedPaths = intel.files.map((f) => f.filePath);
    expect(analyzedPaths).not.toContain('.env.local');
    expect(intel.symbols.some((s) => s.filePath.includes('.env'))).toBe(false);
  });

  it('8. handles minimal / empty repository gracefully without crashing', async () => {
    const emptyIndex: RepositoryIndex = {
      repository: {
        owner: 'octocat',
        name: 'Hello-World',
        fullName: 'octocat/Hello-World',
        defaultBranch: 'master',
        url: 'https://github.com/octocat/Hello-World',
        description: 'Hello World',
        stars: 1,
        forks: 0,
        openIssues: 0,
        isPrivate: false,
        isFork: false,
        isArchived: false,
        sizeKb: 1,
        createdAt: '2020-01-01',
        updatedAt: '2020-01-01',
      },
      ingestion: {
        status: 'complete',
        isComplete: true,
        totalFilesCounted: 1,
        indexedFilesCount: 1,
        skippedFilesCount: 0,
        directoryCount: 0,
        totalBytes: 50,
        indexedBytes: 50,
        treeTruncated: false,
        durationMs: 10,
        apiRequestsCount: 1,
        rateLimited: false,
      },
      files: [
        {
          path: 'README.md',
          name: 'README.md',
          type: 'file',
          sizeBytes: 50,
          extension: 'md',
          language: 'Markdown',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
        },
      ],
      directories: [],
      languages: [],
      frameworks: [],
      dependencies: [],
      manifests: [],
      modules: [],
      skippedFiles: [],
      indexedAt: new Date().toISOString(),
    };

    const intel = await analyzeCodebase({
      index: emptyIndex,
      providedContents: new Map([['README.md', '# Hello World\n']]),
    });

    expect(intel.status).toBe('partial');
    expect(intel.projectType).toBe('Minimal Repository');
    expect(intel.metrics.totalFiles).toBe(1);
    expect(intel.technologyStack.database.detected).toBe(false);
    expect(intel.patterns.frontend).toBe('Not detected');
  });

  it('9. provides idempotent analysis results across repeated runs', async () => {
    const run1 = await analyzeCodebase({
      index: baseMockIndex,
      providedContents: mockContents,
    });

    const run2 = await analyzeCodebase({
      index: baseMockIndex,
      providedContents: mockContents,
    });

    expect(run1.projectType).toEqual(run2.projectType);
    expect(run1.symbols.length).toEqual(run2.symbols.length);
    expect(run1.architecture.pattern).toEqual(run2.architecture.pattern);
    expect(run1.metrics.totalFiles).toEqual(run2.metrics.totalFiles);
  });
});
