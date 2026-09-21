import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../sessionManager';
import { AccessControlEngine } from '../rbac';
import {
  authenticateRequest,
  requireAuth,
  authorizeRepositoryAccess,
  AuthError,
  extractSessionId,
} from '../accessControl';
import { GitHubOAuthService } from '../githubOAuth';
import { User } from '../types';

describe('Production Phase 2 — Authentication & Authorization Engine', () => {
  beforeEach(() => {
    SessionManager.resetState();
    delete process.env.ALLOW_DEV_AUTH_BYPASS;
  });

  describe('AUTH-001 & AUTH-004: Unauthenticated & Invalid Session Handling', () => {
    it('AUTH-001: rejects unauthenticated request with 401 AuthError', async () => {
      const dummyReq = new Request('http://localhost:3005/api/repository/ask', {
        method: 'POST',
        headers: {
          'x-devpilot-unauthenticated': 'true',
        },
      });

      await expect(requireAuth(dummyReq)).rejects.toThrow(AuthError);
    });

    it('AUTH-004: rejects invalid or non-existent session with 401', async () => {
      const dummyReq = new Request('http://localhost:3005/api/repository/ask', {
        headers: {
          Cookie: 'devpilot_session=non_existent_fake_session_token_12345',
        },
      });

      const user = await authenticateRequest(dummyReq);
      expect(user).toBeNull();
    });
  });

  describe('AUTH-002 & AUTH-020: Valid Session Creation & Cookie Verification', () => {
    it('AUTH-002: authenticates valid session and returns accurate user identity', async () => {
      const user = await SessionManager.findOrCreateUser({
        githubId: '123456',
        githubLogin: 'alice-dev',
        displayName: 'Alice Developer',
        email: 'alice@company.com',
      });

      const session = await SessionManager.createSession(user.id);

      const dummyReq = new Request('http://localhost:3005/api/repository/ask', {
        headers: {
          Cookie: `devpilot_session=${session.sessionId}`,
        },
      });

      const authenticatedUser = await requireAuth(dummyReq);
      expect(authenticatedUser.id).toBe(user.id);
      expect(authenticatedUser.githubLogin).toBe('alice-dev');
      expect(authenticatedUser.email).toBe('alice@company.com');
    });

    it('AUTH-020: extracts session ID from Cookie header correctly', () => {
      const req = new Request('http://localhost:3005/api/health', {
        headers: {
          Cookie: 'other_pref=dark; devpilot_session=session_token_xyz987; tracker=1',
        },
      });

      const sessionId = extractSessionId(req);
      expect(sessionId).toBe('session_token_xyz987');
    });
  });

  describe('AUTH-003: Logout & Session Invalidation', () => {
    it('AUTH-003: invalidates session upon logout, blocking subsequent protected requests', async () => {
      const user = await SessionManager.findOrCreateUser({
        githubId: '789012',
        githubLogin: 'bob-security',
        displayName: 'Bob Security',
      });

      const session = await SessionManager.createSession(user.id);
      expect(await SessionManager.validateSession(session.sessionId)).not.toBeNull();

      // Invalidate session (logout)
      await SessionManager.invalidateSession(session.sessionId);

      // Subsequent session validation returns null
      const validUserAfterLogout = await SessionManager.validateSession(session.sessionId);
      expect(validUserAfterLogout).toBeNull();
    });
  });

  describe('AUTH-005 & AUTH-010: RBAC & IDOR Protection', () => {
    it('AUTH-010: prevents User A from accessing unauthorized private repository of User B (IDOR defense)', async () => {
      const userA: User = {
        id: 'usr_userA',
        githubId: '111',
        githubLogin: 'user-a',
        displayName: 'User A',
        role: 'MEMBER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const userBRepo = 'user-b/secret-payments-core';

      // User A attempts to access User B's repository
      const authResult = await authorizeRepositoryAccess(userA, userBRepo, 'view');
      expect(authResult.authorized).toBe(false);
      expect(authResult.reason).toContain('is not a member');
    });

    it('AUTH-006: allows access when user has valid repository membership', async () => {
      const user: User = {
        id: 'usr_teamMember',
        githubId: '222',
        githubLogin: 'team-member',
        displayName: 'Team Member',
        role: 'MEMBER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const targetRepo = 'acme-corp/shared-library';

      // Grant MEMBER role
      await SessionManager.grantRepositoryMembership(user.id, targetRepo, 'MEMBER');

      const authResult = await authorizeRepositoryAccess(user, targetRepo, 'qa');
      expect(authResult.authorized).toBe(true);
      expect(authResult.role).toBe('MEMBER');
    });
  });

  describe('AUTH-007, AUTH-008, AUTH-009: Permission Matrix Verification', () => {
    it('AUTH-007: OWNER role has all permissions including fix approval and membership management', () => {
      expect(AccessControlEngine.hasPermission('OWNER', 'view')).toBe(true);
      expect(AccessControlEngine.hasPermission('OWNER', 'analyze')).toBe(true);
      expect(AccessControlEngine.hasPermission('OWNER', 'qa')).toBe(true);
      expect(AccessControlEngine.hasPermission('OWNER', 'engineering')).toBe(true);
      expect(AccessControlEngine.hasPermission('OWNER', 'security')).toBe(true);
      expect(AccessControlEngine.hasPermission('OWNER', 'pr_review')).toBe(true);
      expect(AccessControlEngine.hasPermission('OWNER', 'propose_fix')).toBe(true);
      expect(AccessControlEngine.hasPermission('OWNER', 'approve_fix')).toBe(true);
      expect(AccessControlEngine.hasPermission('OWNER', 'manage_members')).toBe(true);
    });

    it('AUTH-008: MEMBER role can view, analyze, Q&A, and propose fixes, but cannot approve fixes', () => {
      expect(AccessControlEngine.hasPermission('MEMBER', 'view')).toBe(true);
      expect(AccessControlEngine.hasPermission('MEMBER', 'analyze')).toBe(true);
      expect(AccessControlEngine.hasPermission('MEMBER', 'qa')).toBe(true);
      expect(AccessControlEngine.hasPermission('MEMBER', 'security')).toBe(true);
      expect(AccessControlEngine.hasPermission('MEMBER', 'propose_fix')).toBe(true);
      expect(AccessControlEngine.hasPermission('MEMBER', 'approve_fix')).toBe(false);
      expect(AccessControlEngine.hasPermission('MEMBER', 'manage_members')).toBe(false);
    });

    it('AUTH-009: VIEWER role is strictly limited to read-only viewing and Q&A', () => {
      expect(AccessControlEngine.hasPermission('VIEWER', 'view')).toBe(true);
      expect(AccessControlEngine.hasPermission('VIEWER', 'qa')).toBe(true);
      expect(AccessControlEngine.hasPermission('VIEWER', 'analyze')).toBe(false);
      expect(AccessControlEngine.hasPermission('VIEWER', 'security')).toBe(false);
      expect(AccessControlEngine.hasPermission('VIEWER', 'propose_fix')).toBe(false);
      expect(AccessControlEngine.hasPermission('VIEWER', 'approve_fix')).toBe(false);
    });
  });

  describe('AUTH-016 & AUTH-017: GitHub OAuth Security & URL Construction', () => {
    it('AUTH-016: generates secure authorization URL with CSRF state parameter', () => {
      const state = 'secure_random_state_hex_12345';
      const authUrl = GitHubOAuthService.getAuthorizationUrl(state);

      expect(authUrl).toContain('https://github.com/login/oauth/authorize');
      expect(authUrl).toContain(`state=${state}`);
      expect(authUrl).toContain('scope=');
    });

    it('AUTH-017: mock token exchange operates safely in development/test environment', async () => {
      process.env.ALLOW_DEV_AUTH_BYPASS = 'true';
      const token = await GitHubOAuthService.exchangeCodeForAccessToken('test_auth_code_999');
      expect(token).toBe('mock_token_test_auth_code_999');

      const profile = await GitHubOAuthService.fetchUserProfile(token);
      expect(profile.login).toBe('developer_test_auth_code_999');
    });
  });
});
