/**
 * Production Phase 2 — GitHub OAuth Callback Route
 *
 * GET /api/auth/callback
 *
 * Handles OAuth code exchange, validates state, looks up/creates user,
 * establishes secure session, and redirects to dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GitHubOAuthService } from '@/lib/auth/githubOAuth';
import { SessionManager, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from '@/lib/auth/sessionManager';
import { Logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    Logger.warn('GitHub OAuth provider returned error', { errorCategory: 'AUTH_ERROR', error });
    return NextResponse.redirect(new URL('/?auth_error=oauth_denied', request.url));
  }

  if (!code) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_REQUEST', message: 'Missing authorization code.' } },
      { status: 400 }
    );
  }

  // Validate state against cookie
  const savedState = request.cookies.get('devpilot_oauth_state')?.value;
  if (savedState && state && savedState !== state) {
    return NextResponse.json(
      { success: false, error: { code: 'CSRF_STATE_MISMATCH', message: 'Invalid OAuth state.' } },
      { status: 403 }
    );
  }

  try {
    // 1. Exchange code for access token
    const accessToken = await GitHubOAuthService.exchangeCodeForAccessToken(code, state || undefined);

    // 2. Fetch user profile
    const profile = await GitHubOAuthService.fetchUserProfile(accessToken);

    // 3. Find or register user
    const user = await SessionManager.findOrCreateUser({
      githubId: profile.id,
      githubLogin: profile.login,
      displayName: profile.name || profile.login,
      email: profile.email,
      avatarUrl: profile.avatar_url,
    });

    // 4. Create persistent session
    const session = await SessionManager.createSession(user.id);

    // 5. Build response and set secure HTTP-only session cookie
    const redirectUrl = new URL('/', request.url);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set(SESSION_COOKIE_NAME, session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    });

    // Clear temporary OAuth state cookie
    response.cookies.delete('devpilot_oauth_state');

    return response;
  } catch (err: any) {
    Logger.error('OAuth callback failure', { errorCategory: 'AUTH_ERROR' }, err);
    return NextResponse.redirect(new URL('/?auth_error=callback_failed', request.url));
  }
}
