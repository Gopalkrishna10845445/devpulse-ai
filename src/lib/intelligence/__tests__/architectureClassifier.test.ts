import { describe, it, expect } from 'vitest';
import { classifyArchitecture } from '../architectureClassifier';
import { RepositoryRef } from '../../repository/types';
import { FileIntelligence } from '../types';

describe('classifyArchitecture', () => {
  const dummyRepo: RepositoryRef = {
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
  };

  it('classifies Next.js App Router Monolith pattern', () => {
    const files: FileIntelligence[] = [
      {
        filePath: 'src/app/page.tsx',
        language: 'TypeScript',
        role: 'page',
        loc: 150,
        sizeBytes: 4000,
        symbols: [{ name: 'Home', kind: 'component', filePath: 'src/app/page.tsx', isExported: true }],
        imports: [],
        exports: [],
        internalDependencies: ['src/components/Sidebar.tsx'],
        dependents: [],
      },
      {
        filePath: 'src/components/Sidebar.tsx',
        language: 'TypeScript',
        role: 'component',
        loc: 100,
        sizeBytes: 3000,
        symbols: [{ name: 'Sidebar', kind: 'component', filePath: 'src/components/Sidebar.tsx', isExported: true }],
        imports: [],
        exports: [],
        internalDependencies: [],
        dependents: ['src/app/page.tsx'],
      },
      {
        filePath: 'src/app/api/analyze/route.ts',
        language: 'TypeScript',
        role: 'api_route',
        loc: 40,
        sizeBytes: 1200,
        symbols: [{ name: 'POST', kind: 'endpoint', filePath: 'src/app/api/analyze/route.ts', isExported: true }],
        imports: [],
        exports: [],
        internalDependencies: [],
        dependents: [],
      },
      {
        filePath: 'src/lib/profileEvaluator.ts',
        language: 'TypeScript',
        role: 'service',
        loc: 250,
        sizeBytes: 8000,
        symbols: [{ name: 'analyzeProfile', kind: 'function', filePath: 'src/lib/profileEvaluator.ts', isExported: true }],
        imports: [],
        exports: [],
        internalDependencies: [],
        dependents: [],
      },
    ];

    const model = classifyArchitecture({
      repository: dummyRepo,
      frameworks: [{ name: 'Next.js', category: 'fullstack', confidence: 'high', evidence: ['package.json: next'] }],
      modules: [
        { name: 'app', path: 'src/app', fileCount: 2, totalBytes: 5200, detectedRole: 'app_router', description: 'App router', primaryLanguage: 'TypeScript' },
        { name: 'components', path: 'src/components', fileCount: 1, totalBytes: 3000, detectedRole: 'components', description: 'UI', primaryLanguage: 'TypeScript' },
        { name: 'lib', path: 'src/lib', fileCount: 1, totalBytes: 8000, detectedRole: 'lib_utilities', description: 'Lib', primaryLanguage: 'TypeScript' },
      ],
      files,
      symbols: files.flatMap(f => f.symbols),
      relationships: [{ fromModule: 'src/app', toModule: 'src/components', importCount: 1, sampleImports: ['page.tsx → Sidebar.tsx'] }],
    });

    expect(model.pattern).toBe('Next.js App Router Monolith');
    expect(model.layers.length).toBeGreaterThanOrEqual(3);
    expect(model.layers.map(l => l.name)).toContain('Presentation & UI Layer');
    expect(model.layers.map(l => l.name)).toContain('API & Route Handler Layer');
    expect(model.layers.map(l => l.name)).toContain('Domain Logic & Heuristics Layer');
    expect(model.entrypoints.length).toBeGreaterThan(0);
    expect(model.metrics.totalFilesAnalyzed).toBe(4);
    expect(model.metrics.totalSymbolsFound).toBe(4);
  });
});
