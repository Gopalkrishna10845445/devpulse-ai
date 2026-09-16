/**
 * Phase 4 — Repository Indexing API Route
 *
 * POST /api/repository/index
 * Body: { repositoryId: string, commitSha?: string, preloadedIndex?: RepositoryIndex, preloadedIntelligence?: CodebaseIntelligence }
 */

import { NextResponse } from 'next/server';
import { globalRAGPipeline } from '@/lib/rag/ragPipeline';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { repositoryId, preloadedIndex, preloadedIntelligence } = body;

    if (!repositoryId || typeof repositoryId !== 'string' || !repositoryId.includes('/')) {
      return NextResponse.json(
        { error: 'Valid repositoryId in "owner/repo" format is required.' },
        { status: 400 }
      );
    }

    const { status, chunks } = await globalRAGPipeline.indexRepository(
      repositoryId.trim(),
      preloadedIndex,
      preloadedIntelligence
    );

    return NextResponse.json(
      {
        status: status.isIndexed ? 'completed' : 'failed',
        repositoryId: status.repositoryId,
        commitSha: status.commitSha,
        filesIndexed: status.filesIndexed,
        chunksIndexed: status.chunksIndexed,
        indexVersion: status.indexVersion,
        indexedAt: status.indexedAt,
        sampleChunks: chunks.slice(0, 5).map(c => ({
          id: c.id,
          filePath: c.filePath,
          symbolName: c.symbolName,
          startLine: c.startLine,
          endLine: c.endLine,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API /api/repository/index] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to index repository.' },
      { status: 500 }
    );
  }
}
