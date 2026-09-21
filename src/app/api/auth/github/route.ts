/**
 * Production Phase 2 — GitHub OAuth Initiation Route
 *
 * GET /api/auth/github
 *
 * Generates a cryptographically random state parameter, sets an HTTP-only state cookie,
 * and redirects the user to GitHub OAuth authorization.
 */

import { NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { GitHubOAuthService } from '@/lib/auth/githubOAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = crypto.randomBytes(24).toString('hex');
  const authorizeUrl = GitHubOAuthService.getAuthorizationUrl(state);

  const response = NextResponse.redirect(authorizeUrl);

  // Set CSRF state cookie with 10-minute expiration
  response.cookies.set('devpilot_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return response;
}
