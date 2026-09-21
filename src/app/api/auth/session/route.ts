/**
 * Production Phase 2 — Current Session & User Profile Route
 *
 * GET /api/auth/session
 *
 * Returns current authenticated user profile, session validity, and role permissions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/accessControl';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request);

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      githubId: user.githubId,
      githubLogin: user.githubLogin,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  });
}
