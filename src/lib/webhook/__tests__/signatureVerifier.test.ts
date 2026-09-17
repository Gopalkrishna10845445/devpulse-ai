/**
 * Phase 9 — GitHub Webhook Signature Verifier Unit Tests
 */

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyGitHubWebhookSignature } from '../signatureVerifier';

const TEST_SECRET = 'my-super-secret-webhook-key-12345';
const PAYLOAD = JSON.stringify({
  action: 'opened',
  repository: { full_name: 'test-org/test-repo' },
});

function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

describe('Phase 9 Signature Verifier', () => {
  it('validates a correct HMAC-SHA256 signature', () => {
    const signature = generateSignature(PAYLOAD, TEST_SECRET);
    const result = verifyGitHubWebhookSignature(PAYLOAD, signature, TEST_SECRET);
    expect(result.valid).toBe(true);
  });

  it('rejects an altered payload with original signature', () => {
    const signature = generateSignature(PAYLOAD, TEST_SECRET);
    const alteredPayload = JSON.stringify({
      action: 'closed',
      repository: { full_name: 'test-org/test-repo' },
    });
    const result = verifyGitHubWebhookSignature(alteredPayload, signature, TEST_SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('verification failed');
  });

  it('rejects signature signed with different secret', () => {
    const signature = generateSignature(PAYLOAD, 'wrong-secret');
    const result = verifyGitHubWebhookSignature(PAYLOAD, signature, TEST_SECRET);
    expect(result.valid).toBe(false);
  });

  it('rejects missing signature header', () => {
    const result = verifyGitHubWebhookSignature(PAYLOAD, null, TEST_SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Missing X-Hub-Signature-256');
  });

  it('rejects malformed signature header without sha256 prefix', () => {
    const result = verifyGitHubWebhookSignature(PAYLOAD, 'invalid-format-1234', TEST_SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Malformed signature header');
  });

  it('rejects verification if webhook secret is empty', () => {
    const signature = generateSignature(PAYLOAD, TEST_SECRET);
    const result = verifyGitHubWebhookSignature(PAYLOAD, signature, '');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('GITHUB_WEBHOOK_SECRET is not configured');
  });
});
