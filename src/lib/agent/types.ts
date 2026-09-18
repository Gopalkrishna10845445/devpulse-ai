/**
 * Phase 10 — DevPilot Autonomous Developer Agent Types
 *
 * Defines strongly typed models for agent requests, responses, tool registry,
 * bounded state machine, memory records, execution traces, trust levels, and approvals.
 */

import { CodeFixProposal } from '../fixes/types';
import { EngineeringFinding } from '../engineering/types';
import { SecurityFinding } from '../security/types';
import { PRReviewFinding, PullRequestReview } from '../pr/types';
import { Citation } from '../rag/types';

export type AgentMode =
  | 'INVESTIGATE'
  | 'EXPLAIN'
  | 'REVIEW'
  | 'SECURITY'
  | 'ENGINEERING'
  | 'FIX'
  | 'SUMMARIZE';

export type AgentState =
  | 'idle'
  | 'understanding'
  | 'planning'
  | 'retrieving'
  | 'analyzing'
  | 'acting'
  | 'validating'
  | 'awaiting_approval'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'cancelled';

export type ResponseTrustLevel =
  | 'FACT'
  | 'INFERENCE'
  | 'RECOMMENDATION'
  | 'ACTION'
  | 'REQUIRES_APPROVAL';

export type ToolRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ToolDefinition {
  name: string;
  description: string;
  riskLevel: ToolRiskLevel;
  readOnly: boolean;
  requiresApproval: boolean;
  inputSchemaDescription: string;
  handler: (input: any, context: AgentExecutionContext) => Promise<ToolResult>;
}

export interface ToolResult {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
  evidence?: AgentEvidence[];
  citations?: Citation[];
  executionTimeMs: number;
}

export interface AgentEvidence {
  source: 'repository' | 'ast' | 'rag' | 'engineering' | 'security' | 'pr' | 'webhook';
  title: string;
  file?: string;
  lineRange?: string;
  snippet?: string;
  details?: Record<string, any>;
}

export interface AgentProposedAction {
  id: string;
  title: string;
  description: string;
  toolName: string;
  riskLevel: ToolRiskLevel;
  requiresApproval: boolean;
  targetRepository: string;
  targetCommit: string;
  affectedFiles: string[];
  unifiedDiff?: string;
  diffHash?: string;
  fixProposal?: CodeFixProposal;
  validationPlan?: string[];
  status: 'proposed' | 'approved' | 'rejected' | 'executed' | 'expired';
}

export interface AgentResponseSection {
  trustLevel: ResponseTrustLevel;
  heading: string;
  content: string;
  citations?: Citation[];
}

export interface AgentRequest {
  repositoryId: string;
  commitSha?: string;
  userMessage: string;
  context?: {
    currentFile?: string;
    selectedLines?: string;
    symbol?: string;
    activeFindingId?: string;
    activePRNumber?: number;
  };
  requestedMode?: AgentMode;
  permissions?: {
    allowWriteProposal?: boolean;
    allowApprovedExecution?: boolean;
  };
  conversationId?: string;
}

export interface AgentResponse {
  traceId: string;
  conversationId: string;
  repositoryId: string;
  commitSha: string;
  mode: AgentMode;
  status: AgentState;
  response: string;
  sections: AgentResponseSection[];
  findings: Array<EngineeringFinding | SecurityFinding | PRReviewFinding>;
  evidence: AgentEvidence[];
  citations: Citation[];
  actions: AgentProposedAction[];
  proposals: CodeFixProposal[];
  prReview?: PullRequestReview;
  approvalRequired: boolean;
  pendingAction?: AgentProposedAction;
  activityTimeline: AgentActivityStep[];
  executionSummary: {
    totalDurationMs: number;
    stepsExecuted: number;
    toolCallsCount: number;
    tokensUsedEstimate?: number;
  };
}

export interface AgentActivityStep {
  stepIndex: number;
  state: AgentState;
  label: string;
  summary: string;
  durationMs: number;
  timestamp: string;
}

export interface AgentTrace {
  traceId: string;
  conversationId: string;
  repositoryId: string;
  commitSha: string;
  userMessage: string;
  classifiedMode: AgentMode;
  startTime: string;
  endTime?: string;
  stateTransitions: Array<{ state: AgentState; timestamp: string }>;
  plan: string[];
  toolInvocations: Array<{
    toolName: string;
    input: any;
    result: ToolResult;
    timestamp: string;
  }>;
  decisions: string[];
  approvals: Array<{
    actionId: string;
    status: 'requested' | 'approved' | 'rejected';
    timestamp: string;
  }>;
  finalStatus: AgentState;
}

export interface AgentExecutionContext {
  repositoryId: string;
  commitSha: string;
  traceId: string;
  conversationId: string;
  readOnly: boolean;
  remainingStepsBudget: number;
  remainingToolCallsBudget: number;
}

export interface ApprovalRequest {
  traceId: string;
  actionId: string;
  repositoryId: string;
  commitSha: string;
  expectedDiffHash?: string;
  decision: 'approve' | 'reject';
  reason?: string;
}

export interface ApprovalResponse {
  success: boolean;
  actionId: string;
  status: 'executed' | 'rejected' | 'failed' | 'expired';
  message: string;
  executionResult?: any;
}
