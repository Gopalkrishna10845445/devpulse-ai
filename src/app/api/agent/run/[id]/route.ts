/**
 * Phase 10 — DevPilot Agent Run Status API Route
 *
 * GET /api/agent/run/:id
 * Returns: AgentTrace / AgentRun status and activity
 */

import { NextResponse } from 'next/server';
import { DevPilotAgentEngine } from '@/lib/agent/agentEngine';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';

export const dynamic = 'force-dynamic';

export async function GET(
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
      const authRes = await authorizeRepositoryAccess(user, repoId, 'view');
      if (!authRes.authorized) {
        return NextResponse.json(
          { error: authRes.reason || 'Access denied to agent run.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      runId: run.id || run.traceId,
      traceId: run.id || run.traceId,
      repositoryId: repoId,
      commitSha: run.commitSha || run.commit_sha,
      status: run.finalStatus || run.status,
      intent: run.classifiedMode || run.intent,
      plan: run.plan || (run.plan_summary ? run.plan_summary.split('\n') : []),
      toolExecutions: run.toolInvocations || run.tool_executions || [],
      stepsCount: run.stepsCount || run.steps_count || (run.toolInvocations || []).length,
      createdAt: run.startTime || run.created_at,
      completedAt: run.endTime,
      trace: run,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    console.error(`[Agent Get Run Error]:`, error);
    return NextResponse.json(
      { error: 'Failed to retrieve agent run details.' },
      { status: 500 }
    );
  }
}
