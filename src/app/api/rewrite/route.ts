import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    await req.json();
    return NextResponse.json(
      {
        unavailable: true,
        error:
          'AI rewrite is unavailable. This endpoint previously returned fabricated metrics and is disabled until a real model is connected in a later phase.',
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('[API /api/rewrite] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process rewrite request.' }, { status: 500 });
  }
}
