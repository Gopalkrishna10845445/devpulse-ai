/**
 * Phase 5 — Complexity Signal Analyzer
 *
 * Deterministically analyzes code complexity signals based on measurable static metrics:
 * lines of code, symbol density per file, import/export fan-in, and file dependency breadth.
 */

import { CodebaseIntelligence, FileIntelligence } from '../intelligence/types';
import { ComplexityIndicators, EngineeringFinding, SignalMetric } from './types';

export function analyzeComplexity(
  intelligence: CodebaseIntelligence
): { indicators: ComplexityIndicators; findings: EngineeringFinding[] } {
  const findings: EngineeringFinding[] = [];
  const files: FileIntelligence[] = intelligence.files || [];

  // Sort files by LOC, symbols, and dependents (fan-in)
  const sortedByLoc = [...files].sort((a, b) => b.loc - a.loc);
  const sortedBySymbols = [...files].sort((a, b) => b.symbols.length - a.symbols.length);
  const sortedByDependents = [...files].sort((a, b) => b.dependents.length - a.dependents.length);

  const highestLocFiles = sortedByLoc.slice(0, 5).map(f => ({ filePath: f.filePath, loc: f.loc }));
  const highestSymbolFiles = sortedBySymbols.slice(0, 5).map(f => ({ filePath: f.filePath, symbolCount: f.symbols.length }));
  const highFanInFiles = sortedByDependents.filter(f => f.dependents.length >= 3).slice(0, 5).map(f => ({
    filePath: f.filePath,
    dependentsCount: f.dependents.length,
  }));

  // Identify central nexus files (high LOC + high symbols + high fan-in)
  for (const f of files) {
    if (f.loc >= 300 && f.symbols.length >= 15 && f.dependents.length >= 4) {
      findings.push({
        id: `complexity-nexus-${f.filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'complexity',
        severity: 'medium',
        title: `High complexity nexus: ${f.filePath}`,
        description: `File combines high size (${f.loc} LOC), high symbol count (${f.symbols.length} symbols), and high fan-in (${f.dependents.length} dependent files).`,
        impact: 'This file represents a critical point of complexity in the system. Modifying it has high regression potential across multiple consumers.',
        filePath: f.filePath,
        confidence: 'high',
        deterministicRule: 'RULE_COMPLEXITY_STRUCTURAL_NEXUS',
        recommendation: 'Refactor this module to decouple internal helper utilities from exported consumer interfaces.',
        evidence: {
          type: 'file_metric',
          summary: `${f.filePath} has ${f.loc} LOC, ${f.symbols.length} symbols, and is imported by ${f.dependents.length} files.`,
          references: [
            { file: f.filePath, metricName: 'LOC', metricValue: f.loc },
            { file: f.filePath, metricName: 'Symbols', metricValue: f.symbols.length },
            { file: f.filePath, metricName: 'Dependents', metricValue: f.dependents.length },
          ],
          data: { loc: f.loc, symbolsCount: f.symbols.length, dependentsCount: f.dependents.length },
        },
      });
    }
  }

  const status = findings.length > 0 ? 'warning' : 'healthy';

  const metrics: SignalMetric[] = [
    {
      name: 'Max File LOC',
      value: highestLocFiles[0] ? `${highestLocFiles[0].loc} LOC` : '0 LOC',
      status: (highestLocFiles[0]?.loc || 0) > 500 ? 'warning' : 'healthy',
      label: 'Max File Size',
      description: 'Largest single source file in the repository.',
      evidence: highestLocFiles[0] ? `${highestLocFiles[0].filePath} (${highestLocFiles[0].loc} LOC)` : 'N/A',
    },
    {
      name: 'Max Symbol Density',
      value: highestSymbolFiles[0] ? `${highestSymbolFiles[0].symbolCount} symbols` : '0',
      status: (highestSymbolFiles[0]?.symbolCount || 0) > 20 ? 'warning' : 'healthy',
      label: 'Max Symbol Density',
      description: 'Highest count of symbols declared in a single file.',
      evidence: highestSymbolFiles[0] ? `${highestSymbolFiles[0].filePath} (${highestSymbolFiles[0].symbolCount} symbols)` : 'N/A',
    },
    {
      name: 'Max File Fan-In',
      value: highFanInFiles[0] ? `${highFanInFiles[0].dependentsCount} dependents` : '0',
      status: 'neutral',
      label: 'Max Fan-In',
      description: 'File with the most incoming internal import references.',
      evidence: highFanInFiles[0] ? `${highFanInFiles[0].filePath} imported by ${highFanInFiles[0].dependentsCount} files` : 'N/A',
    },
  ];

  return {
    indicators: {
      status,
      summary: `Top file sizes range up to ${highestLocFiles[0]?.loc || 0} LOC. ${findings.length} high-complexity nexus file(s) identified.`,
      highestLocFiles,
      highestSymbolFiles,
      highFanInFiles,
      metrics,
    },
    findings,
  };
}
