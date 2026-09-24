/**
 * OAuth Callback Route Unit Tests — Public Origin & Redirection Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

describe('GET /api/auth/callback — Public Origin Resolution & Error Handling', () => {
  const originalEnv = process.env.GITHUB_OAUTH_REDIRECT_URI;

  beforeEach(() => {
    process.env.GITHUB_OAUTH_REDIRECT_URI = 'https://devpulse-ai-xq7u.onrender.com/api/auth/callback';
  });

  afterEach(() => {
    process.env.GITHUB_OAUTH_REDIRECT_URI = originalEnv;
  });

  it('Case A: Uses x-forwarded-host and x-forwarded-proto when present for error redirect', async () => {
    const req = new NextRequest('http://localhost:10000/api/auth/callback?error=access_denied', {
      headers: {
        'x-forwarded-host': 'devpulse-ai-xq7u.onrender.com',
        'x-forwarded-proto': 'https',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://devpulse-ai-xq7u.onrender.com/?auth_error=oauth_denied');
  });

  it('Case B: Falls back to GITHUB_OAUTH_REDIRECT_URI origin when forwarded headers absent', async () => {
    const req = new NextRequest('http://localhost:10000/api/auth/callback?error=access_denied');

    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://devpulse-ai-xq7u.onrender.com/?auth_error=oauth_denied');
  });

  it('Case C: Handles OAuth denial redirect correctly', async () => {
    const req = new NextRequest('https://devpulse-ai-xq7u.onrender.com/api/auth/callback?error=user_cancelled_login', {
      headers: {
        'x-forwarded-host': 'devpulse-ai-xq7u.onrender.com',
        'x-forwarded-proto': 'https',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://devpulse-ai-xq7u.onrender.com/?auth_error=oauth_denied');
  });

  it('Case D: Returns 400 when authorization code is missing', async () => {
    const req = new NextRequest('https://devpulse-ai-xq7u.onrender.com/api/auth/callback');

    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.code).toBe('INVALID_REQUEST');
  });

  it('Case E: Returns 403 when CSRF state mismatch occurs', async () => {
    const req = new NextRequest('https://devpulse-ai-xq7u.onrender.com/api/auth/callback?code=abc&state=bad_state', {
      headers: {
        cookie: 'devpilot_oauth_state=expected_state',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe('CSRF_STATE_MISMATCH');
  });
});
