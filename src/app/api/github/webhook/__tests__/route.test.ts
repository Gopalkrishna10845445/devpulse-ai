/**
 * Phase 9 — Webhook API Route Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { POST } from '../route';
import { GET as getEvents } from '../events/route';
import { POST as retryJob } from '../retry/route';
import { WebhookJobManager } from '@/lib/webhook/jobManager';

const TEST_SECRET = 'route-test-secret-12345';

function sign(body: string): string {
  const hmac = crypto.createHmac('sha256', TEST_SECRET);
  hmac.update(body, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

describe('POST /api/github/webhook & Related Routes', () => {
  const origSecret = process.env.GITHUB_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = TEST_SECRET;
    WebhookJobManager.resetState();
  });

  it('returns 401 if X-Hub-Signature-256 is missing or invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/github/webhook', {
      method: 'POST',
      body: JSON.stringify({ action: 'opened' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.received).toBe(false);
  });

  it('successfully receives and enqueues valid push webhook', async () => {
    const payload = JSON.stringify({
      ref: 'refs/heads/main',
      after: 'abc123456789',
      repository: {
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        owner: { login: 'test-org' },
      },
      sender: { login: 'octocat' },
    });

    const sig = sign(payload);
    const req = new NextRequest('http://localhost:3000/api/github/webhook', {
      method: 'POST',
      headers: {
        'x-hub-signature-256': sig,
        'x-github-delivery': 'del-route-001',
        'x-github-event': 'push',
      },
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.event).toBe('push');
    expect(data.status).toBe('queued');
  });

  it('handles duplicate delivery ID with idempotent response', async () => {
    const payload = JSON.stringify({
      ref: 'refs/heads/main',
      repository: { name: 'test-repo', full_name: 'test-org/test-repo', owner: { login: 'test-org' } },
    });
    const sig = sign(payload);

    const makeReq = () =>
      new NextRequest('http://localhost:3000/api/github/webhook', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': sig,
          'x-github-delivery': 'del-dup-001',
          'x-github-event': 'push',
        },
        body: payload,
      });

    const res1 = await POST(makeReq());
    expect(res1.status).toBe(200);

    const res2 = await POST(makeReq());
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.duplicate).toBe(true);
  });

  it('GET /api/github/webhook/events returns recent deliveries and jobs', async () => {
    const res = await getEvents();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.deliveries)).toBe(true);
    expect(Array.isArray(data.jobs)).toBe(true);
  });

  it('POST /api/github/webhook/retry handles job retry or 404', async () => {
    const req = new NextRequest('http://localhost:3000/api/github/webhook/retry', {
      method: 'POST',
      body: JSON.stringify({ jobId: 'non-existent-job-123' }),
    });

    const res = await retryJob(req);
    expect(res.status).toBe(404);
  });
});
