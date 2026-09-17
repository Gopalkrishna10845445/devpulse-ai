/**
 * Phase 5 — Maintainability Signal Analyzer
 *
 * Deterministically evaluates codebase maintainability indicators including
 * file size thresholds, symbol density, directory nesting depth, and structural bloat.
 */

import { CodebaseIntelligence, FileIntelligence } from '../intelligence/types';
import { RepositoryIndex } from '../repository/types';
import { EngineeringFinding, MaintainabilityIndicators, SignalMetric } from './types';

const OVERSIZED_FILE_THRESHOLD_MEDIUM = 400;
const OVERSIZED_FILE_THRESHOLD_HIGH = 700;
const HIGH_SYMBOL_DENSITY_THRESHOLD = 25;
const DEEP_NESTING_DEPTH_THRESHOLD = 5;

export function analyzeMaintainability(
  repoIndex: RepositoryIndex,
  intelligence: CodebaseIntelligence
): { indicators: MaintainabilityIndicators; findings: EngineeringFinding[] } {
  const files: FileIntelligence[] = intelligence.files || [];
  const findings: EngineeringFinding[] = [];

  let totalLoc = 0;
  const oversizedFiles: { filePath: string; loc: number; reason: string }[] = [];
  const highSymbolDensityFiles: { filePath: string; symbolCount: number }[] = [];
  const deeplyNestedFiles: { filePath: string; depth: number }[] = [];

  for (const file of files) {
    totalLoc += file.loc;

    // 1. Oversized file analysis
    if (file.loc >= OVERSIZED_FILE_THRESHOLD_HIGH) {
      oversizedFiles.push({
        filePath: file.filePath,
        loc: file.loc,
        reason: `File exceeds high threshold (${file.loc} > ${OVERSIZED_FILE_THRESHOLD_HIGH} LOC)`,
      });

      findings.push({
        id: `maint-oversized-${file.filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'maintainability',
        severity: 'high',
        title: `Extremely large source file: ${file.filePath}`,
        description: `The file has ${file.loc} lines of code, exceeding the high maintainability threshold of ${OVERSIZED_FILE_THRESHOLD_HIGH} LOC.`,
        impact: 'Large files exhibit higher bug density, are difficult to unit test in isolation, and increase code review friction.',
        filePath: file.filePath,
        confidence: 'high',
        deterministicRule: 'RULE_MAINT_OVERSIZED_FILE_HIGH',
        recommendation: 'Decompose this file into cohesive sub-modules or extract isolated helper functions/hooks.',
        evidence: {
          type: 'file_metric',
          summary: `${file.filePath} contains ${file.loc} LOC and ${file.symbols.length} symbols.`,
          references: [{ file: file.filePath, metricName: 'LOC', metricValue: file.loc }],
          data: { loc: file.loc, symbolCount: file.symbols.length },
        },
      });
    } else if (file.loc >= OVERSIZED_FILE_THRESHOLD_MEDIUM) {
      oversizedFiles.push({
        filePath: file.filePath,
        loc: file.loc,
        reason: `File exceeds warning threshold (${file.loc} > ${OVERSIZED_FILE_THRESHOLD_MEDIUM} LOC)`,
      });

      findings.push({
        id: `maint-oversized-${file.filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'maintainability',
        severity: 'medium',
        title: `Oversized source file: ${file.filePath}`,
        description: `The file has ${file.loc} lines of code, exceeding the threshold of ${OVERSIZED_FILE_THRESHOLD_MEDIUM} LOC.`,
        impact: 'Oversized files tend to accumulate multiple responsibilities and lower maintainability over time.',
        filePath: file.filePath,
        confidence: 'high',
        deterministicRule: 'RULE_MAINT_OVERSIZED_FILE_MEDIUM',
        recommendation: 'Consider separating distinct components, types, or services out of this file.',
        evidence: {
          type: 'file_metric',
          summary: `${file.filePath} has ${file.loc} lines of code.`,
          references: [{ file: file.filePath, metricName: 'LOC', metricValue: file.loc }],
          data: { loc: file.loc },
        },
      });
    }

    // 2. High symbol density
    if (file.symbols.length >= HIGH_SYMBOL_DENSITY_THRESHOLD) {
      highSymbolDensityFiles.push({
        filePath: file.filePath,
        symbolCount: file.symbols.length,
      });

      findings.push({
        id: `maint-symbol-density-${file.filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'maintainability',
        severity: 'low',
        title: `High symbol concentration in ${file.filePath}`,
        description: `The file declares ${file.symbols.length} distinct symbols (functions, classes, interfaces, types).`,
        impact: 'High symbol density often indicates multiple responsibilities grouped in a single file.',
        filePath: file.filePath,
        confidence: 'high',
        deterministicRule: 'RULE_MAINT_HIGH_SYMBOL_DENSITY',
        recommendation: 'Group closely related symbols into dedicated submodule files.',
        evidence: {
          type: 'symbol_metric',
          summary: `Declared ${file.symbols.length} symbols: ${file.symbols.slice(0, 5).map(s => s.name).join(', ')}...`,
          references: file.symbols.slice(0, 5).map(s => ({ file: file.filePath, symbol: s.name, line: s.line })),
          data: { symbolCount: file.symbols.length },
        },
      });
    }

    // 3. Deep directory nesting
    const depth = file.filePath.split('/').length;
    if (depth >= DEEP_NESTING_DEPTH_THRESHOLD) {
      deeplyNestedFiles.push({ filePath: file.filePath, depth });
    }
  }

  const averageFileLoc = files.length > 0 ? Math.round(totalLoc / files.length) : 0;

  if (deeplyNestedFiles.length >= 5) {
    findings.push({
      id: 'maint-deep-nesting-pattern',
      category: 'maintainability',
      severity: 'info',
      title: 'Deep directory hierarchy detected',
      description: `${deeplyNestedFiles.length} files are nested ${DEEP_NESTING_DEPTH_THRESHOLD} or more levels deep in the directory tree.`,
      impact: 'Deeply nested paths can complicate module resolution and import ergonomics.',
      confidence: 'medium',
      deterministicRule: 'RULE_MAINT_DEEP_DIRECTORY_NESTING',
      recommendation: 'Consider flattening deep module hierarchies into feature-oriented packages.',
      evidence: {
        type: 'structure_gap',
        summary: `Deeply nested sample paths: ${deeplyNestedFiles.slice(0, 3).map(f => f.filePath).join(', ')}`,
        references: deeplyNestedFiles.slice(0, 5).map(f => ({ file: f.filePath, metricName: 'Depth', metricValue: f.depth })),
      },
    });
  }

  const status = oversizedFiles.some(f => f.loc >= OVERSIZED_FILE_THRESHOLD_HIGH)
    ? 'warning'
    : oversizedFiles.length > 0
    ? 'neutral'
    : 'healthy';

  const metrics: SignalMetric[] = [
    {
      name: 'Total LOC',
      value: totalLoc,
      status: 'neutral',
      label: 'Lines of Code',
      description: 'Total executable and structured lines across analyzed source files.',
      evidence: `${totalLoc} lines across ${files.length} analyzed files`,
    },
    {
      name: 'Average File Size',
      value: `${averageFileLoc} LOC`,
      status: averageFileLoc > 300 ? 'warning' : 'healthy',
      label: 'Avg File Size',
      description: 'Mean lines of code per analyzed source file.',
      evidence: `Average ${averageFileLoc} lines per file`,
    },
    {
      name: 'Oversized Files',
      value: oversizedFiles.length,
      status: oversizedFiles.length > 0 ? 'warning' : 'healthy',
      label: 'Oversized Files',
      description: `Files exceeding ${OVERSIZED_FILE_THRESHOLD_MEDIUM} lines of code.`,
      evidence: `${oversizedFiles.length} files exceed threshold`,
    },
  ];

  return {
    indicators: {
      status,
      summary: `${files.length} files analyzed (${totalLoc} LOC). ${oversizedFiles.length} oversized files detected.`,
      totalLoc,
      averageFileLoc,
      oversizedFilesCount: oversizedFiles.length,
      oversizedFiles,
      highSymbolDensityFiles,
      deeplyNestedFiles,
      metrics,
    },
    findings,
  };
}
