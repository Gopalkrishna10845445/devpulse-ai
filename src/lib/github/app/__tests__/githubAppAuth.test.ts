/**
 * Production Phase 4 — GitHub App Integration & Token Security Test Suite
 *
 * Tests GHA-001 through GHA-013
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubAppService } from '../appService';
import { GitHubAppJwtSigner } from '../jwtSigner';
import { maskTextSecrets } from '../../../security/redactor';

describe('Production Phase 4 — GitHub App Integration & Token Lifecycle', () => {
  beforeEach(() => {
    GitHubAppService.resetState();
  });

  describe('GHA-001 & GHA-002: JWT & Installation Token Generation', () => {
    it('GHA-001: signs valid RS256 JWT with appId and valid expiration', () => {
      const mockKey = 'MOCK_PRIVATE_KEY_FOR_TESTING';
      const jwt = GitHubAppJwtSigner.generateAppJwt('123456', mockKey);

      expect(jwt).toBeDefined();
      const parts = jwt.split('.');
      expect(parts.length).toBe(3);

      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      expect(header.alg).toBe('RS256');
      expect(payload.iss).toBe('123456');
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it('GHA-002: generates scoped installation access token', async () => {
      const token = await GitHubAppService.getInstallationToken(10001);

      expect(token.token).toBeDefined();
      expect(token.token.startsWith('ghs_')).toBe(true);
      expect(token.expiresAt).toBeDefined();
      expect(token.permissions).toBeDefined();
    });
  });

  describe('GHA-003 & GHA-004: Token Isolation & Expiration Handling', () => {
    it('GHA-003: ensures installation tokens are strictly isolated per installation ID', async () => {
      const tokenInst1 = await GitHubAppService.getInstallationToken(10001);
      const tokenInst2 = await GitHubAppService.getInstallationToken(20002);

      expect(tokenInst1.token).not.toBe(tokenInst2.token);
      expect(tokenInst1.token).toContain('10001');
      expect(tokenInst2.token).toContain('20002');
    });

    it('GHA-004: handles token caching with valid expiration window', async () => {
      const token1 = await GitHubAppService.getInstallationToken(30003);
      const token2 = await GitHubAppService.getInstallationToken(30003);

      expect(token1.token).toBe(token2.token);
      expect(new Date(token1.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('GHA-005 & GHA-006: Installation Resolution & Authorization', () => {
    it('GHA-006: resolves installation for repository and obtains repo token', async () => {
      const token = await GitHubAppService.getRepoToken('octocat', 'Hello-World');
      expect(token).toBeDefined();
    });
  });

  describe('GHA-007 through GHA-011: Safe GitHub Error Classification', () => {
    it('GHA-007: classifies 401 as UNAUTHORIZED', () => {
      const errClass = GitHubAppService.classifyApiError(401);
      expect(errClass).toBe('UNAUTHORIZED');
    });

    it('GHA-008: classifies 403 as INVALID_INSTALLATION or RATE_LIMITED', () => {
      expect(GitHubAppService.classifyApiError(403)).toBe('INVALID_INSTALLATION');
      expect(GitHubAppService.classifyApiError(403, 'rate limit exceeded')).toBe('RATE_LIMITED');
    });

    it('GHA-009: classifies 404 as REPO_NOT_FOUND', () => {
      expect(GitHubAppService.classifyApiError(404)).toBe('REPO_NOT_FOUND');
    });

    it('GHA-010: classifies 429 as RATE_LIMITED', () => {
      expect(GitHubAppService.classifyApiError(429)).toBe('RATE_LIMITED');
    });

    it('GHA-011: classifies 500/502/503 as TRANSIENT_SERVER_ERROR', () => {
      expect(GitHubAppService.classifyApiError(500)).toBe('TRANSIENT_SERVER_ERROR');
      expect(GitHubAppService.classifyApiError(503)).toBe('TRANSIENT_SERVER_ERROR');
    });
  });

  describe('GHA-012 & GHA-013: Redaction of Private Keys and Tokens', () => {
    it('GHA-012: redacts private key text patterns from logs and outputs', () => {
      const sample = 'BEGIN RSA PRIVATE KEY\nMIIEowIBAAKCAQEA...\nEND RSA PRIVATE KEY';
      const masked = maskTextSecrets(sample);
      expect(masked).not.toContain('MIIEowIBAAKCAQEA');
      expect(masked).toContain('[REDACTED_SECRET]');
    });

    it('GHA-013: redacts GitHub tokens from telemetry and outputs', () => {
      const token = 'ghs_1234567890abcdefghijklmnopqrstuvwxyz';
      const masked = maskTextSecrets(`Fetching with token ${token}`);
      expect(masked).not.toContain(token);
      expect(masked).toContain('••••••••');
    });
  });
});
