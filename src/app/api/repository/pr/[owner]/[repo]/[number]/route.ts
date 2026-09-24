/**
 * Phase 8 — Repository Pull Request Details API Route
 *
 * GET /api/repository/pr/[owner]/[repo]/[number]
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchPullRequestMetadata, fetchPullRequestFiles, fetchPullRequestDiff, GitHubPRError } from '@/lib/pr/githubPRFetcher';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';

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

    const [pullRequest, changedFiles, rawDiff] = await Promise.all([
      fetchPullRequestMetadata(owner, repo, prNumber),
      fetchPullRequestFiles(owner, repo, prNumber),
      fetchPullRequestDiff(owner, repo, prNumber),
    ]);

    return NextResponse.json({
      success: true,
      repositoryId,
      pullRequest,
      changedFiles,
      diffSummary: {
        totalFiles: changedFiles.length,
        additions: pullRequest.additions,
        deletions: pullRequest.deletions,
        diffLength: rawDiff.length,
      },
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
        error: err.message || 'An unexpected error occurred while retrieving Pull Request details.',
      },
      { status: 500 }
    );
  }
}
