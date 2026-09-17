import { describe, it, expect } from 'vitest';
import { analyzeSecurityHealth } from '../securityEngine';
import { createMockRepoIndex, createMockRepoRef } from './testHelpers';

describe('Phase 6: Security Intelligence Engine', () => {
  it('aggregates findings, calculates severity statistics, and compiles report', async () => {
    const repoIndex = createMockRepoIndex({
      repository: createMockRepoRef({
        name: 'test-project',
        owner: 'owner',
        fullName: 'owner/test-project',
      }),
      files: [
        {
          path: 'src/config.ts',
          name: 'config.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const token = "ghp_123456789012345678901234567890123456";',
          sizeBytes: 80,
          extension: '.ts',
          sha: '1',
        },
        {
          path: '.env',
          name: '.env',
          type: 'file',
          language: null,
          isBinary: false,
          isSensitive: true,
          status: 'indexed',
          skipReason: null,
          content: 'DATABASE_URL=postgres://...',
          sizeBytes: 40,
          extension: '',
          sha: '2',
        },
        {
          path: 'src/eval.ts',
          name: 'eval.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const fn = eval("1 + 1");',
          sizeBytes: 30,
          extension: '.ts',
          sha: '3',
        },
      ],
      manifests: [
        {
          path: 'package.json',
          ecosystem: 'npm',
          dependencyCount: 1,
          devDependencyCount: 0,
          dependencies: [
            { name: 'lodash', versionConstraint: '4.17.15', manifestPath: 'package.json', ecosystem: 'npm' },
          ],
          devDependencies: [],
        },
      ],
    });

    const report = await analyzeSecurityHealth({ repoIndex });

    expect(report.repository.fullName).toBe('owner/test-project');
    expect(report.summary.overallStatus).toBe('critical'); // ghp_ is critical
    expect(report.summary.findingsBySeverity.critical).toBeGreaterThanOrEqual(1);
    expect(report.summary.findingsBySeverity.high).toBeGreaterThanOrEqual(1);
    expect(report.summary.keySecurityRisks.length).toBeGreaterThan(0);
    expect(report.findings.length).toBeGreaterThanOrEqual(4);

    // Ensure findings are sorted by severity
    const severities = report.findings.map(f => f.severity);
    expect(severities[0]).toBe('critical');
  });

  it('reports secure status for clean repository with highlights', async () => {
    const repoIndex = createMockRepoIndex({
      repository: createMockRepoRef({
        name: 'clean-project',
        owner: 'owner',
        fullName: 'owner/clean-project',
      }),
      files: [
        {
          path: 'src/index.ts',
          name: 'index.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'export function add(a: number, b: number): number { return a + b; }',
          sizeBytes: 70,
          extension: '.ts',
          sha: '1',
        },
      ],
      manifests: [
        {
          path: 'package.json',
          ecosystem: 'npm',
          dependencyCount: 1,
          devDependencyCount: 0,
          dependencies: [
            { name: 'react', versionConstraint: '^18.2.0', manifestPath: 'package.json', ecosystem: 'npm' },
          ],
          devDependencies: [],
        },
      ],
    });

    const report = await analyzeSecurityHealth({ repoIndex });

    expect(report.summary.overallStatus).toBe('secure');
    expect(report.summary.totalFindingsCount).toBe(0);
    expect(report.summary.securityHighlights.length).toBeGreaterThan(0);
  });
});
