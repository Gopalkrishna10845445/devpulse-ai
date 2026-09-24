/**
 * Phase 7 — Code Fix Application & Review API Route
 *
 * POST /api/repository/fix/apply
 * Body: {
 *   proposalId: string,
 *   repositoryId: string,
 *   commitSha: string,
 *   expectedDiffHash: string,
 *   confirmedByUser: boolean,
 *   action?: 'apply' | 'approve' | 'reject',
 *   rejectionReason?: string,
 *   preloadedIndex?: RepositoryIndex
 * }
 */

import { NextResponse } from 'next/server';
import { globalFixEngine } from '@/lib/fixes/fixEngine';
import { ApplyFixRequest } from '@/lib/fixes/types';
import { ingestRepository } from '@/lib/repository/repositoryIngestor';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);

    const body = await req.json().catch(() => ({}));
    const {
      proposalId,
      repositoryId,
      commitSha,
      expectedDiffHash,
      confirmedByUser = false,
      action = 'apply',
      rejectionReason,
      preloadedIndex,
    } = body;

    if (!proposalId || typeof proposalId !== 'string') {
      return NextResponse.json(
        { error: 'Valid proposalId is required.' },
        { status: 400 }
      );
    }

    const existingProposal = globalFixEngine.getProposal(proposalId);
    const targetRepo = repositoryId || existingProposal?.repositoryId;

    if (targetRepo) {
      const requiredPermission = 'approve_fix';
      const authRes = await authorizeRepositoryAccess(user, targetRepo, requiredPermission);
      if (!authRes.authorized) {
        return NextResponse.json(
          { error: authRes.reason || 'Access denied to repository fix.' },
          { status: 403 }
        );
      }
    }

    // Handle Review Actions (approve / reject)
    if (action === 'approve' || action === 'reject') {
      const updated = await globalFixEngine.reviewFix(proposalId, action, rejectionReason);
      return NextResponse.json({
        success: true,
        proposal: updated,
        message: `Proposal ${proposalId} status updated to '${action}d'.`,
      });
    }

    // Handle Apply Action
    if (!targetRepo || !commitSha || !expectedDiffHash) {
      return NextResponse.json(
        { error: 'repositoryId, commitSha, and expectedDiffHash are required to apply a fix.' },
        { status: 400 }
      );
    }

    if (!confirmedByUser) {
      return NextResponse.json(
        { error: 'Explicit user confirmation (confirmedByUser: true) is required before applying a code patch.' },
        { status: 400 }
      );
    }

    // Load repository index
    let repoIndex = preloadedIndex;
    if (!repoIndex) {
      try {
        repoIndex = await ingestRepository({
          fullName: targetRepo.includes('/') ? targetRepo : undefined,
          branch: commitSha,
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
      commitSha,
      expectedDiffHash,
      confirmedByUser,
    };

    const result = await globalFixEngine.applyFix(applyReq, repoIndex);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    console.error('[API /api/repository/fix/apply] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply code fix proposal.' },
      { status: 400 }
    );
  }
}
