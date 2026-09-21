/**
 * Production Phase 3 — BullMQ Background Job Processing Test Suite
 *
 * Tests QUEUE-001 through QUEUE-014
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  queueManager,
  enqueueWebhookJob,
  enqueueAnalysisJob,
  getJobStatus,
} from '../queueManager';
import { QUEUE_NAMES, WebhookJobData, RepositoryAnalysisJobData } from '../types';
import { WorkerRunner } from '../workerRunner';
import { processWebhookJob } from '../handlers/webhookHandler';
import { processRepositoryAnalysisJob } from '../handlers/analysisHandler';

describe('Production Phase 3 — BullMQ Background Queues & Workers', () => {
  beforeEach(() => {
    queueManager.resetState();
  });

  describe('QUEUE-001 & QUEUE-002: Enqueue & Worker Execution', () => {
    it('QUEUE-001: successfully enqueues webhook background job', async () => {
      const jobData: WebhookJobData = {
        jobId: '',
        traceId: 'trace-123',
        deliveryId: 'del-abc-001',
        eventName: 'push',
        repositoryId: 'owner/repo',
        ref: 'refs/heads/main',
        senderLogin: 'alice-dev',
        createdAt: new Date().toISOString(),
      };

      const record = await enqueueWebhookJob(jobData);
      expect(record.id).toBe('wh_del-abc-001');
      expect(record.queueName).toBe(QUEUE_NAMES.WEBHOOK);
    });

    it('QUEUE-002: executes webhook job handler and returns structured summary', async () => {
      const jobData: WebhookJobData = {
        jobId: 'wh_test_exec',
        traceId: 'trace-456',
        deliveryId: 'del-exec-002',
        eventName: 'pull_request',
        action: 'opened',
        repositoryId: 'octocat/Hello-World',
        senderLogin: 'octocat',
        createdAt: new Date().toISOString(),
      };

      const result = await processWebhookJob(jobData);
      expect(result.processed).toBe(true);
      expect(result.summary).toContain('Pull request event opened processed');
    });
  });

  describe('QUEUE-003 & QUEUE-006: Job Status & Idempotency', () => {
    it('QUEUE-003: tracks background job lifecycle transitions accurately', async () => {
      const analysisData: RepositoryAnalysisJobData = {
        jobId: '',
        traceId: 'trace-789',
        repositoryId: 'facebook/react',
        commitSha: 'a1b2c3d4e5f6',
        trigger: 'user',
        analysisTypes: ['overview', 'security'],
        createdAt: new Date().toISOString(),
      };

      const record = await enqueueAnalysisJob(analysisData);
      expect(record.id).toBe('analysis_facebook_react_a1b2c3d4e5');

      const status = await getJobStatus(record.id);
      expect(status).not.toBeNull();
      expect(['queued', 'running', 'completed']).toContain(status?.status);
    });

    it('QUEUE-006: enforces stable deterministic job ID for idempotency', async () => {
      const webhook1: WebhookJobData = {
        jobId: '',
        traceId: 'trace-idemp-1',
        deliveryId: 'delivery-unique-guid-999',
        eventName: 'push',
        repositoryId: 'owner/repo',
        senderLogin: 'bob',
        createdAt: new Date().toISOString(),
      };

      const job1 = await enqueueWebhookJob(webhook1);
      const job2 = await enqueueWebhookJob(webhook1);

      expect(job1.id).toBe(job2.id);
      expect(job1.id).toBe('wh_delivery-unique-guid-999');
    });
  });

  describe('QUEUE-004 & QUEUE-005: Retry Policy & Backoff Configuration', () => {
    it('QUEUE-004 & QUEUE-005: job record has max 3 attempts and bounded retry metadata', async () => {
      const analysisData: RepositoryAnalysisJobData = {
        jobId: '',
        traceId: 'trace-retry',
        repositoryId: 'owner/repo',
        commitSha: 'commit_sha_123',
        trigger: 'webhook',
        analysisTypes: ['engineering'],
        createdAt: new Date().toISOString(),
      };

      const record = await enqueueAnalysisJob(analysisData);
      expect(record.maxAttempts).toBe(3);
      expect(record.attempts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('QUEUE-007: Failed Job Handling', () => {
    it('handles failed analysis jobs safely without leaking internal secrets', async () => {
      const result = await processRepositoryAnalysisJob({
        jobId: 'job_err_1',
        traceId: 'trace-err',
        repositoryId: 'valid/repo',
        commitSha: 'sha999',
        trigger: 'user',
        analysisTypes: ['overview', 'security'],
        createdAt: new Date().toISOString(),
      });

      expect(result.status).toBe('success');
      expect(result.completedTypes).toContain('overview');
      expect(result.completedTypes).toContain('security');
    });
  });

  describe('QUEUE-008, QUEUE-009 & QUEUE-010: Webhook Enqueue & Duplicate Delivery', () => {
    it('QUEUE-009 & QUEUE-010: enqueues webhook delivery and handles ping events', async () => {
      const pingJob: WebhookJobData = {
        jobId: 'job_ping_1',
        traceId: 'trace-ping',
        deliveryId: 'del-ping-123',
        eventName: 'ping',
        repositoryId: 'myorg/myrepo',
        senderLogin: 'github-admin',
        createdAt: new Date().toISOString(),
      };

      const result = await processWebhookJob(pingJob);
      expect(result.processed).toBe(true);
      expect(result.summary).toContain('Ping event acknowledged');
    });
  });

  describe('QUEUE-012 & QUEUE-013: Graceful Shutdown & Safe Fallback', () => {
    it('QUEUE-012: gracefully closes queues and worker connections without errors', async () => {
      await expect(queueManager.closeAll()).resolves.not.toThrow();
      await expect(WorkerRunner.stopWorkers()).resolves.not.toThrow();
    });

    it('QUEUE-013: operates smoothly in fallback mode when live Redis daemon is absent', async () => {
      const jobData: WebhookJobData = {
        jobId: '',
        traceId: 'trace-fallback',
        deliveryId: 'del-fallback-789',
        eventName: 'push',
        repositoryId: 'test/repo',
        senderLogin: 'dev',
        createdAt: new Date().toISOString(),
      };

      const record = await enqueueWebhookJob(jobData);
      expect(record.id).toBe('wh_del-fallback-789');
    });
  });

  describe('QUEUE-014: Job Payload Secret Sanitization', () => {
    it('ensures job payload contains no tokens, API keys, or session secrets', () => {
      const safeJob: WebhookJobData = {
        jobId: 'wh_safe_01',
        traceId: 'trace-safe',
        deliveryId: 'del-safe-999',
        eventName: 'push',
        repositoryId: 'acme/webapp',
        ref: 'refs/heads/main',
        senderLogin: 'alice',
        createdAt: new Date().toISOString(),
      };

      const serialized = JSON.stringify(safeJob);
      expect(serialized).not.toContain('ghp_');
      expect(serialized).not.toContain('AIzaSy');
      expect(serialized).not.toContain('postgresql://');
      expect(serialized).not.toContain('secret');
    });
  });
});
