/**
 * Phase 8 — Repository Pull Request Review API Route
 *
 * POST /api/repository/pr/[owner]/[repo]/[number]/review
 * GET  /api/repository/pr/[owner]/[repo]/[number]/review
 */

import { NextRequest, NextResponse } from 'next/server';
import { PRReviewEngine } from '@/lib/pr/prReviewEngine';
import { GitHubPRError } from '@/lib/pr/githubPRFetcher';
import { PRDatabaseRepository } from '@/lib/db/repositories';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';

export async function POST(
  req: NextRequest,
  { params }: { params: { owner: string; repo: string; number: string } }
) {
  try {
    const user = await requireAuth(req);

    const { owner, repo, number } = params;
    if (!owner || !repo || !number) {
      return NextResponse.json(
        { success: false, error: 'Missing owner, repo, or PR number parameter.' },
        { status: 400 }
      );
    }

    const prNumber = parseInt(number, 10);
    if (isNaN(prNumber) || prNumber <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid PR number. Must be a positive integer.' },
        { status: 400 }
      );
    }

    const repositoryId = `${owner}/${repo}`;

    // Verify Repository Authorization
    const authRes = await authorizeRepositoryAccess(user, repositoryId, 'pr_review');
    if (!authRes.authorized) {
      return NextResponse.json(
        { success: false, error: authRes.reason || 'Access denied to repository.' },
        { status: 403 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Optional body
    }

    const review = await PRReviewEngine.reviewPullRequest({
      repositoryId,
      pullRequestNumber: prNumber,
      baseSha: body.baseSha,
      headSha: body.headSha,
      preloadedIndex: body.preloadedIndex,
      preloadedIntelligence: body.preloadedIntelligence,
    });

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (err: any) {
    if (err.statusCode) {
      return createAuthErrorResponse(err);
    }
    if (err instanceof GitHubPRError) {
      const status = err.statusCode || (err.code === 'NOT_FOUND' ? 404 : err.code === 'RATE_LIMITED' ? 429 : 500);
      return NextResponse.json(
        {
          success: false,
          errorCode: err.code,
          error: err.message,
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: err.message || 'An unexpected error occurred while reviewing the Pull Request.',
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { owner: string; repo: string; number: string } }
) {
  try {
    const user = await requireAuth(req);

    const { owner, repo, number } = params;
    if (!owner || !repo || !number) {
      return NextResponse.json(
        { success: false, error: 'Missing owner, repo, or PR number parameter.' },
        { status: 400 }
      );
    }

    const prNumber = parseInt(number, 10);
    if (isNaN(prNumber) || prNumber <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid PR number. Must be a positive integer.' },
        { status: 400 }
      );
    }

    const repositoryId = `${owner}/${repo}`;

    // Verify Repository Authorization
    const authRes = await authorizeRepositoryAccess(user, repositoryId, 'pr_review');
    if (!authRes.authorized) {
      return NextResponse.json(
        { success: false, error: authRes.reason || 'Access denied to repository.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const headSha = searchParams.get('headSha');

    let review: any = null;
    if (headSha) {
      review = await PRDatabaseRepository.getReviewBySha(repositoryId, prNumber, headSha);
    } else {
      review = await PRDatabaseRepository.getLatestReview(repositoryId, prNumber);
    }

    if (!review) {
      return NextResponse.json(
        { success: false, error: `No review found for PR #${prNumber} in ${repositoryId}.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (err: any) {
    if (err.statusCode) {
      return createAuthErrorResponse(err);
    }
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'An unexpected error occurred while fetching Pull Request review.',
      },
      { status: 500 }
    );
  }
}
