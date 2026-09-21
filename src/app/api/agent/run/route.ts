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
    const { repositoryId, commitSha, userMessage, context, requestedMode, permissions, conversationId } = body;

    if (!repositoryId || typeof repositoryId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "repositoryId" parameter.' },
        { status: 400 }
      );
    }

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "userMessage" parameter.' },
        { status: 400 }
      );
    }

    // Repository Authorization Check
    const authRes = await authorizeRepositoryAccess(user, repositoryId.trim(), 'analyze');
    if (!authRes.authorized) {
      return NextResponse.json(
        { error: authRes.reason || 'Access denied to repository.' },
        { status: 403 }
      );
    }

    const agentRequest: AgentRequest = {
      repositoryId: repositoryId.trim(),
      commitSha: commitSha ? commitSha.trim() : undefined,
      userMessage: userMessage.trim(),
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
