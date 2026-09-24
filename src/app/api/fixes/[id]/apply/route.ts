/**
 * Phase 7 — Apply Fix Proposal API Route
 *
 * POST /api/fixes/[id]/apply
 */

import { NextResponse } from 'next/server';
import { globalFixEngine } from '@/lib/fixes/fixEngine';
import { FixDatabaseRepository } from '@/lib/db/repositories';
import { ApplyFixRequest, CodeFixProposal } from '@/lib/fixes/types';
import { ingestRepository } from '@/lib/repository/repositoryIngestor';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';

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
    const {
      repositoryId,
      commitSha,
      expectedDiffHash,
      confirmedByUser = false,
      preloadedIndex,
    } = body;

    let proposal: CodeFixProposal | null | undefined = globalFixEngine.getProposal(proposalId);
    if (!proposal) {
      proposal = await FixDatabaseRepository.getProposal(proposalId);
    }

    if (!proposal) {
      return NextResponse.json({ error: `Proposal '${proposalId}' not found.` }, { status: 404 });
    }

    const targetRepo = repositoryId || proposal.repositoryId;
    const authRes = await authorizeRepositoryAccess(user, targetRepo, 'approve_fix');
    if (!authRes.authorized) {
      return NextResponse.json({ error: authRes.reason || 'Access denied to apply proposal patch.' }, { status: 403 });
    }

    if (!confirmedByUser) {
      return NextResponse.json(
        { error: 'Explicit user confirmation (confirmedByUser: true) is required before applying a code patch.' },
        { status: 400 }
      );
    }

    const targetCommit = commitSha || proposal.commitSha;
    const diffHash = expectedDiffHash || proposal.diffHash;

    let repoIndex = preloadedIndex;
    if (!repoIndex) {
      try {
        repoIndex = await ingestRepository({
          fullName: targetRepo.includes('/') ? targetRepo : undefined,
          branch: targetCommit,
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || 'Failed to load repository state for patch application.' },
          { status: 502 }
        );
      }
    }

    const applyReq: ApplyFixRequest = {
      proposalId,
      repositoryId: targetRepo,
      commitSha: targetCommit,
      expectedDiffHash: diffHash,
      confirmedByUser,
    };

    const result = await globalFixEngine.applyFix(applyReq, repoIndex);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    console.error('[API /api/fixes/:id/apply] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply code fix proposal.' },
      { status: 400 }
    );
  }
}
