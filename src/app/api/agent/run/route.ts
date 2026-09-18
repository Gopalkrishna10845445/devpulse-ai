/**
 * Phase 10 — DevPilot Agent Run API Route
 *
 * POST /api/agent/run
 * Body: AgentRequest
 * Returns: AgentResponse
 */

import { NextResponse } from 'next/server';
import { DevPilotAgentEngine } from '@/lib/agent/agentEngine';
import { AgentRequest } from '@/lib/agent/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
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
    console.error('Agent execution error:', error);
    return NextResponse.json(
      {
        error: 'DevPilot Agent execution failed.',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
