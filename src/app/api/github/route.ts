import { NextResponse } from 'next/server';
import { fetchGitHubTelemetry } from '@/lib/githubAnalyzer';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username query parameter is required.' }, { status: 400 });
    }

    const telemetry = await fetchGitHubTelemetry(username);
    return NextResponse.json(telemetry);
  } catch (error: any) {
    console.error('[API /api/github] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch GitHub telemetry.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required in JSON body.' }, { status: 400 });
    }

    const telemetry = await fetchGitHubTelemetry(username);
    return NextResponse.json(telemetry);
  } catch (error: any) {
    console.error('[API /api/github] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch GitHub telemetry.' }, { status: 500 });
  }
}
