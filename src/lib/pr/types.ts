/**
 * Phase 8 — Pull Request Review Engine Types
 *
 * Strongly typed models for GitHub Pull Request inspection,
 * diff analysis, changed-symbol tracking, multi-dimensional impact evaluation,
 * deterministic review rules, and developer-oriented review summaries.
 */

export type PRFindingCategory =
  | 'architecture'
  | 'bug_risk'
  | 'security'
  | 'testing'
  | 'dependencies'
  | 'performance'
  | 'maintainability'
  | 'documentation'
  | 'api'
  | 'configuration';

export type PRFindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type PRReviewStatus = 'complete' | 'partial' | 'failed' | 'stale';

// ─── GitHub Pull Request Metadata ──────────────────────────────────────────────

export interface PullRequestMetadata {
  number: number;
  title: string;
  body: string | null;
  author: string;
  authorAvatarUrl?: string;
  state: 'open' | 'closed' | 'merged';
  baseBranch: string;
  headBranch: string;
  baseSha: string;
  headSha: string;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string | null;
  additions: number;
  deletions: number;
  changedFilesCount: number;
  htmlUrl: string;
  draft?: boolean;
}

export interface PRChangedFile {
  filePath: string;
  oldPath?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  rawContent?: string;
}

// ─── Diff & Symbol Representation ─────────────────────────────────────────────

export interface DiffLine {
  type: 'add' | 'del' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface ParsedDiffFile {
  filePath: string;
  oldPath?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks: DiffHunk[];
  addedLinesCount: number;
  deletedLinesCount: number;
  addedLineNumbers: number[];
  deletedLineNumbers: number[];
}

export interface ChangedSymbol {
  name: string;
  kind: string;
  filePath: string;
  oldLineRange?: { start: number; end: number };
  newLineRange?: { start: number; end: number };
  changeType: 'added' | 'modified' | 'deleted';
  signature?: string;
}

// ─── Review Finding Model ─────────────────────────────────────────────────────

export interface PRFindingEvidence {
  summary: string;
  filePath: string;
  line?: number;
  lineRange?: string;
  snippet?: string;
  ruleEvidence?: Record<string, any>;
}

export interface PRReviewFinding {
  id: string;
  category: PRFindingCategory;
  severity: PRFindingSeverity;
  confidence: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  file?: string;
  line?: number;
  lineRange?: string;
  symbol?: string;
  evidence: PRFindingEvidence;
  source: 'deterministic_rule' | 'security_intelligence' | 'engineering_intelligence' | 'ai_synthesis';
  rule: string;
  recommendation: string;
}

// ─── Impact Dimensions ────────────────────────────────────────────────────────

export interface ArchitectureImpact {
  summary: string;
  status: 'healthy' | 'warning' | 'critical' | 'neutral';
  layerBypasses: Array<{
    sourceFile: string;
    targetModule: string;
    description: string;
  }>;
  circularDependencies: Array<{
    modules: string[];
    description: string;
  }>;
  couplingChanges: Array<{
    module: string;
    metric: string;
    changeDescription: string;
  }>;
}

export interface SecurityImpact {
  summary: string;
  status: 'clean' | 'warning' | 'critical';
  introducedSecrets: number;
  sensitiveChanges: Array<{
    file: string;
    type: string;
    description: string;
  }>;
  advisoryCount: number;
}

export interface TestingImpact {
  summary: string;
  status: 'adequate' | 'warning' | 'missing' | 'untestable';
  changedSourceFilesWithoutTests: string[];
  newTestsCount: number;
  modifiedTestsCount: number;
  deletedTestsCount: number;
  testCoverageNote?: string;
}

export interface DependencyImpact {
  summary: string;
  status: 'clean' | 'warning' | 'critical' | 'neutral';
  addedPackages: Array<{ name: string; version: string }>;
  removedPackages: Array<{ name: string; version: string }>;
  upgradedPackages: Array<{ name: string; fromVersion: string; toVersion: string }>;
  advisoriesDetected: Array<{
    packageName: string;
    severity: string;
    advisoryId: string;
    description: string;
  }>;
}

export interface DocumentationImpact {
  summary: string;
  status: 'adequate' | 'warning' | 'neutral';
  publicApiChangesWithoutDocs: string[];
  newConfigOrEnvVarsWithoutDocs: string[];
}

// ─── Comprehensive PR Review ──────────────────────────────────────────────────

export interface PRReviewSummary {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  verdict: 'approve' | 'comment' | 'request_changes';
  keyFindings: string[];
  executiveSummary: string;
}

export interface PullRequestReview {
  id: string;
  repositoryId: string;
  pullRequest: PullRequestMetadata;
  baseCommit: string;
  headCommit: string;
  changedFiles: PRChangedFile[];
  changedSymbols: ChangedSymbol[];
  summary: PRReviewSummary;
  findings: PRReviewFinding[];
  architectureImpact: ArchitectureImpact;
  securityImpact: SecurityImpact;
  testingImpact: TestingImpact;
  dependencyImpact: DependencyImpact;
  documentationImpact: DocumentationImpact;
  recommendations: string[];
  validationPlan: string[];
  reviewStatus: PRReviewStatus;
  statusMessage?: string;
  generatedAt: string;
  durationMs: number;
  metadata: {
    ruleCount: number;
    filesAnalyzed: number;
    linesAdded: number;
    linesDeleted: number;
    aiSynthesisUsed: boolean;
  };
}

export interface PRReviewRequest {
  repositoryId: string;
  pullRequestNumber: number;
  baseSha?: string;
  headSha?: string;
  preloadedIndex?: any;
  preloadedIntelligence?: any;
}
