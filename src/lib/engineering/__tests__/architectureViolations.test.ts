import { describe, it, expect } from 'vitest';
import { analyzeArchitecture } from '../architectureAnalyzer';
import { analyzeCoupling } from '../couplingAnalyzer';
import { CodebaseIntelligence } from '../../intelligence/types';
import { RepositoryIndex, RepositoryRef } from '../../repository/types';

describe('Phase 5 — Architecture & Coupling Advanced Signal Rules', () => {
  const dummyRepo: RepositoryRef = {
    fullName: 'test/cycles',
    name: 'cycles',
    owner: 'test',
    defaultBranch: 'main',
    url: 'https://github.com/test/cycles',
    description: '',
    stars: 0,
    forks: 0,
    openIssues: 0,
    isPrivate: false,
    isFork: false,
    isArchived: false,
    sizeKb: 10,
    createdAt: '',
    updatedAt: '',
  };

  const baseRepoIndex: RepositoryIndex = {
    repository: dummyRepo,
    ingestion: {
      status: 'complete',
      isComplete: true,
      totalFilesCounted: 5,
      indexedFilesCount: 5,
      skippedFilesCount: 0,
      directoryCount: 2,
      totalBytes: 1000,
      indexedBytes: 1000,
      treeTruncated: false,
      durationMs: 0,
      apiRequestsCount: 1,
      rateLimited: false,
    },
    files: [],
    directories: [],
    languages: [],
    frameworks: [],
    dependencies: [],
    manifests: [],
    modules: [],
    skippedFiles: [],
    indexedAt: '',
  };

  it('detects complex circular dependencies across 3 modules (A -> B -> C -> A)', () => {
    const cyclicIntelligence: CodebaseIntelligence = {
      repository: dummyRepo,
      analyzedAt: '',
      status: 'complete',
      durationMs: 100,
      files: [],
      symbols: [],
      imports: [],
      exports: [],
      relationships: [
        { fromModule: 'moduleA', toModule: 'moduleB', importCount: 3, sampleImports: ['import { b } from "moduleB"'] },
        { fromModule: 'moduleB', toModule: 'moduleC', importCount: 2, sampleImports: ['import { c } from "moduleC"'] },
        { fromModule: 'moduleC', toModule: 'moduleA', importCount: 1, sampleImports: ['import { a } from "moduleA"'] },
      ],
      architecture: {
        pattern: 'Modular Layered Architecture',
        summary: '',
        layers: [
          { name: 'moduleA', path: 'src/moduleA', role: '', fileCount: 2, symbolCount: 2, keySymbols: [], description: '' },
          { name: 'moduleB', path: 'src/moduleB', role: '', fileCount: 2, symbolCount: 2, keySymbols: [], description: '' },
          { name: 'moduleC', path: 'src/moduleC', role: '', fileCount: 2, symbolCount: 2, keySymbols: [], description: '' },
        ],
        dataFlow: [],
        entrypoints: [],
        metrics: { totalFilesAnalyzed: 6, totalSymbolsFound: 6, totalImportsResolved: 6, internalCouplingScore: 60, modularityScore: 50 },
      },
    };

    const archRes = analyzeArchitecture(baseRepoIndex, cyclicIntelligence);
    expect(archRes.indicators.circularDependencies.length).toBe(1);
    expect(archRes.indicators.circularDependencies[0].evidence).toContain('moduleA');
    expect(archRes.indicators.circularDependencies[0].evidence).toContain('moduleB');
    expect(archRes.indicators.circularDependencies[0].evidence).toContain('moduleC');

    const cycleFinding = archRes.findings.find(f => f.deterministicRule === 'RULE_ARCH_CIRCULAR_DEPENDENCY');
    expect(cycleFinding).toBeDefined();
    expect(cycleFinding?.severity).toBe('high');
    expect(cycleFinding?.relatedModules).toEqual(expect.arrayContaining(['moduleA', 'moduleB', 'moduleC']));
  });

  it('detects bidirectional coupling between two modules', () => {
    const bidirectionalIntelligence: CodebaseIntelligence = {
      repository: dummyRepo,
      analyzedAt: '',
      status: 'complete',
      durationMs: 100,
      files: [],
      symbols: [],
      imports: [],
      exports: [],
      relationships: [
        { fromModule: 'auth', toModule: 'users', importCount: 12, sampleImports: ['import { getUser } from "users"'] },
        { fromModule: 'users', toModule: 'auth', importCount: 8, sampleImports: ['import { verifyToken } from "auth"'] },
      ],
      architecture: {
        pattern: 'Modular Layered Architecture',
        summary: '',
        layers: [],
        dataFlow: [],
        entrypoints: [],
        metrics: { totalFilesAnalyzed: 4, totalSymbolsFound: 4, totalImportsResolved: 20, internalCouplingScore: 50, modularityScore: 60 },
      },
    };

    const coupRes = analyzeCoupling(bidirectionalIntelligence);
    expect(coupRes.indicators.bidirectionalCoupling.length).toBe(1);
    expect(coupRes.indicators.bidirectionalCoupling[0].moduleA).toBe('auth');
    expect(coupRes.indicators.bidirectionalCoupling[0].moduleB).toBe('users');

    const biFinding = coupRes.findings.find(f => f.deterministicRule === 'RULE_COUPLING_BIDIRECTIONAL_PAIR');
    expect(biFinding).toBeDefined();
    expect(biFinding?.severity).toBe('high');
  });

  it('detects layer violations when UI directly couples to Database', () => {
    const layerViolationIntelligence: CodebaseIntelligence = {
      repository: dummyRepo,
      analyzedAt: '',
      status: 'complete',
      durationMs: 100,
      files: [],
      symbols: [],
      imports: [],
      exports: [],
      relationships: [
        { fromModule: 'components', toModule: 'database', importCount: 5, sampleImports: ['import { prisma } from "database/client"'] },
      ],
      architecture: {
        pattern: 'Next.js App Router Monolith',
        summary: '',
        layers: [],
        dataFlow: [],
        entrypoints: [],
        metrics: { totalFilesAnalyzed: 5, totalSymbolsFound: 5, totalImportsResolved: 5, internalCouplingScore: 30, modularityScore: 70 },
      },
    };

    const archRes = analyzeArchitecture(baseRepoIndex, layerViolationIntelligence);
    expect(archRes.indicators.layerViolations.length).toBe(1);
    expect(archRes.indicators.layerViolations[0].fromModule).toBe('components');
    expect(archRes.indicators.layerViolations[0].toModule).toBe('database');

    const violationFinding = archRes.findings.find(f => f.deterministicRule === 'RULE_ARCH_LAYER_BYPASS_UI_DB');
    expect(violationFinding).toBeDefined();
    expect(violationFinding?.severity).toBe('medium');
  });
});
