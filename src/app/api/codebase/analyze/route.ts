import { NextResponse } from 'next/server';
import { IngestionError, ingestRepository } from '@/lib/repository/repositoryIngestor';
import { analyzeCodebase } from '@/lib/intelligence/codebaseAnalyzer';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';
import { ReportDatabaseRepository } from '@/lib/db/repositories';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);

    const { searchParams } = new URL(req.url);
    const fullName = searchParams.get('fullName') || searchParams.get('repository') || searchParams.get('repo');
    const owner = searchParams.get('owner');
    const repo = searchParams.get('name') || searchParams.get('r');
    const branch = searchParams.get('branch') || undefined;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const targetRepoId = fullName || (owner && repo ? `${owner}/${repo}` : null);
    if (!targetRepoId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REPOSITORY',
            message: 'Please provide repository coordinates (fullName or owner and repo query parameters).',
          },
        },
        { status: 400 }
      );
    }

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

    // 1. Check PostgreSQL persistence cache if not forcing refresh
    if (!forceRefresh) {
      try {
        const cachedIntelligence = await ReportDatabaseRepository.getCodebaseIntelligence(targetRepoId, branch);
        if (cachedIntelligence) {
          return NextResponse.json({
            success: true,
            intelligence: cachedIntelligence,
            source: 'database',
          });
        }
      } catch {
        // Fallback to live analysis
      }
    }

    // 2. Perform live ingestion & analysis
    const repoIndex = await ingestRepository({
      fullName: targetRepoId,
      branch,
    });

    const intelligence = await analyzeCodebase({ index: repoIndex });

    return NextResponse.json({
      success: true,
      intelligence,
      source: 'computed',
    });
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    console.error('[API GET /api/codebase/analyze] Error:', error.message || error);

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

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);

    const body = await req.json().catch(() => ({}));
    const { owner, repository, fullName, url, branch, index: existingIndex, forceRefresh } = body;

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

    // Check DB persistence if not forceRefresh and no existing index provided
    if (!forceRefresh && !existingIndex && targetRepoId) {
      try {
        const cachedIntelligence = await ReportDatabaseRepository.getCodebaseIntelligence(targetRepoId, branch);
        if (cachedIntelligence) {
          return NextResponse.json({
            success: true,
            intelligence: cachedIntelligence,
            source: 'database',
          });
        }
      } catch {
        // Fallback to analysis
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
      source: 'computed',
    });
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    console.error('[API POST /api/codebase/analyze] Error:', error.message || error);

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
