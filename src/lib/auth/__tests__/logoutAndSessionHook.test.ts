/**
 * Unit Tests for POST /api/auth/logout and Client-Side Session Termination
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { SessionManager, SESSION_COOKIE_NAME } from '@/lib/auth/sessionManager';

describe('POST /api/auth/logout and Session Termination', () => {
  beforeEach(() => {
    SessionManager.resetState();
  });

  it('1. successfully invalidates session and deletes session cookie on logout', async () => {
    const user = await SessionManager.findOrCreateUser({
      githubId: '10845445',
      githubLogin: 'test-user',
      displayName: 'Test User',
    });

    const session = await SessionManager.createSession(user.id);
    expect(await SessionManager.validateSession(session.sessionId)).not.toBeNull();

    // Call POST /api/auth/logout with the session cookie
    const req = new NextRequest('https://devpulse-ai-xq7u.onrender.com/api/auth/logout', {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${session.sessionId}`,
      },
    });

    const res = await logoutHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify session is invalidated in backend
    const validated = await SessionManager.validateSession(session.sessionId);
    expect(validated).toBeNull();

    // Verify session cookie deletion header
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=;`);
  });

  it('2. handles unauthenticated logout request gracefully without throwing', async () => {
    const req = new NextRequest('https://devpulse-ai-xq7u.onrender.com/api/auth/logout', {
      method: 'POST',
    });

    const res = await logoutHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
