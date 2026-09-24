/**
 * Phase 10 — DevPilot Agent Run Cancellation API Route
 *
 * POST /api/agent/run/:id/cancel
 * Returns: Cancellation confirmation
 */

import { NextResponse } from 'next/server';
import { DevPilotAgentEngine } from '@/lib/agent/agentEngine';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const traceId = params.id;

    if (!traceId || typeof traceId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid run ID parameter.' },
        { status: 400 }
      );
    }

    const run = await DevPilotAgentEngine.getRun(traceId.trim());
    if (!run) {
      return NextResponse.json(
        { error: `Agent run with ID '${traceId}' was not found.` },
        { status: 404 }
      );
    }

    // Verify repository access for the requested run
    const repoId = run.repositoryId || run.repository_id;
    if (repoId) {
      const authRes = await authorizeRepositoryAccess(user, repoId, 'analyze');
      if (!authRes.authorized) {
        return NextResponse.json(
          { error: authRes.reason || 'Access denied to cancel agent run.' },
          { status: 403 }
        );
      }
    }

    const cancelled = await DevPilotAgentEngine.cancelRun(traceId.trim());

    return NextResponse.json({
      success: cancelled,
      runId: traceId,
      status: 'cancelled',
      message: 'Agent run has been successfully cancelled. All queued write operations are invalidated.',
    });
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    console.error(`[Agent Cancel Run Error]:`, error);
    return NextResponse.json(
      { error: 'Failed to cancel agent run.' },
      { status: 500 }
    );
  }
}
