/**
 * Phase 5 — Dependency Signal Analyzer
 *
 * Deterministically analyzes repository package manifests, dependency distribution
 * (runtime vs dev), dependency volume, and multi-ecosystem presence using Phase 2 data.
 *
 * NOTE: Security vulnerability scanning belongs to Phase 6.
 */

import { RepositoryIndex, RepositoryManifest } from '../repository/types';
import { DependencyIndicators, EngineeringFinding, SignalMetric } from './types';

const HIGH_DEPENDENCY_COUNT_THRESHOLD = 50;

export function analyzeDependencies(
  repoIndex: RepositoryIndex
): { indicators: DependencyIndicators; findings: EngineeringFinding[] } {
  const findings: EngineeringFinding[] = [];
  const manifests: RepositoryManifest[] = repoIndex.manifests || [];

  let directCount = 0;
  let devCount = 0;
  const manifestNames: string[] = [];
  const ecosystems = new Set<string>();

  for (const m of manifests) {
    manifestNames.push(m.path);
    ecosystems.add(m.ecosystem);

    directCount += m.dependencyCount || (m.dependencies ? m.dependencies.length : 0);
    devCount += m.devDependencyCount || (m.devDependencies ? m.devDependencies.length : 0);
  }

  const totalDependencies = directCount + devCount;
  const multiEcosystemDetected = ecosystems.size > 1;

  if (totalDependencies > HIGH_DEPENDENCY_COUNT_THRESHOLD) {
    findings.push({
      id: 'dep-high-count',
      category: 'dependencies',
      severity: 'low',
      title: `High external dependency count (${totalDependencies} dependencies)`,
      description: `The repository declares ${totalDependencies} direct and development dependencies across ${manifests.length} manifest(s).`,
      impact: 'Large dependency trees increase supply chain exposure, bundle weight, and maintenance overhead.',
      confidence: 'high',
      deterministicRule: 'RULE_DEP_HIGH_COUNT_THRESHOLD',
      recommendation: 'Audit dependencies to prune unused libraries or consolidate overlapping packages.',
      evidence: {
        type: 'file_metric',
        summary: `${directCount} production dependencies, ${devCount} dev dependencies across ${manifests.length} manifest(s).`,
        references: manifests.map(m => ({ file: m.path, metricName: 'DepCount', metricValue: (m.dependencyCount || 0) + (m.devDependencyCount || 0) })),
        data: { directCount, devCount, ecosystems: Array.from(ecosystems) },
      },
    });
  }

  if (multiEcosystemDetected) {
    findings.push({
      id: 'dep-multi-ecosystem',
      category: 'dependencies',
      severity: 'info',
      title: `Multi-ecosystem dependency manifests detected (${Array.from(ecosystems).join(', ')})`,
      description: `Manifests from multiple package ecosystems were detected: ${Array.from(ecosystems).join(', ')}.`,
      impact: 'Multi-language or multi-ecosystem repositories require distinct build toolchains and package managers.',
      confidence: 'high',
      deterministicRule: 'RULE_DEP_MULTI_ECOSYSTEM',
      recommendation: 'Ensure CI workflows execute build and dependency verification for all active ecosystems.',
      evidence: {
        type: 'structure_gap',
        summary: `Ecosystems detected: ${Array.from(ecosystems).join(', ')} in ${manifestNames.join(', ')}`,
        references: manifests.map(m => ({ file: m.path })),
      },
    });
  }

  if (manifests.length === 0 && (repoIndex.files?.length || 0) > 3) {
    findings.push({
      id: 'dep-no-manifest-detected',
      category: 'dependencies',
      severity: 'info',
      title: 'No standard dependency manifest detected',
      description: 'No known package manifest (e.g. package.json, requirements.txt, Cargo.toml, go.mod) was found.',
      impact: 'External dependencies cannot be deterministically resolved without a manifest.',
      confidence: 'medium',
      deterministicRule: 'RULE_DEP_NO_MANIFEST',
      recommendation: 'Add a standard package manifest defining required project dependencies.',
      evidence: {
        type: 'structure_gap',
        summary: 'Zero recognized dependency manifests found in repository root or submodules.',
        references: [],
      },
    });
  }

  const status = totalDependencies > 80 ? 'warning' : 'healthy';

  const metrics: SignalMetric[] = [
    {
      name: 'Manifests Found',
      value: manifests.length,
      status: manifests.length > 0 ? 'healthy' : 'neutral',
      label: 'Manifests',
      description: 'Number of recognized dependency manifests.',
      evidence: manifestNames.length > 0 ? manifestNames.join(', ') : 'No manifests found',
    },
    {
      name: 'Total Dependencies',
      value: totalDependencies,
      status: totalDependencies > HIGH_DEPENDENCY_COUNT_THRESHOLD ? 'warning' : 'healthy',
      label: 'Total Dependencies',
      description: 'Count of external libraries declared across all manifests.',
      evidence: `${directCount} runtime + ${devCount} dev dependencies`,
    },
    {
      name: 'Runtime Dependencies',
      value: directCount,
      status: 'healthy',
      label: 'Runtime Dependencies',
      description: 'Production runtime packages required for execution.',
      evidence: `${directCount} production dependencies`,
    },
    {
      name: 'Dev Dependencies',
      value: devCount,
      status: 'healthy',
      label: 'Dev Dependencies',
      description: 'Development, build, linting, and testing dependencies.',
      evidence: `${devCount} development dependencies`,
    },
  ];

  return {
    indicators: {
      status,
      summary: `${totalDependencies} dependencies across ${manifests.length} manifest(s) (${directCount} runtime, ${devCount} dev).`,
      manifestsFound: manifestNames,
      totalDependencies,
      directDependenciesCount: directCount,
      devDependenciesCount: devCount,
      multiEcosystemDetected,
      metrics,
    },
    findings,
  };
}
