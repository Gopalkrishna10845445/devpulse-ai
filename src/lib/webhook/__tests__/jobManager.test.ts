/**
 * Phase 9 — Webhook Job Manager Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookJobManager } from '../jobManager';
import { GitHubWebhookEvent } from '../types';

describe('Phase 9 Webhook Job Manager', () => {
  beforeEach(() => {
    WebhookJobManager.resetState();
    vi.restoreAllMocks();
  });

  const mockPushEvent: GitHubWebhookEvent = {
    deliveryId: 'del-001',
    eventName: 'push',
    repository: { name: 'devpulse-ai', fullName: 'org/devpulse-ai', owner: 'org' },
    sender: { login: 'alice' },
    ref: 'refs/heads/main',
    afterSha: 'commit12345',
    timestamp: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    signatureVerified: true,
  };

  it('enqueues a job for a new delivery ID and tracks it', () => {
    const { job, isDuplicate } = WebhookJobManager.enqueueEvent(mockPushEvent);
    expect(isDuplicate).toBe(false);
    expect(job).toBeDefined();
    expect(job?.status).toBe('queued');
    expect(job?.repositoryId).toBe('org/devpulse-ai');
    expect(job?.requestedOperations).toContain('INGEST');

    expect(WebhookJobManager.isDuplicateDelivery('del-001')).toBe(true);
  });

  it('detects and rejects duplicate delivery IDs (replay protection)', () => {
    WebhookJobManager.enqueueEvent(mockPushEvent);
    const secondAttempt = WebhookJobManager.enqueueEvent(mockPushEvent);
    expect(secondAttempt.isDuplicate).toBe(true);
    expect(secondAttempt.job).toBeUndefined();
  });

  it('deduplicates jobs with identical key when already queued or processing', () => {
    const event1 = { ...mockPushEvent, deliveryId: 'del-a' };
    const event2 = { ...mockPushEvent, deliveryId: 'del-b' };

    const first = WebhookJobManager.enqueueEvent(event1);
    expect(first.isDuplicate).toBe(false);

    const second = WebhookJobManager.enqueueEvent(event2);
    expect(second.isDuplicate).toBe(true);
    expect(second.job?.id).toBe(first.job?.id);
  });

  it('invalidates previous PR review when head SHA changes on synchronize event', () => {
    const prSyncEvent: GitHubWebhookEvent = {
      deliveryId: 'del-pr-sync',
      eventName: 'pull_request',
      action: 'synchronize',
      repository: { name: 'devpulse-ai', fullName: 'org/devpulse-ai', owner: 'org' },
      sender: { login: 'alice' },
      pullRequestNumber: 10,
      beforeSha: 'old-sha-111',
      headSha: 'new-sha-222',
      timestamp: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      signatureVerified: true,
    };

    WebhookJobManager.enqueueEvent(prSyncEvent);
    expect(WebhookJobManager.isReviewStale('org/devpulse-ai', 10, 'old-sha-111')).toBe(true);
    expect(WebhookJobManager.isReviewStale('org/devpulse-ai', 10, 'new-sha-222')).toBe(false);
  });

  it('manages manual retry of a failed job', async () => {
    const { job } = WebhookJobManager.enqueueEvent(mockPushEvent);
    if (!job) throw new Error('Job not created');

    job.status = 'failed';
    job.error = {
      message: 'Temporary network timeout',
      code: 'NETWORK_ERROR',
      isRetryable: true,
      timestamp: new Date().toISOString(),
    };

    const retried = await WebhookJobManager.retryJob(job.id);
    expect(retried).toBeDefined();
    expect(retried?.status).toBe('queued');
    expect(retried?.retryCount).toBe(1);
    expect(retried?.error).toBeUndefined();
  });
});
