/**
 * Phase 5 — Coupling Signal Analyzer
 *
 * Deterministically analyzes module coupling density, tight module pairs,
 * bidirectional import coupling, and module dependency graphs.
 */

import { CodebaseIntelligence, ModuleRelationship } from '../intelligence/types';
import { CouplingIndicators, EngineeringFinding, SignalMetric } from './types';

const TIGHT_COUPLING_IMPORT_THRESHOLD = 8;

export function analyzeCoupling(
  intelligence: CodebaseIntelligence
): { indicators: CouplingIndicators; findings: EngineeringFinding[] } {
  const findings: EngineeringFinding[] = [];
  const relationships: ModuleRelationship[] = intelligence.relationships || [];

  const tightCouplingPairs: { fromModule: string; toModule: string; importCount: number }[] = [];
  const relMap = new Map<string, number>();

  for (const rel of relationships) {
    const key = `${rel.fromModule}->${rel.toModule}`;
    relMap.set(key, rel.importCount);

    if (rel.importCount >= TIGHT_COUPLING_IMPORT_THRESHOLD) {
      tightCouplingPairs.push({
        fromModule: rel.fromModule,
        toModule: rel.toModule,
        importCount: rel.importCount,
      });

      findings.push({
        id: `coupling-tight-${rel.fromModule}-${rel.toModule}`.replace(/[^a-zA-Z0-9]/g, '_'),
        category: 'coupling',
        severity: 'medium',
        title: `Tight inter-module coupling: ${rel.fromModule} → ${rel.toModule}`,
        description: `Module "${rel.fromModule}" imports "${rel.toModule}" ${rel.importCount} times across multiple files.`,
        impact: 'High import frequency between specific modules indicates heavy functional interdependence.',
        confidence: 'high',
        deterministicRule: 'RULE_COUPLING_TIGHT_PAIR_THRESHOLD',
        recommendation: 'Encapsulate the relationship using a consolidated facade or service interface.',
        relatedModules: [rel.fromModule, rel.toModule],
        evidence: {
          type: 'dependency_chain',
          summary: `${rel.importCount} imports from ${rel.fromModule} to ${rel.toModule}: ${rel.sampleImports.slice(0, 3).join(', ')}`,
          references: [{ fromModule: rel.fromModule, toModule: rel.toModule, metricName: 'ImportCount', metricValue: rel.importCount }],
          data: { importCount: rel.importCount, sampleImports: rel.sampleImports },
        },
      });
    }
  }

  // Detect bidirectional coupling (A -> B and B -> A)
  const bidirectionalCoupling: { moduleA: string; moduleB: string; countAB: number; countBA: number }[] = [];
  const checkedPairs = new Set<string>();

  for (const rel of relationships) {
    const reverseKey = `${rel.toModule}->${rel.fromModule}`;
    const reverseCount = relMap.get(reverseKey);

    if (reverseCount && rel.fromModule !== rel.toModule) {
      const pairKey = [rel.fromModule, rel.toModule].sort().join('<->');
      if (!checkedPairs.has(pairKey)) {
        checkedPairs.add(pairKey);
        bidirectionalCoupling.push({
          moduleA: rel.fromModule,
          moduleB: rel.toModule,
          countAB: rel.importCount,
          countBA: reverseCount,
        });

        findings.push({
          id: `coupling-bidirectional-${pairKey}`.replace(/[^a-zA-Z0-9]/g, '_'),
          category: 'coupling',
          severity: 'high',
          title: `Bidirectional module dependency: ${rel.fromModule} ⇄ ${rel.toModule}`,
          description: `Mutual dependency detected: "${rel.fromModule}" imports "${rel.toModule}" (${rel.importCount}x), and "${rel.toModule}" imports "${rel.fromModule}" (${reverseCount}x).`,
          impact: 'Bidirectional module coupling creates co-dependent tangles that prevent separate testing or packaging.',
          confidence: 'high',
          deterministicRule: 'RULE_COUPLING_BIDIRECTIONAL_PAIR',
          recommendation: 'Extract common types and interfaces to an underlying shared module to ensure one-way dependency flow.',
          relatedModules: [rel.fromModule, rel.toModule],
          evidence: {
            type: 'dependency_chain',
            summary: `Mutual imports: ${rel.fromModule} (${rel.importCount} imports) ⇄ ${rel.toModule} (${reverseCount} imports).`,
            references: [
              { fromModule: rel.fromModule, toModule: rel.toModule, metricName: 'AB_Imports', metricValue: rel.importCount },
              { fromModule: rel.toModule, toModule: rel.fromModule, metricName: 'BA_Imports', metricValue: reverseCount },
            ],
            data: { countAB: rel.importCount, countBA: reverseCount },
          },
        });
      }
    }
  }

  const status = bidirectionalCoupling.length > 0 ? 'warning' : tightCouplingPairs.length > 0 ? 'neutral' : 'healthy';

  const metrics: SignalMetric[] = [
    {
      name: 'Module Relationships',
      value: relationships.length,
      status: 'neutral',
      label: 'Inter-Module Edges',
      description: 'Total directed dependency relationships between distinct modules.',
      evidence: `${relationships.length} relationship edges mapped`,
    },
    {
      name: 'Tight Coupling Pairs',
      value: tightCouplingPairs.length,
      status: tightCouplingPairs.length > 0 ? 'warning' : 'healthy',
      label: 'Tight Pairs',
      description: `Module pairs with ≥ ${TIGHT_COUPLING_IMPORT_THRESHOLD} import linkages.`,
      evidence: tightCouplingPairs.length === 0 ? 'No excessively coupled module pairs' : `${tightCouplingPairs.length} pairs exceed threshold`,
    },
    {
      name: 'Bidirectional Loops',
      value: bidirectionalCoupling.length,
      status: bidirectionalCoupling.length === 0 ? 'healthy' : 'critical',
      label: 'Bidirectional Loops',
      description: 'Module pairs that import each other bidirectionally.',
      evidence: bidirectionalCoupling.length === 0 ? 'Zero bidirectional module couplings' : `${bidirectionalCoupling.length} mutual coupling pairs`,
    },
  ];

  return {
    indicators: {
      status,
      summary: `${relationships.length} module relationships analyzed. ${tightCouplingPairs.length} tight pair(s), ${bidirectionalCoupling.length} bidirectional loop(s).`,
      totalRelationships: relationships.length,
      tightCouplingPairs,
      bidirectionalCoupling,
      metrics,
    },
    findings,
  };
}
