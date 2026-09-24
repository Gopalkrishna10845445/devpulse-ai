/**
 * Phase 6 & Production Phase 2 — Security Intelligence API Route
 *
 * GET /api/repository/security?fullName=owner/repo&branch=branch
 * POST /api/repository/security
 */

import { NextResponse } from 'next/server';
import { analyzeCodebase } from '@/lib/intelligence/codebaseAnalyzer';
import { ingestRepository } from '@/lib/repository/repositoryIngestor';
import { analyzeSecurityHealth } from '@/lib/security/securityEngine';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';
import { ReportDatabaseRepository } from '@/lib/db/repositories';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const repoTarget = searchParams.get('fullName') || searchParams.get('repositoryId') || searchParams.get('repo');
    const branch = searchParams.get('branch') || searchParams.get('commitSha');
    const refresh = searchParams.get('refresh') === 'true';

    if (!repoTarget || typeof repoTarget !== 'string' || !repoTarget.trim()) {
      return NextResponse.json(
        { error: 'Valid repository fullName or repositoryId is required.' },
        { status: 400 }
      );
    }

    const trimmedRepoId = repoTarget.trim();

    // Repository Authorization Check with IDOR defense
    const authRes = await authorizeRepositoryAccess(user, trimmedRepoId, 'security');
    if (!authRes.authorized) {
      return NextResponse.json(
        { error: authRes.reason || 'Access denied to repository.' },
        { status: 403 }
      );
    }

    const effectiveBranch = branch || 'main';

    // 1. Check database cache if not refreshing
    if (!refresh) {
      const cached = await ReportDatabaseRepository.getSecurityReport(trimmedRepoId, effectiveBranch);
      if (cached) {
        return NextResponse.json({ success: true, report: cached, cached: true }, { status: 200 });
      }
    }

    // 2. Ingest repository
    const repoIndex = await ingestRepository({
      fullName: trimmedRepoId.includes('/') && !trimmedRepoId.startsWith('http') ? trimmedRepoId : undefined,
      url: trimmedRepoId.startsWith('http') ? trimmedRepoId : undefined,
      branch: branch || undefined,
    });

    // 3. Extract codebase intelligence (Phase 3)
    let intelligence = null;
    try {
      intelligence = await analyzeCodebase({ index: repoIndex });
    } catch {
      intelligence = null;
    }

    // 4. Run deterministic Security Intelligence analysis
    const report = await analyzeSecurityHealth({
      repoIndex,
      intelligence,
    });

    // 5. Persist to PostgreSQL
    await ReportDatabaseRepository.saveSecurityReport(
      trimmedRepoId,
      report.summary?.commitSha || effectiveBranch,
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
    console.error('[API GET /api/repository/security] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate security health report.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);

    const body = await req.json().catch(() => ({}));
    const {
      fullName,
      repositoryId,
      branch,
      commitSha,
      preloadedIndex,
      preloadedIntelligence,
      vulnerabilityOptions,
      refresh,
    } = body;

    const repoTarget = fullName || repositoryId;

    if (!repoTarget || typeof repoTarget !== 'string' || !repoTarget.trim()) {
      return NextResponse.json(
        { error: 'Valid repositoryId or fullName (e.g. "owner/repo") is required.' },
        { status: 400 }
      );
    }

    const trimmedRepoId = repoTarget.trim();

    // Repository Authorization Check with IDOR defense
    const authRes = await authorizeRepositoryAccess(user, trimmedRepoId, 'security');
    if (!authRes.authorized) {
      return NextResponse.json(
        { error: authRes.reason || 'Access denied to repository.' },
        { status: 403 }
      );
    }

    const effectiveCommit = branch || commitSha || (preloadedIndex as any)?.commitSha || preloadedIndex?.repository?.defaultBranch || 'main';

    // Check database cache if not refreshing and no preloaded data
    if (!refresh && !preloadedIndex && !preloadedIntelligence) {
      const cached = await ReportDatabaseRepository.getSecurityReport(trimmedRepoId, effectiveCommit);
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
          branch: branch || commitSha,
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            error: err.message || 'Failed to ingest repository for security analysis.',
            code: err.code || 'INGESTION_FAILED',
          },
          { status: 502 }
        );
      }
    }

    // 2. Extract / load codebase intelligence (Phase 3)
    let intelligence = preloadedIntelligence;
    if (!intelligence && repoIndex) {
      try {
        intelligence = await analyzeCodebase({
          index: repoIndex,
        });
      } catch {
        intelligence = null;
      }
    }

    // 3. Run deterministic Security Intelligence analysis
    const report = await analyzeSecurityHealth({
      repoIndex,
      intelligence,
      vulnerabilityOptions,
    });

    // 4. Persist to PostgreSQL database
    await ReportDatabaseRepository.saveSecurityReport(
      trimmedRepoId,
      report.summary?.commitSha || effectiveCommit,
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
    console.error('[API POST /api/repository/security] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate security health report.' },
      { status: 500 }
    );
  }
}
