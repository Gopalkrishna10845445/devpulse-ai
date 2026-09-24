import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_BASE = 'https://api.github.com';

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'DevPilot-Repository-Ingestor/2.0',
    Accept: 'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username')?.trim();

    const cleanUsername = username ? username.replace(/[^a-zA-Z0-9._-]/g, '') : '';
    const headers = buildHeaders();

    const url = cleanUsername
      ? `${API_BASE}/users/${encodeURIComponent(cleanUsername)}/repos?sort=updated&per_page=30`
      : process.env.GITHUB_TOKEN
      ? `${API_BASE}/user/repos?sort=updated&per_page=30`
      : null;

    if (!url) {
      return NextResponse.json({ error: 'Username query parameter is required.' }, { status: 400 });
    }

    const res = await fetch(url, { headers });

    if (res.status === 404) {
      return NextResponse.json(
        { error: cleanUsername ? `GitHub user "${cleanUsername}" was not found.` : 'Repositories not found.' },
        { status: 404 }
      );
    }
    if (res.status === 403 || res.status === 429) {
      return NextResponse.json(
        { error: 'GitHub API rate limit reached. Set GITHUB_TOKEN in .env.local to raise the limit.' },
        { status: 429 }
      );
    }
    if (!res.ok) {
      return NextResponse.json({ error: `GitHub API returned status ${res.status}` }, { status: 500 });
    }

    const repos = await res.json() as any[];
    const formatted = Array.isArray(repos)
      ? repos.map(r => ({
          name: r.name,
          owner: r.owner?.login || cleanUsername,
          fullName: r.full_name,
          description: r.description || '',
          defaultBranch: r.default_branch || 'main',
          language: r.language || 'Unknown',
          stars: r.stargazers_count || 0,
          forks: r.forks_count || 0,
          isPrivate: Boolean(r.private),
          isFork: Boolean(r.fork),
          updatedAt: r.updated_at ? String(r.updated_at).split('T')[0] : '',
        }))
      : [];

    return NextResponse.json({ repos: formatted });
  } catch (error: any) {
    console.error('[API /api/repository/list] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to list repositories.' }, { status: 500 });
  }
}
