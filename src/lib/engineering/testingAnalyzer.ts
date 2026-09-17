/**
 * Phase 5 — Testing Signal Analyzer
 *
 * Deterministically evaluates test file presence, test-to-source file distribution,
 * test directory structure, and identifies potentially untested modules without
 * making unsubstantiated code coverage claims.
 */

import { CodebaseIntelligence, FileIntelligence } from '../intelligence/types';
import { RepositoryIndex } from '../repository/types';
import { EngineeringFinding, SignalMetric, TestingIndicators } from './types';

export function analyzeTesting(
  repoIndex: RepositoryIndex,
  intelligence: CodebaseIntelligence
): { indicators: TestingIndicators; findings: EngineeringFinding[] } {
  const findings: EngineeringFinding[] = [];
  const files: FileIntelligence[] = intelligence.files || [];
  const layers = intelligence.architecture?.layers || [];

  const testFiles: string[] = [];
  const sourceFiles: string[] = [];

  for (const f of files) {
    const p = f.filePath.toLowerCase();
    if (
      p.includes('.test.') ||
      p.includes('.spec.') ||
      p.includes('/__tests__/') ||
      p.includes('/tests/') ||
      p.includes('/test/') ||
      f.role === 'test'
    ) {
      testFiles.push(f.filePath);
    } else {
      sourceFiles.push(f.filePath);
    }
  }

  const testDirectoryPresent = files.some(f => {
    const p = f.filePath.toLowerCase();
    return p.includes('/__tests__/') || p.includes('/tests/') || p.includes('/test/');
  });

  // Check module test coverage distribution
  const testedModules: string[] = [];
  const untestedModules: string[] = [];

  for (const layer of layers) {
    const layerPath = layer.path.toLowerCase();
    const hasTests = testFiles.some(tf => tf.toLowerCase().includes(layerPath));
    if (hasTests) {
      testedModules.push(layer.name);
    } else {
      untestedModules.push(layer.name);

      // Only flag core business or service modules as findings if they lack test files
      if (layer.fileCount > 0 && !layer.name.toLowerCase().includes('config') && !layer.name.toLowerCase().includes('doc')) {
        findings.push({
          id: `test-untested-module-${layer.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
          category: 'testing',
          severity: layer.fileCount >= 3 ? 'medium' : 'low',
          title: `Potentially untested module: ${layer.name}`,
          description: `No test files (.test.*, .spec.*, or __tests__) were detected under module path "${layer.path}" (${layer.fileCount} source files).`,
          impact: 'Modules lacking co-located or dedicated test files carry higher risk of undetected regressions during refactors.',
          relatedModules: [layer.name],
          confidence: 'medium',
          deterministicRule: 'RULE_TEST_MODULE_LACKS_TEST_FILES',
          recommendation: `Add unit test specifications under ${layer.path}/__tests__/ covering key symbols (${layer.keySymbols.slice(0, 3).join(', ')}).`,
          evidence: {
            type: 'structure_gap',
            summary: `Module contains ${layer.fileCount} files and ${layer.symbolCount} symbols with 0 co-located test files.`,
            references: [{ fromModule: layer.name, metricName: 'FileCount', metricValue: layer.fileCount }],
            data: { layerPath: layer.path, fileCount: layer.fileCount, keySymbols: layer.keySymbols },
          },
        });
      }
    }
  }

  // Ratio calculation
  const totalTestFiles = testFiles.length;
  const totalSourceFiles = sourceFiles.length;
  const testToFileRatio = totalSourceFiles > 0 ? +(totalTestFiles / totalSourceFiles).toFixed(2) : 0;

  if (totalTestFiles === 0 && totalSourceFiles > 0) {
    findings.push({
      id: 'test-no-tests-detected',
      category: 'testing',
      severity: 'high',
      title: 'No test suite or test files detected in repository',
      description: 'Zero test files matching standard testing conventions (.test.*, .spec.*, __tests__/) were found in the analyzed source tree.',
      impact: 'Without automated regression tests, code correctness relies entirely on manual verification.',
      confidence: 'high',
      deterministicRule: 'RULE_TEST_ZERO_TESTS_DETECTED',
      recommendation: 'Establish an automated unit testing harness (e.g. Vitest or Jest) with CI/CD execution.',
      evidence: {
        type: 'structure_gap',
        summary: `0 test files found across ${totalSourceFiles} source files.`,
        references: [],
      },
    });
  }

  const status = totalTestFiles === 0 && totalSourceFiles > 2
    ? 'warning'
    : untestedModules.length > testedModules.length
    ? 'neutral'
    : 'healthy';

  const metrics: SignalMetric[] = [
    {
      name: 'Test Files Count',
      value: totalTestFiles,
      status: totalTestFiles > 0 ? 'healthy' : 'warning',
      label: 'Test Files',
      description: 'Total number of automated test files identified in source tree.',
      evidence: `${totalTestFiles} test files found`,
    },
    {
      name: 'Test-to-Source Ratio',
      value: `${(testToFileRatio * 100).toFixed(0)}%`,
      status: testToFileRatio >= 0.25 ? 'healthy' : testToFileRatio > 0 ? 'neutral' : 'warning',
      label: 'Test/Source Ratio',
      description: 'Ratio of test files relative to functional source files.',
      evidence: `${totalTestFiles} test files : ${totalSourceFiles} source files`,
    },
    {
      name: 'Tested Modules',
      value: `${testedModules.length}/${layers.length}`,
      status: untestedModules.length === 0 ? 'healthy' : 'neutral',
      label: 'Tested Modules',
      description: 'Structural modules with detected test files.',
      evidence: `${testedModules.length} modules have test presence`,
    },
    {
      name: 'Test Directory',
      value: testDirectoryPresent ? 'Present' : 'Not detected',
      status: testDirectoryPresent ? 'healthy' : 'neutral',
      label: 'Test Directory',
      description: 'Presence of standard test root directory (__tests__, tests/).',
      evidence: testDirectoryPresent ? 'Dedicated test directories found' : 'No top-level test folder detected',
    },
  ];

  return {
    indicators: {
      status,
      summary: `${totalTestFiles} test files found (${(testToFileRatio * 100).toFixed(0)}% test/source ratio). ${untestedModules.length} modules lack co-located test files.`,
      totalTestFiles,
      totalSourceFiles,
      testToFileRatio,
      testedModules,
      untestedModules,
      testDirectoryPresent,
      metrics,
    },
    findings,
  };
}
