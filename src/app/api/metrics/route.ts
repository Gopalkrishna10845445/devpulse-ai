/**
 * Production Phase 4 — Prometheus Metrics Exposition Endpoint
 *
 * GET /api/metrics
 *
 * Exposes system and application metrics in standard Prometheus text format.
 * Strictly avoids leaking tokens, user IDs, or code content in metric labels.
 */

import { NextResponse } from 'next/server';
import { metrics } from '@/lib/observability/metrics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const text = metrics.renderPrometheusMetrics();

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
