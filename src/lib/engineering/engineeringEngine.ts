/**
 * Phase 5 — Engineering Intelligence Engine
 *
 * Central deterministic orchestrator for Phase 5.
 * Ingests Phase 1–4 intelligence representations, coordinates all specialized signal
 * analyzers, aggregates findings, and produces the unified EngineeringHealthReport.
 */

import { CodebaseIntelligence } from '../intelligence/types';
import { RepositoryIndex, RepositoryRef } from '../repository/types';
import { GitHubTelemetry } from '../types';
import { analyzeActivity } from './activityAnalyzer';
import { analyzeArchitecture } from './architectureAnalyzer';
import { analyzeComplexity } from './complexityAnalyzer';
import { analyzeCoupling } from './couplingAnalyzer';
import { analyzeDependencies } from './dependencyAnalyzer';
import { analyzeDocumentation } from './documentationAnalyzer';
import { detectHotspots } from './hotspotDetector';
import { analyzeMaintainability } from './maintainabilityAnalyzer';
import { analyzeTesting } from './testingAnalyzer';
import {
  EngineeringFinding,
  EngineeringHealthReport,
  EngineeringHealthSummary,
  FindingSeverity,
  SignalStatus,
} from './types';

export interface EngineeringAnalysisOptions {
  repoIndex: RepositoryIndex;
  intelligence: CodebaseIntelligence;
  github?: GitHubTelemetry | null;
}

export async function analyzeEngineeringHealth(
  options: EngineeringAnalysisOptions
): Promise<EngineeringHealthReport> {
  const startTime = Date.now();
  const { repoIndex, intelligence, github } = options;

  const repository: RepositoryRef = intelligence.repository || repoIndex.repository || {
    id: 'unknown/repository',
    fullName: 'unknown/repository',
    name: 'repository',
    owner: 'unknown',
    defaultBranch: 'main',
  };

  // 1. Run all individual deterministic signal analyzers
  const maintRes = analyzeMaintainability(repoIndex, intelligence);
  const archRes = analyzeArchitecture(repoIndex, intelligence);
  const testRes = analyzeTesting(repoIndex, intelligence);
  const depRes = analyzeDependencies(repoIndex);
  const docRes = analyzeDocumentation(repoIndex, intelligence);
  const compRes = analyzeComplexity(intelligence);
  const coupRes = analyzeCoupling(intelligence);
  const actRes = analyzeActivity(github);

  // 2. Aggregate & deduplicate all findings
  const rawFindings: EngineeringFinding[] = [
    ...maintRes.findings,
    ...archRes.findings,
    ...testRes.findings,
    ...depRes.findings,
    ...docRes.findings,
    ...compRes.findings,
    ...coupRes.findings,
    ...actRes.findings,
  ];

  const seenIds = new Set<string>();
  const findings: EngineeringFinding[] = [];
  for (const f of rawFindings) {
    if (!seenIds.has(f.id)) {
      seenIds.add(f.id);
      findings.push(f);
    }
  }

  // Sort findings by severity: high -> medium -> low -> info
  const severityRank: Record<FindingSeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
    info: 3,
  };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  // 3. Detect hotspots
  const hotspots = detectHotspots(intelligence, findings);

  // 4. Compute findings breakdown
  const findingsBySeverity = {
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
    info: findings.filter(f => f.severity === 'info').length,
  };

  // 5. Determine overall health status
  let overallStatus: SignalStatus = 'healthy';
  if (findingsBySeverity.high > 0 || archRes.indicators.status === 'warning') {
    overallStatus = 'warning';
  } else if (findingsBySeverity.medium > 3) {
    overallStatus = 'neutral';
  }

  // 6. Compile key risks and health highlights
  const keyRisks: string[] = [];
  if (archRes.indicators.circularDependencies.length > 0) {
    keyRisks.push(`${archRes.indicators.circularDependencies.length} circular module dependency loop(s) detected.`);
  }
  if (testRes.indicators.totalTestFiles === 0 && (repoIndex.files?.length || 0) > 2) {
    keyRisks.push('Zero automated test files detected in repository source tree.');
  }
  if (maintRes.indicators.oversizedFilesCount > 0) {
    keyRisks.push(`${maintRes.indicators.oversizedFilesCount} oversized source file(s) exceeding maintainability thresholds.`);
  }
  if (coupRes.indicators.bidirectionalCoupling.length > 0) {
    keyRisks.push(`${coupRes.indicators.bidirectionalCoupling.length} bidirectional module coupling pair(s).`);
  }
  if (!docRes.indicators.hasReadme) {
    keyRisks.push('Missing root README documentation.');
  }

  const healthHighlights: string[] = [];
  if (archRes.indicators.circularDependencies.length === 0) {
    healthHighlights.push('Clean unidirectional module dependencies (zero circular loops).');
  }
  if (testRes.indicators.totalTestFiles > 0) {
    healthHighlights.push(`${testRes.indicators.totalTestFiles} automated test files identified (${(testRes.indicators.testToFileRatio * 100).toFixed(0)}% test/source ratio).`);
  }
  if (docRes.indicators.hasReadme) {
    healthHighlights.push(`Comprehensive root documentation (~${docRes.indicators.readmeSizeLines} lines).`);
  }
  if (archRes.indicators.modularityScore >= 70) {
    healthHighlights.push(`High modularity score (${archRes.indicators.modularityScore}/100) with well-separated structural tiers.`);
  }

  const summary: EngineeringHealthSummary = {
    repositoryId: repository.fullName || repository.name || 'unknown/repository',
    commitSha: repository.defaultBranch || 'main',
    analyzedAt: new Date().toISOString(),
    overallStatus,
    totalFindingsCount: findings.length,
    findingsBySeverity,
    keyRisks,
    healthHighlights,
  };

  return {
    repository,
    summary,
    maintainability: maintRes.indicators,
    architecture: archRes.indicators,
    testing: testRes.indicators,
    dependencies: depRes.indicators,
    documentation: docRes.indicators,
    complexity: compRes.indicators,
    coupling: coupRes.indicators,
    activity: actRes.indicators,
    hotspots,
    findings,
    durationMs: Date.now() - startTime,
  };
}
