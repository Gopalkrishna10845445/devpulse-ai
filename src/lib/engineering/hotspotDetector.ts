/**
 * Phase 5 — Deterministic Hotspot Detector
 *
 * Combines structural size, symbol density, incoming coupling (fan-in),
 * and missing test presence to rank codebase engineering hotspots deterministically.
 *
 * NOTE: Never uses subjective or randomized scoring.
 */

import { CodebaseIntelligence, FileIntelligence } from '../intelligence/types';
import { EngineeringFinding, EngineeringHotspot, FindingSeverity } from './types';

export function detectHotspots(
  intelligence: CodebaseIntelligence,
  allFindings: EngineeringFinding[]
): EngineeringHotspot[] {
  const files: FileIntelligence[] = intelligence.files || [];
  const layers = intelligence.architecture?.layers || [];
  const hotspots: EngineeringHotspot[] = [];

  // Map findings by file path
  const findingsByFile = new Map<string, EngineeringFinding[]>();
  for (const f of allFindings) {
    if (f.filePath) {
      if (!findingsByFile.has(f.filePath)) findingsByFile.set(f.filePath, []);
      findingsByFile.get(f.filePath)!.push(f);
    }
  }

  // Find untested module paths
  const testFiles = files.filter(f => f.role === 'test' || f.filePath.includes('.test.') || f.filePath.includes('__tests__'));
  const untestedLayerPaths = new Set<string>();
  for (const layer of layers) {
    const hasTests = testFiles.some(tf => tf.filePath.toLowerCase().includes(layer.path.toLowerCase()));
    if (!hasTests) {
      untestedLayerPaths.add(layer.path.toLowerCase());
    }
  }

  for (const file of files) {
    // Skip test files themselves from being flagged as hotspots
    if (file.role === 'test' || file.filePath.includes('.test.') || file.filePath.includes('__tests__')) {
      continue;
    }

    const signals: string[] = [];
    let riskScore = 0;

    // 1. Size score (up to 30 pts)
    if (file.loc >= 700) {
      riskScore += 30;
      signals.push(`Extreme size (${file.loc} LOC)`);
    } else if (file.loc >= 400) {
      riskScore += 20;
      signals.push(`Oversized (${file.loc} LOC)`);
    } else if (file.loc >= 250) {
      riskScore += 10;
      signals.push(`Moderate size (${file.loc} LOC)`);
    }

    // 2. Symbol density score (up to 25 pts)
    if (file.symbols.length >= 25) {
      riskScore += 25;
      signals.push(`High symbol count (${file.symbols.length} symbols)`);
    } else if (file.symbols.length >= 15) {
      riskScore += 15;
      signals.push(`Moderate symbol count (${file.symbols.length} symbols)`);
    }

    // 3. Coupling Fan-In score (up to 25 pts)
    if (file.dependents.length >= 6) {
      riskScore += 25;
      signals.push(`High consumer fan-in (${file.dependents.length} dependent files)`);
    } else if (file.dependents.length >= 3) {
      riskScore += 15;
      signals.push(`Coupled consumer base (${file.dependents.length} dependent files)`);
    }

    // 4. Untested module presence (up to 20 pts)
    const isUntested = Array.from(untestedLayerPaths).some(p => file.filePath.toLowerCase().includes(p));
    if (isUntested && file.loc >= 100) {
      riskScore += 20;
      signals.push('Module lacks co-located test files');
    }

    // Cap at 100
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Only register as hotspot if riskScore exceeds threshold
    if (riskScore >= 35) {
      let severity: FindingSeverity = 'low';
      if (riskScore >= 75) severity = 'high';
      else if (riskScore >= 50) severity = 'medium';

      const related = (findingsByFile.get(file.filePath) || []).map(f => f.title);

      hotspots.push({
        id: `hotspot-${file.filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        type: 'file',
        name: file.filePath.split('/').pop() || file.filePath,
        filePath: file.filePath,
        riskScore,
        severity,
        signals,
        evidence: `${file.filePath}: ${file.loc} LOC, ${file.symbols.length} symbols, ${file.dependents.length} incoming imports.`,
        relatedFindings: related,
      });
    }
  }

  // Sort descending by deterministic risk score
  hotspots.sort((a, b) => b.riskScore - a.riskScore);

  return hotspots.slice(0, 10);
}
