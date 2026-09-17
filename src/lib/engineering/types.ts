/**
 * Phase 5 — Engineering Intelligence Types
 *
 * Defines the deterministic, evidence-backed engineering health report,
 * categorized indicators, structured finding models, severity scales,
 * hotspot definitions, and coupling metrics.
 */

import { ArchitecturePattern, FileRole, SymbolKind } from '../intelligence/types';
import { RepositoryRef } from '../repository/types';

export type FindingSeverity = 'high' | 'medium' | 'low' | 'info';

export type FindingCategory =
  | 'maintainability'
  | 'architecture'
  | 'testing'
  | 'dependencies'
  | 'documentation'
  | 'complexity'
  | 'coupling'
  | 'activity';

export type SignalStatus = 'healthy' | 'warning' | 'critical' | 'neutral' | 'unavailable';

export interface SignalMetric<T = number | string | boolean> {
  name: string;
  value: T | null;
  status: SignalStatus;
  label: string;
  description: string;
  evidence?: string;
  unavailableReason?: string;
}

// ─── Finding & Evidence Models ──────────────────────────────────────────────────

export interface EvidenceReference {
  file?: string;
  line?: number;
  lineRange?: string;
  symbol?: string;
  fromModule?: string;
  toModule?: string;
  metricName?: string;
  metricValue?: number | string;
}

export interface FindingEvidence {
  type: 'file_metric' | 'dependency_chain' | 'symbol_metric' | 'structure_gap' | 'git_telemetry';
  summary: string;
  references: EvidenceReference[];
  data?: Record<string, any>;
}

export interface EngineeringFinding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  impact: string;
  evidence: FindingEvidence;
  filePath?: string;
  symbol?: string;
  lineRange?: string;
  relatedModules?: string[];
  confidence: 'high' | 'medium' | 'low';
  deterministicRule: string;
  recommendation: string;
}

// ─── Categorized Indicator Models ──────────────────────────────────────────────

export interface MaintainabilityIndicators {
  status: SignalStatus;
  summary: string;
  totalLoc: number;
  averageFileLoc: number;
  oversizedFilesCount: number; // Files > 400 LOC
  oversizedFiles: { filePath: string; loc: number; reason: string }[];
  highSymbolDensityFiles: { filePath: string; symbolCount: number }[];
  deeplyNestedFiles: { filePath: string; depth: number }[];
  metrics: SignalMetric[];
}

export interface ArchitectureIndicators {
  status: SignalStatus;
  summary: string;
  detectedPattern: ArchitecturePattern;
  modularityScore: number;
  couplingRatio: number;
  circularDependencies: { cycle: string[]; evidence: string }[];
  layerViolations: { fromModule: string; toModule: string; reason: string }[];
  highFanOutModules: { moduleName: string; dependentsCount: number }[];
  isolatedModules: string[];
  metrics: SignalMetric[];
}

export interface TestingIndicators {
  status: SignalStatus;
  summary: string;
  totalTestFiles: number;
  totalSourceFiles: number;
  testToFileRatio: number;
  testedModules: string[];
  untestedModules: string[];
  testDirectoryPresent: boolean;
  metrics: SignalMetric[];
}

export interface DependencyIndicators {
  status: SignalStatus;
  summary: string;
  manifestsFound: string[];
  totalDependencies: number;
  directDependenciesCount: number;
  devDependenciesCount: number;
  multiEcosystemDetected: boolean;
  metrics: SignalMetric[];
}

export interface DocumentationIndicators {
  status: SignalStatus;
  summary: string;
  hasReadme: boolean;
  readmeSizeLines: number;
  hasContributingGuide: boolean;
  hasLicense: boolean;
  hasArchitectureDocs: boolean;
  undocumentedModules: string[];
  metrics: SignalMetric[];
}

export interface ComplexityIndicators {
  status: SignalStatus;
  summary: string;
  highestLocFiles: { filePath: string; loc: number }[];
  highestSymbolFiles: { filePath: string; symbolCount: number }[];
  highFanInFiles: { filePath: string; dependentsCount: number }[];
  metrics: SignalMetric[];
}

export interface CouplingIndicators {
  status: SignalStatus;
  summary: string;
  totalRelationships: number;
  tightCouplingPairs: { fromModule: string; toModule: string; importCount: number }[];
  bidirectionalCoupling: { moduleA: string; moduleB: string; countAB: number; countBA: number }[];
  metrics: SignalMetric[];
}

export interface ActivityIndicators {
  status: SignalStatus;
  summary: string;
  isAvailable: boolean;
  unavailableReason?: string;
  activeCommitStreakDays?: number | null;
  recentCommitVelocity?: number | null;
  commitCount30Days?: number | null;
  prMergeRatio?: number | null;
  metrics: SignalMetric[];
}

// ─── Hotspots Model ────────────────────────────────────────────────────────────

export interface EngineeringHotspot {
  id: string;
  type: 'file' | 'module' | 'symbol';
  name: string;
  filePath?: string;
  riskScore: number; // 0 to 100 deterministic risk ranking
  severity: FindingSeverity;
  signals: string[];
  evidence: string;
  relatedFindings: string[];
}

// ─── Root Engineering Health Report ────────────────────────────────────────────

export interface EngineeringHealthSummary {
  repositoryId: string;
  commitSha: string;
  analyzedAt: string;
  overallStatus: SignalStatus;
  totalFindingsCount: number;
  findingsBySeverity: {
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  keyRisks: string[];
  healthHighlights: string[];
}

export interface EngineeringHealthReport {
  repository: RepositoryRef;
  summary: EngineeringHealthSummary;
  maintainability: MaintainabilityIndicators;
  architecture: ArchitectureIndicators;
  testing: TestingIndicators;
  dependencies: DependencyIndicators;
  documentation: DocumentationIndicators;
  complexity: ComplexityIndicators;
  coupling: CouplingIndicators;
  activity: ActivityIndicators;
  hotspots: EngineeringHotspot[];
  findings: EngineeringFinding[];
  durationMs: number;
}
