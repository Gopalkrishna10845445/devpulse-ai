/**
 * Phase 6 — Security Intelligence API Route
 *
 * POST /api/repository/security
 * Body: {
 *   repositoryId: string,
 *   commitSha?: string,
 *   preloadedIndex?: RepositoryIndex,
 *   preloadedIntelligence?: CodebaseIntelligence,
 *   vulnerabilityOptions?: VulnerabilityScanOptions
 * }
 */

import { NextResponse } from 'next/server';
import { analyzeCodebase } from '@/lib/intelligence/codebaseAnalyzer';
import { ingestRepository } from '@/lib/repository/repositoryIngestor';
import { analyzeSecurityHealth } from '@/lib/security/securityEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      repositoryId,
      commitSha,
      preloadedIndex,
      preloadedIntelligence,
      vulnerabilityOptions,
    } = body;

    if (!repositoryId || typeof repositoryId !== 'string' || !repositoryId.trim()) {
      return NextResponse.json(
        { error: 'Valid repositoryId (e.g. "owner/repo") is required.' },
        { status: 400 }
      );
    }

    const trimmedRepoId = repositoryId.trim();

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
        // Non-blocking: security engine can operate on repoIndex even if AST intelligence fails partially
        intelligence = null;
      }
    }

    // 3. Run deterministic Security Intelligence analysis
    const report = await analyzeSecurityHealth({
      repoIndex,
      intelligence,
      vulnerabilityOptions,
    });

    return NextResponse.json(
      {
        success: true,
        report,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API /api/repository/security] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate security health report.' },
      { status: 500 }
    );
  }
}
