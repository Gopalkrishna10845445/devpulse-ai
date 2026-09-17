/**
 * Phase 9 — Webhook Events Observability Route
 *
 * GET /api/github/webhook/events
 *
 * Returns audit stream of recent webhook deliveries and background analysis jobs.
 */

import { NextResponse } from 'next/server';
import { WebhookJobManager } from '@/lib/webhook/jobManager';

export async function GET() {
  const deliveries = WebhookJobManager.getRecentDeliveries(30);
  const jobs = WebhookJobManager.getRecentJobs(30);

  return NextResponse.json({
    success: true,
    deliveries,
    jobs,
    count: {
      deliveries: deliveries.length,
      jobs: jobs.length,
    },
  });
}
