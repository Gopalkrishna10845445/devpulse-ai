/**
 * Phase 5 — Engineering Intelligence Analyze API Route
 *
 * GET /api/engineering/analyze?fullName=owner/repo&branch=branch
 * POST /api/engineering/analyze
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
    const fullName = searchParams.get('fullName') || searchParams.get('repositoryId') || searchParams.get('repo');
    const branch = searchParams.get('branch') || searchParams.get('commitSha');
    const refresh = searchParams.get('refresh') === 'true';

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return NextResponse.json(
        { error: 'Valid repository fullName (e.g. "owner/repo") is required.' },
        { status: 400 }
      );
    }

    const trimmedRepo = fullName.trim();

    // Repository Authorization Check
    const authRes = await authorizeRepositoryAccess(user, trimmedRepo, 'engineering');
    if (!authRes.authorized) {
      return NextResponse.json(
        { error: authRes.reason || 'Access denied to repository.' },
        { status: 403 }
      );
    }

    const effectiveBranch = branch || 'main';

    // 1. Check database cache if not refreshing
    if (!refresh) {
      const cached = await ReportDatabaseRepository.getEngineeringReport(trimmedRepo, effectiveBranch);
      if (cached) {
        return NextResponse.json({ success: true, report: cached, cached: true }, { status: 200 });
      }
    }

    // 2. Ingest repository
    const repoIndex = await ingestRepository({
      fullName: trimmedRepo.includes('/') ? trimmedRepo : undefined,
      url: trimmedRepo.startsWith('http') ? trimmedRepo : undefined,
      branch: branch || undefined,
    });

    // 3. Analyze codebase intelligence
    const intelligence = await analyzeCodebase({ index: repoIndex });

    // 4. Run engineering health analysis
    const report = await analyzeEngineeringHealth({
      repoIndex,
      intelligence,
    });

    // 5. Persist to PostgreSQL database
    await ReportDatabaseRepository.saveEngineeringReport(
      trimmedRepo,
      report.summary.commitSha || effectiveBranch,
      report
    );

    return NextResponse.json({ success: true, report }, { status: 200 });
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    console.error('[API GET /api/engineering/analyze] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze engineering intelligence.' },
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
      preloadedGithub,
      refresh,
    } = body;

    const repoTarget = fullName || repositoryId;

    if (!repoTarget || typeof repoTarget !== 'string' || !repoTarget.trim()) {
      return NextResponse.json(
        { error: 'Valid repository fullName or repositoryId is required.' },
        { status: 400 }
      );
    }

    const trimmedRepo = repoTarget.trim();

    // Repository Authorization Check
    const authRes = await authorizeRepositoryAccess(user, trimmedRepo, 'engineering');
    if (!authRes.authorized) {
      return NextResponse.json(
        { error: authRes.reason || 'Access denied to repository.' },
        { status: 403 }
      );
    }

    const effectiveCommit = branch || commitSha || (preloadedIndex as any)?.commitSha || preloadedIndex?.repository?.defaultBranch || 'main';

    // Check database cache if not refreshing
    if (!refresh && !preloadedIndex && !preloadedIntelligence) {
      const cached = await ReportDatabaseRepository.getEngineeringReport(trimmedRepo, effectiveCommit);
      if (cached) {
        return NextResponse.json({ success: true, report: cached, cached: true }, { status: 200 });
      }
    }

    // 1. Ingest repository if not preloaded
    let repoIndex = preloadedIndex;
    if (!repoIndex) {
      repoIndex = await ingestRepository({
        fullName: trimmedRepo.includes('/') && !trimmedRepo.startsWith('http') ? trimmedRepo : undefined,
        url: trimmedRepo.startsWith('http') ? trimmedRepo : undefined,
        branch: branch || commitSha,
      });
    }

    // 2. Analyze codebase intelligence if not preloaded
    let intelligence = preloadedIntelligence;
    if (!intelligence) {
      intelligence = await analyzeCodebase({ index: repoIndex });
    }

    // 3. Run deterministic engineering analysis
    const report = await analyzeEngineeringHealth({
      repoIndex,
      intelligence,
      github: preloadedGithub || null,
    });

    // 4. Persist to PostgreSQL database
    await ReportDatabaseRepository.saveEngineeringReport(
      trimmedRepo,
      report.summary.commitSha || effectiveCommit,
      report
    );

    return NextResponse.json({ success: true, report }, { status: 200 });
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    console.error('[API POST /api/engineering/analyze] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze engineering intelligence.' },
      { status: 500 }
    );
  }
}
