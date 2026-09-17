/**
 * Phase 7 — AI Code Fix Generation API Route
 *
 * POST /api/repository/fix
 * Body: {
 *   repositoryId: string,
 *   commitSha?: string,
 *   findingId: string,
 *   category: 'security' | 'engineering',
 *   filePath: string,
 *   symbol?: string,
 *   lineRange?: string,
 *   findingTitle?: string,
 *   findingDescription?: string,
 *   findingRule?: string,
 *   findingRecommendation?: string,
 *   evidence?: any,
 *   preloadedIndex?: RepositoryIndex,
 *   preloadedIntelligence?: CodebaseIntelligence
 * }
 */

import { NextResponse } from 'next/server';
import { globalFixEngine } from '@/lib/fixes/fixEngine';
import { CodeFixRequest } from '@/lib/fixes/types';
import { analyzeCodebase } from '@/lib/intelligence/codebaseAnalyzer';
import { ingestRepository } from '@/lib/repository/repositoryIngestor';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      repositoryId,
      commitSha,
      findingId,
      category = 'security',
      filePath,
      symbol,
      lineRange,
      findingTitle,
      findingDescription,
      findingRule,
      findingRecommendation,
      evidence,
      preloadedIndex,
      preloadedIntelligence,
    } = body;

    if (!repositoryId || typeof repositoryId !== 'string' || !repositoryId.trim()) {
      return NextResponse.json(
        { error: 'Valid repositoryId (e.g. "owner/repo") is required.' },
        { status: 400 }
      );
    }
    if (!findingId || typeof findingId !== 'string' || !findingId.trim()) {
      return NextResponse.json(
        { error: 'Valid findingId is required to generate a code fix.' },
        { status: 400 }
      );
    }
    if (!filePath || typeof filePath !== 'string' || !filePath.trim()) {
      return NextResponse.json(
        { error: 'Valid target filePath is required to generate a code fix.' },
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
            error: err.message || 'Failed to ingest repository for code fix generation.',
            code: err.code || 'INGESTION_FAILED',
          },
          { status: 502 }
        );
      }
    }

    // 2. Load codebase intelligence
    let intelligence = preloadedIntelligence;
    if (!intelligence && repoIndex) {
      try {
        intelligence = await analyzeCodebase({ index: repoIndex });
      } catch {
        intelligence = null;
      }
    }

    // 3. Build Fix Request
    const fixRequest: CodeFixRequest = {
      repositoryId: trimmedRepoId,
      commitSha: commitSha || repoIndex.repository?.defaultBranch || 'main',
      findingId,
      category,
      filePath: filePath.trim(),
      symbol,
      lineRange,
      findingTitle,
      findingDescription,
      findingRule,
      findingRecommendation,
      evidence,
    };

    // 4. Generate Code Fix Proposal
    const proposal = await globalFixEngine.generateFix(fixRequest, {
      repoIndex,
      intelligence,
    });

    return NextResponse.json(
      {
        success: true,
        proposal,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API /api/repository/fix] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate code fix proposal.' },
      { status: 500 }
    );
  }
}
