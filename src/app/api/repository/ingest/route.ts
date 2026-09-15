import { NextResponse } from 'next/server';
import { IngestionError, ingestRepository } from '@/lib/repository/repositoryIngestor';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { owner, repository, fullName, url, branch } = body;

    if (!owner && !repository && !fullName && !url) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REPOSITORY',
            message: 'Please provide repository coordinates (owner and repository, fullName, or GitHub URL).',
          },
        },
        { status: 400 }
      );
    }

    const index = await ingestRepository({
      owner,
      repository,
      fullName,
      url,
      branch,
    });

    return NextResponse.json({
      success: true,
      index,
    });
  } catch (error: any) {
    console.error('[API /api/repository/ingest] Error:', error.message || error);

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
            retryAfterSeconds: error.retryAfterSeconds,
          },
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INGESTION_FAILED',
          message: error.message || 'An unexpected error occurred during repository ingestion.',
        },
      },
      { status: 500 }
    );
  }
}
