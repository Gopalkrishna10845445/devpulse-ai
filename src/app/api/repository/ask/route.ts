/**
 * Phase 4 — Codebase Grounded Q&A API Route
 *
 * POST /api/repository/ask
 * Body: { repositoryId: string, commitSha?: string, question: string, conversationHistory?: ConversationMessage[], preloadedIndex?: RepositoryIndex, preloadedIntelligence?: CodebaseIntelligence }
 */

import { NextResponse } from 'next/server';
import { globalRAGPipeline } from '@/lib/rag/ragPipeline';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
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
    console.error('[API /api/repository/ask] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process question.' },
      { status: 500 }
    );
  }
}
