/**
 * Production Phase 3 — BullMQ Queue & Background Job Type Definitions
 *
 * All job payloads MUST strictly contain identifiers and metadata only.
 * NEVER store tokens, API keys, session secrets, or raw passwords in job payloads.
 */

export const QUEUE_NAMES = {
  WEBHOOK: 'webhook-processing',
  REPOSITORY_ANALYSIS: 'repository-analysis',
  RAG_INDEXING: 'rag-indexing',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface BaseJobData {
  jobId: string;
  traceId: string;
  createdAt: string;
  userId?: string;
}

export interface WebhookJobData extends BaseJobData {
  deliveryId: string;
  eventName: string;
  repositoryId: string;
  ref?: string;
  action?: string;
  senderLogin: string;
}

export interface RepositoryAnalysisJobData extends BaseJobData {
  repositoryId: string;
  commitSha: string;
  trigger: 'user' | 'webhook' | 'agent';
  analysisTypes: ('overview' | 'engineering' | 'security' | 'rag')[];
}

export interface RagIndexingJobData extends BaseJobData {
  repositoryId: string;
  commitSha: string;
  chunkCount?: number;
}

export interface JobStateRecord<T = unknown> {
  id: string;
  queueName: QueueName;
  status: JobStatus;
  data: T;
  attempts: number;
  maxAttempts: number;
  result?: unknown;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
}
