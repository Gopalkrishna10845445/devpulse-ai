/**
 * Phase 8 — PR Review API Route
 *
 * POST /api/github/pull-request/review
 *
 * Accepts repository coordinates and PR number, fetches authoritative GitHub data,
 * evaluates deterministic rules, and returns a reviewable PullRequestReview.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PRReviewEngine } from '@/lib/pr/prReviewEngine';
import { GitHubPRError, parseRepoOwnerAndName } from '@/lib/pr/githubPRFetcher';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { repositoryId, pullRequestNumber, baseSha, headSha, preloadedIndex, preloadedIntelligence } = body;

    if (!repositoryId || typeof repositoryId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "repositoryId" parameter.' },
        { status: 400 }
      );
    }

    const prNumber = parseInt(pullRequestNumber, 10);
    if (isNaN(prNumber) || prNumber <= 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "pullRequestNumber" parameter (must be positive integer).' },
        { status: 400 }
      );
    }

    // Verify repository coordinate validity
    try {
      parseRepoOwnerAndName(repositoryId);
    } catch (coordErr: any) {
      return NextResponse.json(
        { success: false, error: coordErr.message },
        { status: 400 }
      );
    }

    const review = await PRReviewEngine.reviewPullRequest({
      repositoryId,
      pullRequestNumber: prNumber,
      baseSha,
      headSha,
      preloadedIndex,
      preloadedIntelligence,
    });

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (err: any) {
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
