/**
 * Phase 9 — GitHub Webhook Signature Verifier
 *
 * Implements cryptographic HMAC-SHA256 verification using X-Hub-Signature-256
 * and constant-time string comparison to prevent timing attacks.
 */

import crypto from 'crypto';
import { WebhookVerificationResult } from './types';

/**
 * Verifies the GitHub X-Hub-Signature-256 header against the raw request body.
 */
export function verifyGitHubWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret?: string
): WebhookVerificationResult {
  const webhookSecret = secret || process.env.GITHUB_WEBHOOK_SECRET;

  if (!webhookSecret || !webhookSecret.trim()) {
    return {
      valid: false,
      reason: 'GITHUB_WEBHOOK_SECRET is not configured on the server.',
    };
  }

  if (!signatureHeader || !signatureHeader.trim()) {
    return {
      valid: false,
      reason: 'Missing X-Hub-Signature-256 header in webhook request.',
    };
  }

  const parts = signatureHeader.trim().split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return {
      valid: false,
      reason: 'Malformed signature header. Expected format: sha256=<hex_digest>',
    };
  }

  const expectedSignatureHex = parts[1].toLowerCase();

  try {
    const hmac = crypto.createHmac('sha256', webhookSecret.trim());
    hmac.update(rawBody, 'utf8');
    const computedSignatureHex = hmac.digest('hex');

    const expectedBuffer = Buffer.from(expectedSignatureHex, 'hex');
    const computedBuffer = Buffer.from(computedSignatureHex, 'hex');

    if (expectedBuffer.length !== computedBuffer.length) {
      return {
        valid: false,
        reason: 'Signature length mismatch.',
      };
    }

    const match = crypto.timingSafeEqual(expectedBuffer, computedBuffer);

    if (!match) {
      return {
        valid: false,
        reason: 'Signature digest verification failed (payload mismatch or invalid secret).',
      };
    }

    return { valid: true };
  } catch (err: any) {
    return {
      valid: false,
      reason: `Cryptographic verification error: ${err.message}`,
    };
  }
}
