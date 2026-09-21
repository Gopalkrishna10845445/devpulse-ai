/**
 * Production Phase 4 — Authenticated Server-Sent Events (SSE) Endpoint
 *
 * GET /api/events/job/[jobId]
 *
 * Streams real-time progress events for background repository analysis and webhook processing.
 * Enforces session authentication and repository authorization before establishing the stream.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAuthErrorResponse } from '@/lib/auth/accessControl';
import { SSEEventBus } from '@/lib/sse/eventBus';
import { BaseSSEEvent } from '@/lib/sse/types';
import { queueManager } from '@/lib/queue/queueManager';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // 1. Authenticate Request
    const user = await requireAuth(req);

    const jobId = params.jobId;
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // 2. Validate Job exists
    const jobStatus = await queueManager.getJobStatus(jobId);
    if (!jobStatus) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const lastEventId = req.headers.get('last-event-id');
    const channel = `job:${jobId}`;

    // 3. Create SSE ReadableStream
    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Send initial event with current status
        const initialEvent: BaseSSEEvent = {
          id: `init_${Date.now()}`,
          type: 'job.progress',
          channel,
          timestamp: new Date().toISOString(),
          data: {
            jobId,
            status: jobStatus.status,
            summary: `Initial status: ${jobStatus.status}`,
          },
        };

        const initialMsg = `id: ${initialEvent.id}\nevent: ${initialEvent.type}\ndata: ${JSON.stringify(initialEvent.data)}\n\n`;
        controller.enqueue(encoder.encode(initialMsg));

        // Subscribe to live events
        unsubscribe = SSEEventBus.subscribe(
          channel,
          (event) => {
            const msg = `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
            try {
              controller.enqueue(encoder.encode(msg));
            } catch {
              // Stream may be closed
            }
          },
          lastEventId
        );

        // 15-second heartbeat ping to keep connection alive
        heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
          }
        }, 15000);
      },
      cancel() {
        if (unsubscribe) unsubscribe();
        if (heartbeatInterval) clearInterval(heartbeatInterval);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    if (err.statusCode) {
      return createAuthErrorResponse(err);
    }
    return NextResponse.json({ error: err.message || 'SSE connection error' }, { status: 500 });
  }
}
