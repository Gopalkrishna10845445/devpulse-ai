/**
 * Phase 9 — GitHub Webhooks & Repository Event Streaming Types
 *
 * Strongly typed models for GitHub webhook deliveries, signature verification,
 * event classification, SHA-aware state tracking, and background analysis jobs.
 */

export type WebhookEventName =
  | 'push'
  | 'pull_request'
  | 'repository'
  | 'installation'
  | 'workflow_run'
  | 'ping'
  | 'unknown';

export type WebhookProcessingState =
  | 'received'
  | 'verified'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'ignored'
  | 'duplicate';

export type AnalysisOperation =
  | 'INGEST'
  | 'INDEX'
  | 'CODEBASE_ANALYSIS'
  | 'ENGINEERING_ANALYSIS'
  | 'SECURITY_ANALYSIS'
  | 'PR_REVIEW';

// ─── Webhook Event Model ───────────────────────────────────────────────────────

export interface GitHubWebhookRepository {
  id?: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch?: string;
  private?: boolean;
  htmlUrl?: string;
}

export interface GitHubWebhookSender {
  login: string;
  id?: number;
  avatarUrl?: string;
}

export interface WebhookCommit {
  id: string;
  message: string;
  timestamp?: string;
  author?: { name: string; email: string };
  added: string[];
  removed: string[];
  modified: string[];
}

export interface GitHubWebhookEvent {
  deliveryId: string;
  eventName: WebhookEventName;
  action?: string;
  repository: GitHubWebhookRepository;
  sender: GitHubWebhookSender;
  ref?: string;
  beforeSha?: string;
  afterSha?: string;
  headSha?: string;
  baseSha?: string;
  pullRequestNumber?: number;
  pullRequestTitle?: string;
  pullRequestState?: 'open' | 'closed' | 'merged';
  commits?: WebhookCommit[];
  timestamp: string;
  receivedAt: string;
  signatureVerified: boolean;
}

// ─── Analysis Job Model ────────────────────────────────────────────────────────

export interface JobErrorRecord {
  message: string;
  code?: string;
  isRetryable: boolean;
  timestamp: string;
}

export interface RepositoryAnalysisJob {
  id: string;
  jobKey: string;
  repositoryId: string;
  eventDeliveryId: string;
  eventType: WebhookEventName;
  action?: string;
  targetSha?: string;
  pullRequestNumber?: number;
  branch?: string;
  requestedOperations: AnalysisOperation[];
  status: WebhookProcessingState;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: JobErrorRecord;
  resultSummary?: string;
  retryCount: number;
  maxRetries: number;
}

// ─── Delivery Audit Record ─────────────────────────────────────────────────────

export interface WebhookDeliveryRecord {
  deliveryId: string;
  eventName: WebhookEventName;
  action?: string;
  repositoryId: string;
  receivedAt: string;
  status: WebhookProcessingState;
  jobId?: string;
  error?: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

export interface WebhookResponse {
  received: boolean;
  deliveryId?: string;
  event?: string;
  status?: string;
  duplicate?: boolean;
  message?: string;
  error?: string;
}
