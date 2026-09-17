/**
 * Phase 9 — Webhook Job Retry Route
 *
 * POST /api/github/webhook/retry
 *
 * Manually retries a failed analysis job while maintaining idempotency and bounds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebhookJobManager } from '@/lib/webhook/jobManager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId } = body;

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "jobId" parameter.' },
        { status: 400 }
      );
    }

    const retriedJob = await WebhookJobManager.retryJob(jobId.trim());
    if (!retriedJob) {
      return NextResponse.json(
        { success: false, error: `Job with ID "${jobId}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job: retriedJob,
      message: `Job ${jobId} re-enqueued for execution.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to retry job.' },
      { status: 400 }
    );
  }
}
