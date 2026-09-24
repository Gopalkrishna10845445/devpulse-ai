/**
 * Phase 10 & Production Phase 2 — DevPilot Agent Run API Route
 *
 * POST /api/agent/run
 * Body: AgentRequest
 * Returns: AgentResponse
 */

import { NextResponse } from 'next/server';
import { DevPilotAgentEngine } from '@/lib/agent/agentEngine';
import { AgentRequest } from '@/lib/agent/types';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);

    const body = await req.json().catch(() => ({}));
    const rawRepo = body.repositoryId || body.repository;
    const rawMessage = body.userMessage || body.request;
    const rawCommit = body.commitSha || body.branch || body.commit;
    const { context = {}, requestedMode, permissions, conversationId } = body;

    if (body.prNumber && !context.activePRNumber) {
      context.activePRNumber = typeof body.prNumber === 'number' ? body.prNumber : parseInt(body.prNumber, 10);
    }

    if (!rawRepo || typeof rawRepo !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "repositoryId" parameter.' },
        { status: 400 }
      );
    }

    if (!rawMessage || typeof rawMessage !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "userMessage" parameter.' },
        { status: 400 }
      );
    }

    const repositoryId = rawRepo.trim();
    const userMessage = rawMessage.trim();

    // Repository Authorization Check
    const authRes = await authorizeRepositoryAccess(user, repositoryId, 'analyze');
    if (!authRes.authorized) {
      return NextResponse.json(
        { error: authRes.reason || 'Access denied to repository.' },
        { status: 403 }
      );
    }

    const agentRequest: AgentRequest = {
      repositoryId,
      commitSha: rawCommit ? String(rawCommit).trim() : undefined,
      userMessage,
      context,
      requestedMode,
      permissions,
      conversationId,
    };

    const response = await DevPilotAgentEngine.run(agentRequest);

    return NextResponse.json(response);
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    const traceId = `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    console.error(`[Agent Execution Error] [${traceId}]:`, error);
    return NextResponse.json(
      {
        error: 'DevPilot Agent execution failed. Please check server logs.',
        traceId,
      },
      { status: 500 }
    );
  }
}
