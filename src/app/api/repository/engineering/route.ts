/**
 * Phase 5 & Production Phase 2 — Engineering Intelligence API Route
 *
 * GET /api/repository/engineering?repositoryId=owner/repo&commitSha=sha&refresh=true
 * POST /api/repository/engineering
 */

import { NextResponse } from 'next/server';
import { analyzeCodebase } from '@/lib/intelligence/codebaseAnalyzer';
import { ingestRepository } from '@/lib/repository/repositoryIngestor';
import { analyzeEngineeringHealth } from '@/lib/engineering/engineeringEngine';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';
import { ReportDatabaseRepository } from '@/lib/db/repositories';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const repositoryId = searchParams.get('repositoryId') || searchParams.get('fullName') || searchParams.get('repo');
    const commitSha = searchParams.get('commitSha') || searchParams.get('branch');
    const refresh = searchParams.get('refresh') === 'true';

    if (!repositoryId || typeof repositoryId !== 'string' || !repositoryId.trim()) {
      return NextResponse.json(
        { error: 'Valid repositoryId parameter (e.g. "owner/repo") is required.' },
        { status: 400 }
      );
    }

    const trimmedRepoId = repositoryId.trim();

    // Repository Authorization Check with IDOR defense
    const authRes = await authorizeRepositoryAccess(user, trimmedRepoId, 'engineering');
    if (!authRes.authorized) {
      return NextResponse.json(
        { error: authRes.reason || 'Access denied to repository.' },
        { status: 403 }
      );
    }

    // Check database cache first if not refreshing
    const effectiveSha = commitSha || 'main';
    if (!refresh) {
      const cached = await ReportDatabaseRepository.getEngineeringReport(trimmedRepoId, effectiveSha);
      if (cached) {
        return NextResponse.json({ success: true, report: cached, cached: true }, { status: 200 });
      }
    }

    // Run ingestion and analysis
    const repoIndex = await ingestRepository({
      fullName: trimmedRepoId.includes('/') ? trimmedRepoId : undefined,
      url: trimmedRepoId.startsWith('http') ? trimmedRepoId : undefined,
      branch: commitSha || undefined,
    });

    const intelligence = await analyzeCodebase({ index: repoIndex });
    const report = await analyzeEngineeringHealth({
      repoIndex,
      intelligence,
    });

    // Persist to PostgreSQL
    await ReportDatabaseRepository.saveEngineeringReport(
      trimmedRepoId,
      report.summary.commitSha || effectiveSha,
      report
    );

    return NextResponse.json({ success: true, report }, { status: 200 });
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    console.error('[API GET /api/repository/engineering] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate engineering health report.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);

    const body = await req.json().catch(() => ({}));
    const {
      repositoryId,
      commitSha,
      preloadedIndex,
      preloadedIntelligence,
      preloadedGithub,
      refresh,
    } = body;

    if (!repositoryId || typeof repositoryId !== 'string' || !repositoryId.trim()) {
      return NextResponse.json(
        { error: 'Valid repositoryId (e.g. "owner/repo") is required.' },
        { status: 400 }
      );
    }

    const trimmedRepoId = repositoryId.trim();

    // Repository Authorization Check with IDOR defense
    const authRes = await authorizeRepositoryAccess(user, trimmedRepoId, 'engineering');
    if (!authRes.authorized) {
      return NextResponse.json(
        { error: authRes.reason || 'Access denied to repository.' },
        { status: 403 }
      );
    }

    const effectiveSha = commitSha || (preloadedIndex as any)?.commitSha || preloadedIndex?.repository?.defaultBranch || 'main';

    // Check database cache first if not explicitly refreshing
    if (!refresh && !preloadedIndex && !preloadedIntelligence) {
      const cached = await ReportDatabaseRepository.getEngineeringReport(trimmedRepoId, effectiveSha);
      if (cached) {
        return NextResponse.json({ success: true, report: cached, cached: true }, { status: 200 });
      }
    }

    // 1. Ingest / load repository index
    let repoIndex = preloadedIndex;
    if (!repoIndex) {
      try {
        repoIndex = await ingestRepository({
          fullName: trimmedRepoId.includes('/') && !trimmedRepoId.startsWith('http') ? trimmedRepoId : undefined,
          url: trimmedRepoId.startsWith('http') ? trimmedRepoId : undefined,
          owner: !trimmedRepoId.includes('/') && !trimmedRepoId.startsWith('http') ? trimmedRepoId : undefined,
          branch: commitSha,
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            error: err.message || 'Failed to ingest repository for engineering analysis.',
            code: err.code || 'INGESTION_FAILED',
          },
          { status: 502 }
        );
      }
    }

    // 2. Extract / load codebase intelligence
    let intelligence = preloadedIntelligence;
    if (!intelligence) {
      intelligence = await analyzeCodebase({
        index: repoIndex,
      });

      if (intelligence.status === 'failed') {
        return NextResponse.json(
          { error: 'Failed to analyze codebase intelligence for engineering metrics.' },
          { status: 502 }
        );
      }
    }

    // 3. Run deterministic Engineering Intelligence analysis
    const report = await analyzeEngineeringHealth({
      repoIndex,
      intelligence,
      github: preloadedGithub || null,
    });

    // 4. Persist to PostgreSQL database
    await ReportDatabaseRepository.saveEngineeringReport(
      trimmedRepoId,
      report.summary.commitSha || effectiveSha,
      report
    );

    return NextResponse.json(
      {
        success: true,
        report,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    console.error('[API POST /api/repository/engineering] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate engineering health report.' },
      { status: 500 }
    );
  }
}
