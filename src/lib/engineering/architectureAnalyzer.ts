/**
 * Phase 5 — Architecture Signal Analyzer
 *
 * Evaluates architectural structure, layer boundary adherence, circular dependency
 * loops, high-fanout modules, and structural isolation using Phase 3 intelligence.
 */

import { CodebaseIntelligence, ModuleRelationship } from '../intelligence/types';
import { RepositoryIndex } from '../repository/types';
import { ArchitectureIndicators, EngineeringFinding, SignalMetric } from './types';

export function analyzeArchitecture(
  repoIndex: RepositoryIndex,
  intelligence: CodebaseIntelligence
): { indicators: ArchitectureIndicators; findings: EngineeringFinding[] } {
  const findings: EngineeringFinding[] = [];
  const relationships: ModuleRelationship[] = intelligence.relationships || [];
  const layers = intelligence.architecture?.layers || [];

  // 1. Build Adjacency Graph for Cycle Detection & Coupling
  const adj = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const allModules = new Set<string>();

  for (const rel of relationships) {
    allModules.add(rel.fromModule);
    allModules.add(rel.toModule);

    if (!adj.has(rel.fromModule)) adj.set(rel.fromModule, new Set());
    adj.get(rel.fromModule)!.add(rel.toModule);

    outDegree.set(rel.fromModule, (outDegree.get(rel.fromModule) || 0) + 1);
    inDegree.set(rel.toModule, (inDegree.get(rel.toModule) || 0) + 1);
  }

  // 2. Detect Circular Dependencies (Cycle Detection via DFS)
  const circularDependencies: { cycle: string[]; evidence: string }[] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const detectedCycleSignatures = new Set<string>();

  function dfs(curr: string, path: string[]) {
    visited.add(curr);
    recStack.add(curr);
    path.push(curr);

    const neighbors = adj.get(curr) || new Set();
    for (const neighbor of Array.from(neighbors)) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, path);
      } else if (recStack.has(neighbor)) {
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cycle = path.slice(cycleStartIndex);
          cycle.push(neighbor); // Complete the visual loop

          // Normalize signature to avoid duplicate cycles
          const baseNodes = cycle.slice(0, -1);
          const minNode = baseNodes.slice().sort()[0];
          const minIdx = baseNodes.indexOf(minNode);
          const normalized = [...baseNodes.slice(minIdx), ...baseNodes.slice(0, minIdx)].join(' -> ');

          if (!detectedCycleSignatures.has(normalized)) {
            detectedCycleSignatures.add(normalized);
            circularDependencies.push({
              cycle,
              evidence: cycle.join(' → '),
            });
          }
        }
      }
    }

    path.pop();
    recStack.delete(curr);
  }

  for (const mod of Array.from(allModules)) {
    if (!visited.has(mod)) {
      dfs(mod, []);
    }
  }

  for (const circ of circularDependencies) {
    findings.push({
      id: `arch-circular-${circ.cycle.slice(0, -1).join('-').replace(/[^a-zA-Z0-9]/g, '_')}`,
      category: 'architecture',
      severity: 'high',
      title: `Circular module dependency: ${circ.cycle[0]} ↔ ${circ.cycle[1] || ''}`,
      description: `A circular dependency chain was detected between modules: ${circ.evidence}.`,
      impact: 'Circular dependencies create tight coupling, complicate refactoring, and can cause unpredictable runtime initialization ordering bugs.',
      confidence: 'high',
      deterministicRule: 'RULE_ARCH_CIRCULAR_DEPENDENCY',
      recommendation: 'Break the cycle by extracting shared interfaces or shared utilities into an independent lower-level module.',
      relatedModules: circ.cycle,
      evidence: {
        type: 'dependency_chain',
        summary: `Cycle path: ${circ.evidence}`,
        references: circ.cycle.map((mod, idx) => ({
          fromModule: mod,
          toModule: circ.cycle[(idx + 1) % circ.cycle.length],
        })),
        data: { cycle: circ.cycle },
      },
    });
  }

  // 3. Layer Boundary Violations Check
  // E.g. Presentation layer directly importing Database / ORM layer bypassing Services
  const layerViolations: { fromModule: string; toModule: string; reason: string }[] = [];

  for (const rel of relationships) {
    const fromLower = rel.fromModule.toLowerCase();
    const toLower = rel.toModule.toLowerCase();

    // UI/Component directly importing Database/Repo
    if (
      (fromLower.includes('component') || fromLower.includes('ui') || fromLower.includes('view') || fromLower.includes('page')) &&
      (toLower.includes('db') || toLower.includes('database') || toLower.includes('sql') || toLower.includes('prisma') || toLower.includes('repository'))
    ) {
      layerViolations.push({
        fromModule: rel.fromModule,
        toModule: rel.toModule,
        reason: 'UI layer directly couples to database/persistence layer bypassing service or API tier.',
      });

      findings.push({
        id: `arch-violation-${rel.fromModule}-${rel.toModule}`.replace(/[^a-zA-Z0-9]/g, '_'),
        category: 'architecture',
        severity: 'medium',
        title: `Architectural layer boundary bypass: ${rel.fromModule} → ${rel.toModule}`,
        description: `Module "${rel.fromModule}" directly imports persistence module "${rel.toModule}" bypassing the service or abstraction layer.`,
        impact: 'Violating separation of concerns makes UI components non-reusable and tightly binds presentation to database schemas.',
        confidence: 'high',
        deterministicRule: 'RULE_ARCH_LAYER_BYPASS_UI_DB',
        recommendation: 'Route data access through dedicated service or API route abstractions.',
        relatedModules: [rel.fromModule, rel.toModule],
        evidence: {
          type: 'dependency_chain',
          summary: `Direct imports detected from UI to persistence layer (${rel.importCount} imports).`,
          references: [{ fromModule: rel.fromModule, toModule: rel.toModule }],
          data: { sampleImports: rel.sampleImports },
        },
      });
    }
  }

  // 4. High Fan-Out Utility Modules
  const highFanOutModules: { moduleName: string; dependentsCount: number }[] = [];
  for (const [mod, inCount] of Array.from(inDegree.entries())) {
    if (inCount >= 6 && inCount > (allModules.size * 0.6)) {
      highFanOutModules.push({ moduleName: mod, dependentsCount: inCount });
      findings.push({
        id: `arch-fanout-${mod}`.replace(/[^a-zA-Z0-9]/g, '_'),
        category: 'architecture',
        severity: 'low',
        title: `High fan-in module: ${mod}`,
        description: `Module "${mod}" is imported by ${inCount} modules (${Math.round((inCount / allModules.size) * 100)}% of codebase).`,
        impact: 'Changes to this core module carry broad ripple effects across the entire application.',
        confidence: 'high',
        deterministicRule: 'RULE_ARCH_HIGH_FAN_IN',
        recommendation: 'Keep API surface of this module minimal, stable, and rigorously covered by unit tests.',
        relatedModules: [mod],
        evidence: {
          type: 'dependency_chain',
          summary: `Imported by ${inCount} separate modules.`,
          references: [{ toModule: mod, metricName: 'DependentsCount', metricValue: inCount }],
        },
      });
    }
  }

  // 5. Isolated Modules (Zero incoming and zero outgoing internal imports)
  const isolatedModules: string[] = [];
  for (const layer of layers) {
    if (allModules.has(layer.name) && (inDegree.get(layer.name) || 0) === 0 && (outDegree.get(layer.name) || 0) === 0) {
      isolatedModules.push(layer.name);
    }
  }

  const modularityScore = intelligence.architecture?.metrics?.modularityScore ?? 80;
  const couplingRatio = intelligence.architecture?.metrics?.internalCouplingScore ?? 25;

  const status = circularDependencies.length > 0
    ? 'warning'
    : layerViolations.length > 0
    ? 'warning'
    : 'healthy';

  const metrics: SignalMetric[] = [
    {
      name: 'Architecture Pattern',
      value: intelligence.architecture?.pattern || 'Modular Architecture',
      status: 'healthy',
      label: 'Pattern',
      description: 'Identified structural architecture pattern.',
      evidence: intelligence.architecture?.summary || 'Standard modular pattern',
    },
    {
      name: 'Modularity Score',
      value: `${modularityScore}/100`,
      status: modularityScore >= 70 ? 'healthy' : 'warning',
      label: 'Modularity',
      description: 'Metric indicating how well code is organized into distinct, decoupled modules.',
      evidence: `${layers.length} structural tiers defined`,
    },
    {
      name: 'Circular Dependencies',
      value: circularDependencies.length,
      status: circularDependencies.length === 0 ? 'healthy' : 'critical',
      label: 'Circular Loops',
      description: 'Number of closed loop dependency chains between modules.',
      evidence: circularDependencies.length === 0 ? 'No circular dependencies detected' : `${circularDependencies.length} cycles detected`,
    },
    {
      name: 'Layer Violations',
      value: layerViolations.length,
      status: layerViolations.length === 0 ? 'healthy' : 'warning',
      label: 'Layer Violations',
      description: 'Direct imports that bypass architectural tiers (e.g. UI directly to DB).',
      evidence: layerViolations.length === 0 ? 'All layer boundaries respected' : `${layerViolations.length} boundary violations`,
    },
  ];

  return {
    indicators: {
      status,
      summary: `Pattern: ${intelligence.architecture?.pattern || 'Modular'}. ${circularDependencies.length} circular loops and ${layerViolations.length} layer violations detected.`,
      detectedPattern: intelligence.architecture?.pattern || 'Modular Layered Architecture',
      modularityScore,
      couplingRatio,
      circularDependencies,
      layerViolations,
      highFanOutModules,
      isolatedModules,
      metrics,
    },
    findings,
  };
}
