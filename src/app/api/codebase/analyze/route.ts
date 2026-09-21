import { NextResponse } from 'next/server';
import { IngestionError, ingestRepository } from '@/lib/repository/repositoryIngestor';
import { analyzeCodebase } from '@/lib/intelligence/codebaseAnalyzer';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);

    const body = await req.json().catch(() => ({}));
    const { owner, repository, fullName, url, branch, index: existingIndex } = body;

    const targetRepoId = fullName || (owner && repository ? `${owner}/${repository}` : url || (existingIndex && existingIndex.repository?.fullName));
    if (targetRepoId) {
      const authRes = await authorizeRepositoryAccess(user, targetRepoId, 'analyze');
      if (!authRes.authorized) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: authRes.reason || 'Access denied to repository.',
            },
          },
          { status: 403 }
        );
      }
    }

    let repoIndex = existingIndex;

    // If no pre-computed index provided, ingest the repository first
    if (!repoIndex) {
      if (!owner && !repository && !fullName && !url) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_REPOSITORY',
              message: 'Please provide repository coordinates (owner/repo or URL) or a pre-ingested repository index.',
            },
          },
          { status: 400 }
        );
      }

      repoIndex = await ingestRepository({
        owner,
        repository,
        fullName,
        url,
        branch,
      });
    }

    const intelligence = await analyzeCodebase({ index: repoIndex });

    return NextResponse.json({
      success: true,
      intelligence,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    console.error('[API /api/codebase/analyze] Error:', error.message || error);

    if (error instanceof IngestionError) {
      let status = 500;
      if (error.code === 'INVALID_REPOSITORY') status = 400;
      else if (error.code === 'REPOSITORY_NOT_FOUND' || error.code === 'EMPTY_REPOSITORY') status = 404;
      else if (error.code === 'ACCESS_DENIED') status = 403;
      else if (error.code === 'RATE_LIMITED') status = 429;

      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYSIS_FAILED',
          message: error.message || 'Failed to complete codebase intelligence analysis.',
        },
      },
      { status: 500 }
    );
  }
}
