/**
 * Production Phase 3 — BullMQ Background Worker Runner
 *
 * Spawns dedicated workers to consume jobs from BullMQ queues.
 * Handles concurrency, bounded retries, authorization re-validation, and graceful shutdown.
 */

import { Worker, WorkerOptions, Job } from 'bullmq';
import { QUEUE_NAMES, WebhookJobData, RepositoryAnalysisJobData } from './types';
import { processWebhookJob } from './handlers/webhookHandler';
import { processRepositoryAnalysisJob } from './handlers/analysisHandler';
import { logger } from '../logger';
import { closeRedis } from '../redis/client';

export class WorkerRunner {
  private static workers: Worker[] = [];
  private static isShuttingDown = false;

  /**
   * Starts all production background workers.
   */
  public static startWorkers(): void {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.info('REDIS_URL not configured — worker runner in standby mode');
      return;
    }

    const workerOptions: WorkerOptions = {
      connection: {
        url: redisUrl,
        maxRetriesPerRequest: null,
      },
      concurrency: 5,
    };

    // 1. Webhook Worker
    try {
      const webhookWorker = new Worker<WebhookJobData>(
        QUEUE_NAMES.WEBHOOK,
        async (job: Job<WebhookJobData>) => {
          logger.info(`Webhook Worker executing job ${job.id}`);
          return await processWebhookJob(job.data);
        },
        workerOptions
      );

      webhookWorker.on('completed', (job) => {
        logger.info(`Webhook Job ${job.id} completed successfully`);
      });

      webhookWorker.on('failed', (job, err) => {
        logger.error(`Webhook Job ${job?.id} failed`, { error: err.message, attempts: job?.attemptsMade });
      });

      this.workers.push(webhookWorker);
    } catch (err) {
      logger.warn('Failed to start Webhook Worker', { error: (err as Error).message });
    }

    // 2. Repository Analysis Worker
    try {
      const analysisWorker = new Worker<RepositoryAnalysisJobData>(
        QUEUE_NAMES.REPOSITORY_ANALYSIS,
        async (job: Job<RepositoryAnalysisJobData>) => {
          logger.info(`Analysis Worker executing job ${job.id} for repo ${job.data.repositoryId}`);
          return await processRepositoryAnalysisJob(job.data);
        },
        workerOptions
      );

      analysisWorker.on('completed', (job) => {
        logger.info(`Analysis Job ${job.id} completed successfully`);
      });

      analysisWorker.on('failed', (job, err) => {
        logger.error(`Analysis Job ${job?.id} failed`, { error: err.message, attempts: job?.attemptsMade });
      });

      this.workers.push(analysisWorker);
    } catch (err) {
      logger.warn('Failed to start Analysis Worker', { error: (err as Error).message });
    }

    logger.info(`BullMQ Worker Runner started with ${this.workers.length} active workers`);

    // Register shutdown hooks
    this.registerShutdownHooks();
  }

  /**
   * Gracefully shuts down all active workers.
   */
  public static async stopWorkers(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info('Initiating graceful worker shutdown...');

    for (const worker of this.workers) {
      try {
        await worker.close();
        logger.info(`Worker ${worker.name} closed`);
      } catch (err) {
        logger.warn(`Error closing worker ${worker.name}`, { error: (err as Error).message });
      }
    }

    this.workers = [];
    await closeRedis();
    logger.info('All background workers stopped safely');
  }

  private static registerShutdownHooks(): void {
    const handleSignal = async (signal: string) => {
      logger.info(`Received ${signal} signal — stopping workers`);
      await this.stopWorkers();
      process.exit(0);
    };

    process.once('SIGTERM', () => handleSignal('SIGTERM'));
    process.once('SIGINT', () => handleSignal('SIGINT'));
  }
}

// Entry point: invoked when this file is executed directly via `npx tsx src/lib/queue/workerRunner.ts`
WorkerRunner.startWorkers();
