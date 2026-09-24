/**
 * Phase 9 — GitHub Webhook Endpoint
 *
 * POST /api/webhooks/github
 *
 * Receives real GitHub webhook events, cryptographically verifies X-Hub-Signature-256,
 * deduplicates deliveries, classifies event actions, and enqueues background analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyGitHubWebhookSignature } from '@/lib/webhook/signatureVerifier';
import { parseGitHubWebhookEvent, WebhookParsingError } from '@/lib/webhook/eventParser';
import { WebhookJobManager } from '@/lib/webhook/jobManager';

export async function POST(req: NextRequest) {
  try {
    // 1. Read raw text body for cryptographic signature verification
    const rawBody = await req.text();

    const signatureHeader = req.headers.get('x-hub-signature-256');
    const deliveryId = req.headers.get('x-github-delivery');
    const eventHeader = req.headers.get('x-github-event');

    // 2. Verify HMAC-SHA256 Signature
    const verification = verifyGitHubWebhookSignature(rawBody, signatureHeader);
    if (!verification.valid) {
      return NextResponse.json(
        {
          received: false,
          error: verification.reason || 'Signature verification failed.',
        },
        { status: 401 }
      );
    }

    // 3. Replay Protection / Delivery Idempotency Check
    if (deliveryId && WebhookJobManager.isDuplicateDelivery(deliveryId)) {
      return NextResponse.json({
        received: true,
        deliveryId,
        duplicate: true,
        message: 'Delivery already received and recorded.',
      }, { status: 200 });
    }

    // 4. Parse & Sanitize Webhook Payload
    const event = parseGitHubWebhookEvent(rawBody, eventHeader, deliveryId);

    // 5. Handle Ping event immediately
    if (event.eventName === 'ping') {
      return NextResponse.json({
        received: true,
        deliveryId: event.deliveryId,
        event: 'ping',
        status: 'acknowledged',
        message: 'GitHub webhook ping received successfully.',
      }, { status: 200 });
    }

    // 6. Enqueue Background Analysis Job
    const { job, isDuplicate } = WebhookJobManager.enqueueEvent(event);

    return NextResponse.json({
      received: true,
      deliveryId: event.deliveryId,
      event: event.eventName,
      action: event.action,
      repository: event.repository.fullName,
      status: isDuplicate ? 'duplicate' : job ? 'queued' : 'ignored',
      jobId: job?.id,
    });
  } catch (err: any) {
    if (err instanceof WebhookParsingError) {
      return NextResponse.json(
        {
          received: false,
          errorCode: err.code,
          error: err.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        received: false,
        error: err.message || 'Internal server error while processing webhook.',
      },
      { status: 500 }
    );
  }
}
