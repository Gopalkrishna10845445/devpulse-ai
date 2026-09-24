/**
 * Phase 7 — Reject Fix Proposal API Route
 *
 * POST /api/fixes/[id]/reject
 */

import { NextResponse } from 'next/server';
import { globalFixEngine } from '@/lib/fixes/fixEngine';
import { FixDatabaseRepository } from '@/lib/db/repositories';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';
import { CodeFixProposal } from '@/lib/fixes/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const proposalId = params.id;

    if (!proposalId) {
      return NextResponse.json({ error: 'Proposal ID is required.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { reason } = body;

    let proposal: CodeFixProposal | null | undefined = globalFixEngine.getProposal(proposalId);
    if (!proposal) {
      proposal = await FixDatabaseRepository.getProposal(proposalId);
    }

    if (!proposal) {
      return NextResponse.json({ error: `Proposal '${proposalId}' not found.` }, { status: 404 });
    }

    const authRes = await authorizeRepositoryAccess(user, proposal.repositoryId, 'approve_fix');
    if (!authRes.authorized) {
      return NextResponse.json({ error: authRes.reason || 'Access denied to reject proposal.' }, { status: 403 });
    }

    const updated = await globalFixEngine.reviewFix(proposalId, 'reject', reason);

    return NextResponse.json({
      success: true,
      proposal: updated,
      message: `Proposal ${proposalId} rejected.`,
    }, { status: 200 });
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    return NextResponse.json({ error: error.message || 'Failed to reject proposal.' }, { status: 500 });
  }
}
