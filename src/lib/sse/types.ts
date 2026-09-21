/**
 * Production Phase 4 — Server-Sent Events (SSE) Type Definitions
 *
 * Safe real-time progress events for background jobs and Autonomous Agent workflows.
 * Strictly NEVER expose internal prompts, hidden chain-of-thought, or tokens.
 */

export type SSEJobEventType =
  | 'job.queued'
  | 'job.started'
  | 'job.progress'
  | 'job.completed'
  | 'job.failed';

export type SSEAgentEventType =
  | 'agent.started'
  | 'agent.planning'
  | 'agent.tool'
  | 'agent.progress'
  | 'agent.awaiting_approval'
  | 'agent.completed'
  | 'agent.failed';

export interface BaseSSEEvent<T = unknown> {
  id: string;
  type: SSEJobEventType | SSEAgentEventType | 'ping';
  channel: string;
  timestamp: string;
  data: T;
}

export interface JobProgressEventData {
  jobId: string;
  repositoryId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progressPercent?: number;
  stage?: string;
  summary: string;
  error?: string;
}

export interface AgentProgressEventData {
  sessionId: string;
  repositoryId: string;
  step: number;
  maxSteps: number;
  stage: string;
  summary: string; // High level description only, e.g. "Analyzing dependencies"
  activeTool?: string;
  approvalRequired?: boolean;
}
