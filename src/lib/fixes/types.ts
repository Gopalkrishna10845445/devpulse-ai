/**
 * Phase 7 — AI Code Fix & Refactoring Types
 *
 * Defines strongly typed models for evidence-grounded code remediation requests,
 * reviewable proposals, unified diffs, validation plans, and safe patch lifecycle states.
 */

export type ProposalStatus =
  | 'proposed'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'failed'
  | 'stale';

export type FixCategory = 'security' | 'engineering';

export interface ValidationPlanItem {
  type: 'test' | 'typecheck' | 'lint' | 'build' | 'manual';
  command?: string;
  description: string;
  status: 'suggested' | 'passed' | 'failed';
}

export interface CodeFixEvidence {
  summary: string;
  references: Array<{
    file?: string;
    line?: number;
    lineRange?: string;
    symbol?: string;
    rule?: string;
  }>;
  redactedContent?: string;
}

export interface CodeFixRequest {
  repositoryId: string;
  commitSha: string;
  findingId: string;
  category: FixCategory;
  filePath?: string;
  symbol?: string;
  lineRange?: string;
  requestedAction?: string;
  findingTitle?: string;
  findingDescription?: string;
  findingImpact?: string;
  findingRule?: string;
  findingRecommendation?: string;
  evidence?: CodeFixEvidence;
  constraints?: string[];
}

export interface CodeFixProposal {
  id: string;
  repositoryId: string;
  commitSha: string;
  findingId: string;
  category: FixCategory;
  title: string;
  explanation: string;
  rationale: string;
  affectedFiles: string[];
  affectedSymbols: string[];
  targetFile: string;
  startLine?: number;
  endLine?: number;
  beforeCode: string;
  afterCode: string;
  unifiedDiff: string;
  diffHash: string;
  evidence: CodeFixEvidence;
  confidence: 'high' | 'medium' | 'low';
  validationPlan: ValidationPlanItem[];
  warnings: string[];
  remediationInstructions?: string;
  generatedAt: string;
  status: ProposalStatus;
  appliedAt?: string;
  rejectionReason?: string;
}

export interface ApplyFixRequest {
  proposalId: string;
  repositoryId: string;
  commitSha: string;
  expectedDiffHash: string;
  confirmedByUser: boolean;
}

export interface ApplyFixResponse {
  success: boolean;
  proposal: CodeFixProposal;
  modifiedFiles: Array<{
    path: string;
    patchedContent: string;
  }>;
  message: string;
}
