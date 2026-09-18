/**
 * Phase 10 — DevPilot Agent Action Approval API Route
 *
 * POST /api/agent/approve
 * Body: ApprovalRequest
 * Returns: ApprovalResponse
 */

import { NextResponse } from 'next/server';
import { DevPilotAgentEngine } from '@/lib/agent/agentEngine';
import { ApprovalRequest } from '@/lib/agent/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { traceId, actionId, repositoryId, commitSha, expectedDiffHash, decision, reason } = body;

    if (!traceId || !actionId || !repositoryId || !commitSha || !decision) {
      return NextResponse.json(
        {
          error: 'Missing required approval fields: traceId, actionId, repositoryId, commitSha, and decision.',
        },
        { status: 400 }
      );
    }

    if (decision !== 'approve' && decision !== 'reject') {
      return NextResponse.json(
        { error: 'Decision must be either "approve" or "reject".' },
        { status: 400 }
      );
    }

    const approvalRequest: ApprovalRequest = {
      traceId,
      actionId,
      repositoryId,
      commitSha,
      expectedDiffHash,
      decision,
      reason,
    };

    const response = await DevPilotAgentEngine.approveAction(approvalRequest);

    return NextResponse.json(response);
  } catch (error: any) {
    const traceId = `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    console.error(`[Agent Approval Error] [${traceId}]:`, error);
    return NextResponse.json(
      {
        error: 'DevPilot Agent approval failed. Please check server logs.',
        traceId,
      },
      { status: 500 }
    );
  }
}
