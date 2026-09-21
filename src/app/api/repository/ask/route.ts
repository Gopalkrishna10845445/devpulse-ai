/**
 * Phase 4 & Production Phase 2 — Codebase Grounded Q&A API Route
 *
 * POST /api/repository/ask
 * Body: { repositoryId: string, commitSha?: string, question: string, conversationHistory?: ConversationMessage[], preloadedIndex?: RepositoryIndex, preloadedIntelligence?: CodebaseIntelligence }
 */

import { NextResponse } from 'next/server';
import { globalRAGPipeline } from '@/lib/rag/ragPipeline';
import { requireAuth, authorizeRepositoryAccess, createAuthErrorResponse } from '@/lib/auth/accessControl';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req);

    const body = await req.json().catch(() => ({}));
    const { repositoryId, commitSha, question, conversationHistory, preloadedIndex, preloadedIntelligence } = body;

    if (!repositoryId || typeof repositoryId !== 'string') {
      return NextResponse.json(
        { error: 'Valid repositoryId is required.' },
        { status: 400 }
      );
    }

    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json(
        { error: 'Question is required.' },
        { status: 400 }
      );
    }

    if (question.length > 1000) {
      return NextResponse.json(
        { error: 'Question length exceeds 1000 characters.' },
        { status: 400 }
      );
    }

    // Repository Authorization Check with IDOR defense
    const authRes = await authorizeRepositoryAccess(user, repositoryId, 'qa');
    if (!authRes.authorized) {
      return NextResponse.json(
        { error: authRes.reason || 'Access denied to repository.' },
        { status: 403 }
      );
    }

    const response = await globalRAGPipeline.askQuestion(
      {
        repositoryId: repositoryId.trim(),
        commitSha,
        question: question.trim(),
        conversationHistory,
      },
      preloadedIndex,
      preloadedIntelligence
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    if (error.statusCode) {
      return createAuthErrorResponse(error);
    }
    console.error('[API /api/repository/ask] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process question.' },
      { status: 500 }
    );
  }
}
