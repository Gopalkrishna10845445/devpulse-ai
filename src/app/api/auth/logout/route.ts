/**
 * Production Phase 2 — Secure Logout Route
 *
 * POST /api/auth/logout
 *
 * Invalidates the server-side session in PostgreSQL/RAM and clears the HTTP-only cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractSessionId } from '@/lib/auth/accessControl';
import { SessionManager, SESSION_COOKIE_NAME } from '@/lib/auth/sessionManager';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const sessionId = extractSessionId(request);

  if (sessionId) {
    await SessionManager.invalidateSession(sessionId);
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });

  // Clear session cookie
  response.cookies.delete(SESSION_COOKIE_NAME);

  return response;
}
