import { describe, it, expect } from 'vitest';
import { analyzeEngineeringHealth } from '../engineeringEngine';
import { analyzeMaintainability } from '../maintainabilityAnalyzer';
import { analyzeArchitecture } from '../architectureAnalyzer';
import { analyzeTesting } from '../testingAnalyzer';
import { analyzeDependencies } from '../dependencyAnalyzer';
import { analyzeDocumentation } from '../documentationAnalyzer';
import { analyzeComplexity } from '../complexityAnalyzer';
import { analyzeCoupling } from '../couplingAnalyzer';
import { detectHotspots } from '../hotspotDetector';
import { analyzeActivity } from '../activityAnalyzer';
import { CodebaseIntelligence } from '../../intelligence/types';
import { RepositoryIndex } from '../../repository/types';

describe('Phase 5 — Engineering Intelligence Deterministic Analyzers', () => {
  const mockRepoIndex: RepositoryIndex = {
    repository: {
      fullName: 'owner/test-repo',
      name: 'test-repo',
      owner: 'owner',
      defaultBranch: 'main',
      url: 'https://github.com/owner/test-repo',
      description: 'Test repository',
      stars: 10,
      forks: 2,
      openIssues: 0,
      isPrivate: false,
      isFork: false,
      isArchived: false,
      sizeKb: 100,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    ingestion: {
      status: 'complete',
      isComplete: true,
      totalFilesCounted: 7,
      indexedFilesCount: 7,
      skippedFilesCount: 0,
      directoryCount: 4,
      totalBytes: 28114,
      indexedBytes: 28114,
      treeTruncated: false,
      durationMs: 2000,
      apiRequestsCount: 5,
      rateLimited: false,
    },
    files: [
      { path: 'README.md', name: 'README.md', sizeBytes: 1200, type: 'file', extension: 'md', isBinary: false, isSensitive: false, status: 'indexed', skipReason: null, language: 'Markdown' },
      { path: 'LICENSE', name: 'LICENSE', sizeBytes: 1064, type: 'file', extension: '', isBinary: false, isSensitive: false, status: 'indexed', skipReason: null, language: null },
      { path: 'package.json', name: 'package.json', sizeBytes: 850, type: 'file', extension: 'json', isBinary: false, isSensitive: false, status: 'manifest_parsed', skipReason: null, language: 'JSON' },
      { path: 'src/index.ts', name: 'index.ts', sizeBytes: 4000, type: 'file', extension: 'ts', isBinary: false, isSensitive: false, status: 'indexed', skipReason: null, language: 'TypeScript' },
      { path: 'src/services/userService.ts', name: 'userService.ts', sizeBytes: 12000, type: 'file', extension: 'ts', isBinary: false, isSensitive: false, status: 'indexed', skipReason: null, language: 'TypeScript' },
      { path: 'src/components/UserCard.tsx', name: 'UserCard.tsx', sizeBytes: 6000, type: 'file', extension: 'tsx', isBinary: false, isSensitive: false, status: 'indexed', skipReason: null, language: 'TypeScript React' },
      { path: 'src/services/__tests__/userService.test.ts', name: 'userService.test.ts', sizeBytes: 3000, type: 'file', extension: 'ts', isBinary: false, isSensitive: false, status: 'indexed', skipReason: null, language: 'TypeScript' },
    ],
    directories: [],
    languages: [],
    frameworks: [],
    dependencies: [],
    manifests: [
      {
        path: 'package.json',
        ecosystem: 'npm',
        dependencyCount: 2,
        devDependencyCount: 1,
        dependencies: [
          { name: 'react', manifestPath: 'package.json', ecosystem: 'npm' },
          { name: 'next', manifestPath: 'package.json', ecosystem: 'npm' },
        ],
        devDependencies: [
          { name: 'vitest', manifestPath: 'package.json', ecosystem: 'npm', isDev: true },
        ],
      },
    ],
    modules: [],
    skippedFiles: [],
    indexedAt: '2026-09-17T00:00:00Z',
  };

  const mockIntelligence: CodebaseIntelligence = {
    repository: {
      fullName: 'owner/test-repo',
      name: 'test-repo',
      owner: 'owner',
      defaultBranch: 'main',
      url: 'https://github.com/owner/test-repo',
      description: 'Test repository',
      stars: 10,
      forks: 2,
      openIssues: 0,
      isPrivate: false,
      isFork: false,
      isArchived: false,
      sizeKb: 100,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    analyzedAt: '2026-09-17T00:00:05Z',
    status: 'complete',
    durationMs: 450,
    files: [
      {
        filePath: 'src/index.ts',
        language: 'TypeScript',
        role: 'service',
        loc: 85,
        sizeBytes: 4000,
        symbols: [{ name: 'main', kind: 'function', filePath: 'src/index.ts', isExported: true }],
        imports: [{ sourcePath: 'src/index.ts', importPath: './services/userService', importedSymbols: ['getUser'], isDefault: false, isNamespace: false, isRelative: true, resolvedFilePath: 'src/services/userService.ts' }],
        exports: [{ sourcePath: 'src/index.ts', name: 'main', isDefault: false }],
        internalDependencies: ['src/services/userService.ts'],
        dependents: [],
      },
      {
        filePath: 'src/services/userService.ts',
        language: 'TypeScript',
        role: 'service',
        loc: 480, // Oversized (> 400)
        sizeBytes: 12000,
        symbols: [
          { name: 'getUser', kind: 'function', filePath: 'src/services/userService.ts', isExported: true },
          { name: 'updateUser', kind: 'function', filePath: 'src/services/userService.ts', isExported: true },
          { name: 'deleteUser', kind: 'function', filePath: 'src/services/userService.ts', isExported: true },
          { name: 'User', kind: 'interface', filePath: 'src/services/userService.ts', isExported: true },
        ],
        imports: [],
        exports: [{ sourcePath: 'src/services/userService.ts', name: 'getUser', isDefault: false }],
        internalDependencies: [],
        dependents: ['src/index.ts', 'src/components/UserCard.tsx', 'src/services/__tests__/userService.test.ts'],
      },
      {
        filePath: 'src/components/UserCard.tsx',
        language: 'TypeScript React',
        role: 'component',
        loc: 120,
        sizeBytes: 6000,
        symbols: [{ name: 'UserCard', kind: 'component', filePath: 'src/components/UserCard.tsx', isExported: true }],
        imports: [{ sourcePath: 'src/components/UserCard.tsx', importPath: '../services/userService', importedSymbols: ['User'], isDefault: false, isNamespace: false, isRelative: true, resolvedFilePath: 'src/services/userService.ts' }],
        exports: [{ sourcePath: 'src/components/UserCard.tsx', name: 'UserCard', isDefault: true }],
        internalDependencies: ['src/services/userService.ts'],
        dependents: [],
      },
      {
        filePath: 'src/services/__tests__/userService.test.ts',
        language: 'TypeScript',
        role: 'test',
        loc: 60,
        sizeBytes: 3000,
        symbols: [],
        imports: [{ sourcePath: 'src/services/__tests__/userService.test.ts', importPath: '../userService', importedSymbols: ['getUser'], isDefault: false, isNamespace: false, isRelative: true, resolvedFilePath: 'src/services/userService.ts' }],
        exports: [],
        internalDependencies: ['src/services/userService.ts'],
        dependents: [],
      },
    ],
    symbols: [
      { name: 'main', kind: 'function', filePath: 'src/index.ts', isExported: true },
      { name: 'getUser', kind: 'function', filePath: 'src/services/userService.ts', isExported: true },
      { name: 'UserCard', kind: 'component', filePath: 'src/components/UserCard.tsx', isExported: true },
    ],
    imports: [],
    exports: [],
    relationships: [
      { fromModule: 'components', toModule: 'services', importCount: 1, sampleImports: ["import { User } from '../services/userService'"] },
      { fromModule: 'entrypoint', toModule: 'services', importCount: 1, sampleImports: ["import { getUser } from './services/userService'"] },
    ],
    architecture: {
      pattern: 'Modular Layered Architecture',
      summary: 'Clean separation between presentation components and business services.',
      layers: [
        { name: 'components', path: 'src/components', role: 'Presentation UI', fileCount: 1, symbolCount: 1, keySymbols: ['UserCard'], description: 'React UI components' },
        { name: 'services', path: 'src/services', role: 'Business Logic', fileCount: 1, symbolCount: 4, keySymbols: ['getUser', 'updateUser'], description: 'Service layer' },
      ],
      dataFlow: [{ from: 'components', to: 'services', description: 'Components consume service methods', flowType: 'import' }],
      entrypoints: [{ path: 'src/index.ts', type: 'main_binary', description: 'Application entrypoint' }],
      metrics: {
        totalFilesAnalyzed: 4,
        totalSymbolsFound: 6,
        totalImportsResolved: 3,
        internalCouplingScore: 25,
        modularityScore: 85,
      },
    },
  };

  it('evaluates maintainability signals deterministically', () => {
    const res = analyzeMaintainability(mockRepoIndex, mockIntelligence);
    expect(res.indicators.totalLoc).toBe(745);
    expect(res.indicators.oversizedFilesCount).toBe(1);
    expect(res.indicators.oversizedFiles[0].filePath).toBe('src/services/userService.ts');
    expect(res.findings.length).toBeGreaterThanOrEqual(1);
    expect(res.findings[0].category).toBe('maintainability');
    expect(res.findings[0].severity).toBe('medium');
    expect(res.findings[0].deterministicRule).toBe('RULE_MAINT_OVERSIZED_FILE_MEDIUM');
  });

  it('evaluates architecture signals and detects zero circular dependencies', () => {
    const res = analyzeArchitecture(mockRepoIndex, mockIntelligence);
    expect(res.indicators.detectedPattern).toBe('Modular Layered Architecture');
    expect(res.indicators.circularDependencies.length).toBe(0);
    expect(res.indicators.layerViolations.length).toBe(0);
    expect(res.indicators.status).toBe('healthy');
  });

  it('evaluates testing signals without claiming false code coverage', () => {
    const res = analyzeTesting(mockRepoIndex, mockIntelligence);
    expect(res.indicators.totalTestFiles).toBe(1);
    expect(res.indicators.testedModules).toContain('services');
    expect(res.indicators.untestedModules).toContain('components');
    const untestedFinding = res.findings.find(f => f.category === 'testing');
    expect(untestedFinding).toBeDefined();
    expect(untestedFinding?.title).toContain('Potentially untested module');
    expect(untestedFinding?.description).not.toContain('0% code coverage');
  });

  it('evaluates dependencies signals deterministically', () => {
    const res = analyzeDependencies(mockRepoIndex);
    expect(res.indicators.totalDependencies).toBe(3);
    expect(res.indicators.directDependenciesCount).toBe(2);
    expect(res.indicators.devDependenciesCount).toBe(1);
    expect(res.indicators.multiEcosystemDetected).toBe(false);
  });

  it('evaluates documentation signals with structural evidence', () => {
    const res = analyzeDocumentation(mockRepoIndex, mockIntelligence);
    expect(res.indicators.hasReadme).toBe(true);
    expect(res.indicators.hasLicense).toBe(true);
    expect(res.indicators.status).toBe('healthy');
  });

  it('evaluates complexity and file fan-in metrics', () => {
    const res = analyzeComplexity(mockIntelligence);
    expect(res.indicators.highestLocFiles[0].filePath).toBe('src/services/userService.ts');
    expect(res.indicators.highestLocFiles[0].loc).toBe(480);
    expect(res.indicators.highFanInFiles[0].filePath).toBe('src/services/userService.ts');
    expect(res.indicators.highFanInFiles[0].dependentsCount).toBe(3);
  });

  it('evaluates module coupling relationships', () => {
    const res = analyzeCoupling(mockIntelligence);
    expect(res.indicators.totalRelationships).toBe(2);
    expect(res.indicators.bidirectionalCoupling.length).toBe(0);
    expect(res.indicators.status).toBe('healthy');
  });

  it('handles missing or unavailable GitHub telemetry safely without inventing data', () => {
    const res = analyzeActivity(null);
    expect(res.indicators.isAvailable).toBe(false);
    expect(res.indicators.unavailableReason).toContain('Insufficient historical');
    expect(res.indicators.status).toBe('unavailable');
    expect(res.indicators.activeCommitStreakDays).toBeNull();
  });

  it('ranks hotspots deterministically based on size, coupling, and tests', () => {
    const maintRes = analyzeMaintainability(mockRepoIndex, mockIntelligence);
    const hotspots = detectHotspots(mockIntelligence, maintRes.findings);
    expect(hotspots.length).toBeGreaterThan(0);
    expect(hotspots[0].filePath).toBe('src/services/userService.ts');
    expect(hotspots[0].riskScore).toBeGreaterThanOrEqual(35);
    expect(hotspots[0].signals).toContain('Oversized (480 LOC)');
    expect(hotspots[0].signals).toContain('Coupled consumer base (3 dependent files)');
  });

  it('orchestrates complete EngineeringHealthReport', async () => {
    const report = await analyzeEngineeringHealth({
      repoIndex: mockRepoIndex,
      intelligence: mockIntelligence,
      github: null,
    });

    expect(report.repository.fullName).toBe('owner/test-repo');
    expect(report.summary.repositoryId).toBe('owner/test-repo');
    expect(report.summary.totalFindingsCount).toBeGreaterThan(0);
    expect(report.summary.findingsBySeverity).toBeDefined();
    expect(report.maintainability.totalLoc).toBe(745);
    expect(report.architecture.modularityScore).toBe(85);
    expect(report.testing.totalTestFiles).toBe(1);
    expect(report.hotspots.length).toBeGreaterThan(0);
    expect(report.findings.length).toBe(report.summary.totalFindingsCount);
  });
});
