/**
 * Phase 6 — Security Intelligence Types
 *
 * Defines strongly typed models for evidence-backed security scanning,
 * secret detection, sensitive file identification, static code pattern signals,
 * insecure configurations, and dependency vulnerability advisories.
 */

import { RepositoryRef } from '../repository/types';

export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type SecurityCategory =
  | 'secrets'
  | 'dependencies'
  | 'configuration'
  | 'authentication'
  | 'authorization'
  | 'code_security'
  | 'sensitive_files'
  | 'infrastructure'
  | 'ci_cd'
  | 'permissions';

export type SecurityConfidence = 'high' | 'medium' | 'low';

export type FindingSource = 'repository_static' | 'external_advisory';

// ─── Finding & Evidence Models ──────────────────────────────────────────────────

export interface SecurityEvidenceReference {
  file?: string;
  line?: number;
  lineRange?: string;
  symbol?: string;
  rule?: string;
  metricName?: string;
  metricValue?: string | number;
}

export interface SecurityEvidence {
  type:
    | 'secret_match'
    | 'file_path'
    | 'ast_pattern'
    | 'config_flag'
    | 'cve_advisory'
    | 'architecture_gap';
  summary: string;
  redactedContent?: string;
  references: SecurityEvidenceReference[];
  data?: Record<string, any>;
}

export interface SecurityFinding {
  id: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  title: string;
  description: string;
  impact: string;
  evidence: SecurityEvidence;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  symbol?: string;
  deterministicRule: string;
  confidence: SecurityConfidence;
  recommendation: string;
  source: FindingSource;
  status: 'active' | 'dismissed';
}

// ─── Vulnerability Advisory Model ──────────────────────────────────────────────

export interface VulnerabilityAdvisory {
  advisoryId: string; // e.g. GHSA-xxxx-xxxx-xxxx or CVE-2024-xxxx
  packageName: string;
  ecosystem: string;
  affectedVersion: string;
  patchedVersion?: string;
  severity: SecuritySeverity;
  title: string;
  description: string;
  source: string; // e.g. "GitHub Advisory Database"
  publishedAt?: string;
  referenceUrl?: string;
}

// ─── Categorized Signal Models ─────────────────────────────────────────────────

export interface SecretsIndicators {
  status: 'healthy' | 'warning' | 'critical';
  summary: string;
  totalSecretsFound: number;
  secretTypesFound: string[];
  findings: SecurityFinding[];
}

export interface SensitiveFileIndicators {
  status: 'healthy' | 'warning';
  summary: string;
  totalSensitiveFiles: number;
  detectedFiles: { filePath: string; reason: string; sensitivityType: string }[];
  findings: SecurityFinding[];
}

export interface ConfigurationIndicators {
  status: 'healthy' | 'warning' | 'critical';
  summary: string;
  insecureFlagsCount: number;
  findings: SecurityFinding[];
}

export interface CodePatternIndicators {
  status: 'healthy' | 'warning' | 'critical';
  summary: string;
  dangerousPatternsCount: number;
  patternBreakdown: Record<string, number>;
  findings: SecurityFinding[];
}

export interface AuthIndicators {
  status: 'healthy' | 'warning' | 'neutral';
  summary: string;
  protectedRoutesCount: number;
  unprotectedEndpointsCount: number;
  findings: SecurityFinding[];
}

export interface SecurityDependencyIndicators {
  status: 'healthy' | 'warning' | 'critical' | 'unavailable';
  summary: string;
  totalManifests: number;
  totalDependencies: number;
  verifiedAdvisoriesCount: number;
  advisoryStatus: 'verified' | 'clean' | 'unavailable';
  unavailableReason?: string;
  advisories: VulnerabilityAdvisory[];
  findings: SecurityFinding[];
}

// ─── Root Security Health Report ───────────────────────────────────────────────

export interface SecuritySummary {
  repositoryId: string;
  commitSha: string;
  scannedAt: string;
  overallStatus: 'secure' | 'warning' | 'critical';
  totalFindingsCount: number;
  findingsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  keySecurityRisks: string[];
  securityHighlights: string[];
}

export interface SecurityHealthReport {
  repository: RepositoryRef;
  summary: SecuritySummary;
  secrets: SecretsIndicators;
  sensitiveFiles: SensitiveFileIndicators;
  configuration: ConfigurationIndicators;
  codePatterns: CodePatternIndicators;
  authentication: AuthIndicators;
  dependencies: SecurityDependencyIndicators;
  findings: SecurityFinding[];
  advisories: VulnerabilityAdvisory[];
  durationMs: number;
}
