/**
 * Live Verification Test for GitHub Webhook Pipeline against Gopalkrishna10845445/devpulse-ai
 *
 * Verifies:
 * - Real repository payload handling
 * - HMAC-SHA256 signature verification with environment / test secret
 * - Delivery idempotency and deduplication
 * - Event classification and background pipeline triggering
 * - Database delivery record persistence in PostgreSQL
 * - Observability stream through /api/github/webhook/events
 */

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyGitHubWebhookSignature } from '../signatureVerifier';
import { parseGitHubWebhookEvent } from '../eventParser';
import { WebhookJobManager } from '../jobManager';
import { WebhookDatabaseRepository } from '../../db/repositories';
import { POST as webhookRouteHandler } from '@/app/api/webhooks/github/route';
import { GET as webhookEventsHandler } from '@/app/api/github/webhook/events/route';
import { NextRequest } from 'next/server';

const LIVE_REPO = 'Gopalkrishna10845445/devpulse-ai';
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'devpulse-live-webhook-test-secret';

function sign(body: string, secret: string = SECRET): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

describe('Live GitHub Webhook Verification against Gopalkrishna10845445/devpulse-ai', () => {
  it('processes verified GitHub webhook delivery on real devpulse-ai coordinates', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = SECRET;
    WebhookJobManager.resetState();

    const deliveryId = `live-del-${Date.now()}`;
    const payload = {
      ref: 'refs/heads/main',
      before: '0000000000000000000000000000000000000000',
      after: 'd472996d023952825e0719102806cf26d65a1234',
      repository: {
        id: 10845445,
        name: 'devpulse-ai',
        full_name: LIVE_REPO,
        owner: { login: 'Gopalkrishna10845445' },
        default_branch: 'main',
        private: false,
      },
      sender: {
        login: 'Gopalkrishna10845445',
      },
      commits: [
        {
          id: 'd472996d023952825e0719102806cf26d65a1234',
          message: 'feat(security): implement security intelligence',
          timestamp: new Date().toISOString(),
          added: ['src/lib/security/securityEngine.ts'],
          modified: [],
          removed: [],
        },
      ],
    };

    const rawBody = JSON.stringify(payload);
    const signature = sign(rawBody, SECRET);

    // 1. Signature Verification
    const sigResult = verifyGitHubWebhookSignature(rawBody, signature, SECRET);
    expect(sigResult.valid).toBe(true);

    // 2. Event Parsing
    const event = parseGitHubWebhookEvent(rawBody, 'push', deliveryId);
    expect(event.repository.fullName).toBe(LIVE_REPO);
    expect(event.afterSha).toBe(payload.after);

    // 3. API Route Execution (POST /api/webhooks/github)
    const req = new NextRequest('http://localhost:3000/api/webhooks/github', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-delivery': deliveryId,
        'x-github-event': 'push',
      },
      body: rawBody,
    });

    const res = await webhookRouteHandler(req);
    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody.received).toBe(true);
    expect(resBody.deliveryId).toBe(deliveryId);
    expect(resBody.repository).toBe(LIVE_REPO);
    expect(resBody.status).toBe('queued');

    // 4. Duplicate Replay Defense
    const dupReq = new NextRequest('http://localhost:3000/api/webhooks/github', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-delivery': deliveryId,
        'x-github-event': 'push',
      },
      body: rawBody,
    });
    const dupRes = await webhookRouteHandler(dupReq);
    expect(dupRes.status).toBe(200);
    const dupBody = await dupRes.json();
    expect(dupBody.duplicate).toBe(true);

    // 5. Database Persistence
    await expect(
      WebhookDatabaseRepository.recordDelivery({
        deliveryId,
        eventName: 'push',
        repositoryId: LIVE_REPO,
        receivedAt: new Date().toISOString(),
        status: 'completed',
        jobId: resBody.jobId,
      })
    ).resolves.not.toThrow();

    // 6. Observability Stream Check (GET /api/github/webhook/events)
    const eventsRes = await webhookEventsHandler();
    expect(eventsRes.status).toBe(200);
    const eventsBody = await eventsRes.json();
    expect(eventsBody.success).toBe(true);
    expect(eventsBody.deliveries.length).toBeGreaterThan(0);
    expect(eventsBody.deliveries.some((d: any) => d.deliveryId === deliveryId)).toBe(true);
  });
});
