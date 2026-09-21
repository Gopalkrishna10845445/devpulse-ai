/**
 * Production Phase 3 — Centralized BullMQ Queue Manager
 *
 * Manages background queues for webhooks, repository analysis, and RAG indexing.
 * Configures bounded retries, exponential backoff, dead-letter bounds, and fallback processing.
 */

import { Queue, QueueOptions } from 'bullmq';
import {
  QUEUE_NAMES,
  QueueName,
  WebhookJobData,
  RepositoryAnalysisJobData,
  RagIndexingJobData,
  JobStateRecord,
} from './types';
import { getRedisClient } from '../redis/client';
import { logger } from '../logger';
import { processWebhookJob } from './handlers/webhookHandler';
import { processRepositoryAnalysisJob } from './handlers/analysisHandler';

class QueueManagerSingleton {
  private static instance: QueueManagerSingleton;
  private queues: Map<QueueName, Queue> = new Map();
  private localJobStore: Map<string, JobStateRecord> = new Map();

  private constructor() {}

  public static getInstance(): QueueManagerSingleton {
    if (!QueueManagerSingleton.instance) {
      QueueManagerSingleton.instance = new QueueManagerSingleton();
    }
    return QueueManagerSingleton.instance;
  }

  /**
   * Initializes or returns a BullMQ Queue instance with standard production options.
   */
  public getQueue(queueName: QueueName): Queue | null {
    if (this.queues.has(queueName)) {
      return this.queues.get(queueName)!;
    }

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl || process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_REDIS) {
      // Return null in test/mock fallback mode
      return null;
    }

    try {
      const queueOptions: QueueOptions = {
        connection: {
          url: redisUrl,
          maxRetriesPerRequest: null, // Required by BullMQ
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 200,     // Keep last 200 failed jobs for audit
        },
      };

      const queue = new Queue(queueName, queueOptions);
      this.queues.set(queueName, queue);
      logger.info(`BullMQ Queue initialized: ${queueName}`);
      return queue;
    } catch (err) {
      logger.warn(`Failed to initialize BullMQ queue ${queueName} — operating in fallback mode`, {
        error: (err as Error).message,
      });
      return null;
    }
  }

  /**
   * Enqueues a GitHub webhook background job with delivery ID idempotency.
   */
  public async enqueueWebhook(data: WebhookJobData): Promise<JobStateRecord<WebhookJobData>> {
    const queueName = QUEUE_NAMES.WEBHOOK;
    const jobId = `wh_${data.deliveryId}`;
    const customJobData = { ...data, jobId };

    const record: JobStateRecord<WebhookJobData> = {
      id: jobId,
      queueName,
      status: 'queued',
      data: customJobData,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    };

    this.localJobStore.set(jobId, record);

    const bullQueue = this.getQueue(queueName);
    if (bullQueue) {
      try {
        await bullQueue.add(data.eventName, customJobData, {
          jobId,
        });
        logger.info('Enqueued webhook job to BullMQ', { jobId, deliveryId: data.deliveryId });
      } catch (err) {
        logger.warn('Failed to enqueue to BullMQ — running fallback handler', {
          jobId,
          error: (err as Error).message,
        });
        this.runFallbackWebhook(customJobData);
      }
    } else {
      // In-memory immediate asynchronous execution for dev/test environments
      this.runFallbackWebhook(customJobData);
    }

    return record;
  }

  /**
   * Enqueues a repository analysis background job with commit-scoped idempotency.
   */
  public async enqueueRepositoryAnalysis(
    data: RepositoryAnalysisJobData
  ): Promise<JobStateRecord<RepositoryAnalysisJobData>> {
    const queueName = QUEUE_NAMES.REPOSITORY_ANALYSIS;
    const jobId = `analysis_${data.repositoryId.replace(/\//g, '_')}_${data.commitSha.substring(0, 10)}`;
    const customJobData = { ...data, jobId };

    const record: JobStateRecord<RepositoryAnalysisJobData> = {
      id: jobId,
      queueName,
      status: 'queued',
      data: customJobData,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    };

    this.localJobStore.set(jobId, record);

    const bullQueue = this.getQueue(queueName);
    if (bullQueue) {
      try {
        await bullQueue.add('analyze', customJobData, {
          jobId,
        });
        logger.info('Enqueued repository analysis job to BullMQ', { jobId, repo: data.repositoryId });
      } catch (err) {
        logger.warn('Failed to enqueue to BullMQ — running fallback analysis handler', {
          jobId,
          error: (err as Error).message,
        });
        this.runFallbackAnalysis(customJobData);
      }
    } else {
      this.runFallbackAnalysis(customJobData);
    }

    return record;
  }

  /**
   * Retrieves status of a background job.
   */
  public async getJobStatus(jobId: string): Promise<JobStateRecord | null> {
    const local = this.localJobStore.get(jobId);
    if (local) return local;

    // Check BullMQ queues
    for (const queue of this.queues.values()) {
      try {
        const job = await queue.getJob(jobId);
        if (job) {
          const state = await job.getState();
          return {
            id: job.id || jobId,
            queueName: queue.name as QueueName,
            status: state === 'completed' ? 'completed' : state === 'failed' ? 'failed' : state === 'active' ? 'running' : 'queued',
            data: job.data,
            attempts: job.attemptsMade,
            maxAttempts: job.opts.attempts || 3,
            result: job.returnvalue,
            error: job.failedReason,
            createdAt: new Date(job.timestamp).toISOString(),
          };
        }
      } catch {
        // Ignore lookup error and continue
      }
    }

    return null;
  }

  private async runFallbackWebhook(data: WebhookJobData): Promise<void> {
    const record = this.localJobStore.get(data.jobId);
    if (record) {
      record.status = 'running';
      record.startedAt = new Date().toISOString();
      record.attempts += 1;
    }

    try {
      const result = await processWebhookJob(data);
      if (record) {
        record.status = 'completed';
        record.completedAt = new Date().toISOString();
        record.result = result;
      }
    } catch (err) {
      if (record) {
        record.status = 'failed';
        record.failedAt = new Date().toISOString();
        record.error = (err as Error).message;
      }
    }
  }

  private async runFallbackAnalysis(data: RepositoryAnalysisJobData): Promise<void> {
    const record = this.localJobStore.get(data.jobId);
    if (record) {
      record.status = 'running';
      record.startedAt = new Date().toISOString();
      record.attempts += 1;
    }

    try {
      const result = await processRepositoryAnalysisJob(data);
      if (record) {
        record.status = 'completed';
        record.completedAt = new Date().toISOString();
        record.result = result;
      }
    } catch (err) {
      if (record) {
        record.status = 'failed';
        record.failedAt = new Date().toISOString();
        record.error = (err as Error).message;
      }
    }
  }

  /**
   * Closes all active queues gracefully.
   */
  public async closeAll(): Promise<void> {
    for (const queue of this.queues.values()) {
      try {
        await queue.close();
      } catch (err) {
        logger.warn(`Error closing queue ${queue.name}`, { error: (err as Error).message });
      }
    }
    this.queues.clear();
  }

  /**
   * Resets internal store for tests.
   */
  public resetState(): void {
    this.localJobStore.clear();
  }
}

export const queueManager = QueueManagerSingleton.getInstance();
export const enqueueWebhookJob = (data: WebhookJobData) => queueManager.enqueueWebhook(data);
export const enqueueAnalysisJob = (data: RepositoryAnalysisJobData) => queueManager.enqueueRepositoryAnalysis(data);
export const getJobStatus = (jobId: string) => queueManager.getJobStatus(jobId);
