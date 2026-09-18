/**
 * Phase 9 — Webhook Job Manager & Event Processor
 *
 * Manages background analysis jobs triggered by verified GitHub webhooks.
 * Enforces replay protection (delivery ID deduplication), job deduplication,
 * SHA invalidation, failure classification, and idempotent execution.
 */

import {
  AnalysisOperation,
  GitHubWebhookEvent,
  RepositoryAnalysisJob,
  WebhookDeliveryRecord,
} from './types';
import { determineRequiredOperations } from './eventParser';
import { ingestRepository } from '../repository/repositoryIngestor';
import { RepositoryIndex } from '../repository/types';
import { CodebaseRAGPipeline } from '../rag/ragPipeline';
import { analyzeCodebase } from '../intelligence/codebaseAnalyzer';
import { CodebaseIntelligence } from '../intelligence/types';
import { analyzeEngineeringHealth } from '../engineering/engineeringEngine';
import { analyzeSecurityHealth } from '../security/securityEngine';
import { PRReviewEngine } from '../pr/prReviewEngine';

class WebhookJobManagerSingleton {
  private processedDeliveries = new Map<string, WebhookDeliveryRecord>();
  private jobs = new Map<string, RepositoryAnalysisJob>();
  private stalePRReviews = new Set<string>(); // Tracks invalidated PR reviews: "repo:prNumber:oldHeadSha"

  /**
   * Checks if a delivery ID has already been received and processed.
   */
  public isDuplicateDelivery(deliveryId: string): boolean {
    return this.processedDeliveries.has(deliveryId);
  }

  /**
   * Records a webhook delivery record for audit and idempotency tracking.
   */
  public recordDelivery(record: WebhookDeliveryRecord): void {
    this.processedDeliveries.set(record.deliveryId, record);
    // Keep map bounded to the last 500 deliveries
    if (this.processedDeliveries.size > 500) {
      const firstKey = this.processedDeliveries.keys().next().value;
      if (firstKey) this.processedDeliveries.delete(firstKey);
    }
  }

  /**
   * Enqueues an event for background analysis.
   */
  public enqueueEvent(event: GitHubWebhookEvent): { job?: RepositoryAnalysisJob; isDuplicate: boolean } {
    if (this.isDuplicateDelivery(event.deliveryId)) {
      return { isDuplicate: true };
    }

    const operations = determineRequiredOperations(event);
    if (operations.length === 0) {
      this.recordDelivery({
        deliveryId: event.deliveryId,
        eventName: event.eventName,
        action: event.action,
        repositoryId: event.repository.fullName,
        receivedAt: event.receivedAt,
        status: 'ignored',
      });
      return { isDuplicate: false };
    }

    const targetSha = event.headSha || event.afterSha;
    const branch = event.ref ? event.ref.replace(/^refs\/heads\//, '') : event.repository.defaultBranch || 'main';

    // Deterministic job key for deduplication
    const jobKey = event.pullRequestNumber
      ? `${event.repository.fullName}:PR-${event.pullRequestNumber}:${targetSha || 'latest'}`
      : `${event.repository.fullName}:${targetSha || branch}:${operations.join(',')}`;

    // If job already queued, running, or completed for this exact key, deduplicate
    const existingJob = this.jobs.get(jobKey);
    if (existingJob && (existingJob.status === 'queued' || existingJob.status === 'processing' || existingJob.status === 'completed')) {
      this.recordDelivery({
        deliveryId: event.deliveryId,
        eventName: event.eventName,
        action: event.action,
        repositoryId: event.repository.fullName,
        receivedAt: event.receivedAt,
        status: 'duplicate',
        jobId: existingJob.id,
      });
      return { job: existingJob, isDuplicate: true };
    }

    // Handle PR head SHA invalidation
    if (event.eventName === 'pull_request' && event.pullRequestNumber && event.beforeSha) {
      const staleKey = `${event.repository.fullName}:${event.pullRequestNumber}:${event.beforeSha}`;
      this.stalePRReviews.add(staleKey);
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: RepositoryAnalysisJob = {
      id: jobId,
      jobKey,
      repositoryId: event.repository.fullName,
      eventDeliveryId: event.deliveryId,
      eventType: event.eventName,
      action: event.action,
      targetSha,
      pullRequestNumber: event.pullRequestNumber,
      branch,
      requestedOperations: operations,
      status: 'queued',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.jobs.set(jobKey, job);
    this.recordDelivery({
      deliveryId: event.deliveryId,
      eventName: event.eventName,
      action: event.action,
      repositoryId: event.repository.fullName,
      receivedAt: event.receivedAt,
      status: 'queued',
      jobId,
    });

    // Fire asynchronous execution in background
    setTimeout(() => {
      this.executeJob(job, event).catch(() => {});
    }, 10);

    return { job, isDuplicate: false };
  }

  /**
   * Executes background job pipeline operations sequentially.
   */
  public async executeJob(job: RepositoryAnalysisJob, eventContext?: GitHubWebhookEvent): Promise<void> {
    job.status = 'processing';
    job.startedAt = new Date().toISOString();

    const { owner, name } = this.splitRepo(job.repositoryId);

    try {
      let index: RepositoryIndex | null = null;
      let intelligence: CodebaseIntelligence | null = null;

      for (const op of job.requestedOperations) {
        if (op === 'INGEST') {
          index = await ingestRepository({
            owner,
            repository: name,
            branch: job.branch,
          });
        } else if (op === 'INDEX' && index) {
          await new CodebaseRAGPipeline().indexRepository(job.repositoryId, index, intelligence ?? undefined);
        } else if (op === 'CODEBASE_ANALYSIS' && index) {
          intelligence = await analyzeCodebase({ index });
        } else if (op === 'ENGINEERING_ANALYSIS' && index && intelligence) {
          await analyzeEngineeringHealth({
            repoIndex: index,
            intelligence,
          });
        } else if (op === 'SECURITY_ANALYSIS' && index) {
          await analyzeSecurityHealth({
            repoIndex: index,
            intelligence,
          });
        } else if (op === 'PR_REVIEW' && job.pullRequestNumber) {
          await PRReviewEngine.reviewPullRequest({
            repositoryId: job.repositoryId,
            pullRequestNumber: job.pullRequestNumber,
            headSha: job.targetSha,
            preloadedIndex: index,
            preloadedIntelligence: intelligence ?? undefined,
          });
        }
      }

      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.resultSummary = `Successfully processed ${job.requestedOperations.length} operation(s) for ${job.repositoryId}`;
    } catch (err: any) {
      const isRateLimited = (err.message || '').toLowerCase().includes('rate limit');
      const isNetwork = (err.message || '').toLowerCase().includes('network') || (err.message || '').toLowerCase().includes('timeout');

      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      job.error = {
        message: err.message || 'Unknown processing failure.',
        code: isRateLimited ? 'RATE_LIMITED' : isNetwork ? 'NETWORK_ERROR' : 'PROCESSING_ERROR',
        isRetryable: isRateLimited || isNetwork,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Manually retries a failed analysis job.
   */
  public async retryJob(jobId: string): Promise<RepositoryAnalysisJob | null> {
    const job = Array.from(this.jobs.values()).find(j => j.id === jobId);
    if (!job) return null;

    if (job.retryCount >= job.maxRetries) {
      throw new Error(`Job ${jobId} has reached maximum retry attempts (${job.maxRetries}).`);
    }

    job.retryCount++;
    job.status = 'queued';
    job.error = undefined;

    setTimeout(() => {
      this.executeJob(job).catch(() => {});
    }, 10);

    return job;
  }

  /**
   * Returns list of recent jobs for UI observability.
   */
  public getRecentJobs(limit: number = 20): RepositoryAnalysisJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Returns list of recent deliveries for audit.
   */
  public getRecentDeliveries(limit: number = 20): WebhookDeliveryRecord[] {
    return Array.from(this.processedDeliveries.values())
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Checks if a PR review is marked stale.
   */
  public isReviewStale(repositoryId: string, pullRequestNumber: number, headSha: string): boolean {
    return this.stalePRReviews.has(`${repositoryId}:${pullRequestNumber}:${headSha}`);
  }

  /**
   * Resets in-memory state (useful for automated test isolation).
   */
  public resetState(): void {
    this.processedDeliveries.clear( );
    this.jobs.clear();
    this.stalePRReviews.clear();
  }

  private splitRepo(repoFullName: string): { owner: string; name: string } {
    const parts = repoFullName.split('/');
    return {
      owner: parts[0] || 'unknown',
      name: parts[1] || 'unknown',
    };
  }
}

export const WebhookJobManager = new WebhookJobManagerSingleton();
