/**
 * Production Phase 4 — GitHub App Integration & Installation Token Service
 *
 * Manages GitHub App installation token lifecycle, token caching in Redis with 50m TTL,
 * repository installation resolution, and safe error classification.
 */

import { GitHubAppJwtSigner } from './jwtSigner';
import { InstallationAccessToken, GitHubInstallation, GitHubApiErrorClass } from './types';
import { RedisCache } from '../../redis/cache';
import { logger } from '../../logger';
import { Database } from '../../db/client';

export class GitHubAppService {
  private static mockInstallations: Map<string, GitHubInstallation> = new Map();
  private static mockTokens: Map<number, InstallationAccessToken> = new Map();

  /**
   * Retrieves GitHub App configuration from environment variables.
   */
  public static getConfig() {
    return {
      appId: process.env.GITHUB_APP_ID?.trim(),
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY?.trim(),
      clientId: process.env.GITHUB_CLIENT_ID?.trim(),
      clientSecret: process.env.GITHUB_CLIENT_SECRET?.trim(),
    };
  }

  /**
   * Checks if GitHub App credentials are fully configured.
   */
  public static isAppConfigured(): boolean {
    const config = this.getConfig();
    return Boolean(config.appId && config.privateKey);
  }

  /**
   * Generates a signed GitHub App RS256 JWT.
   */
  public static generateAppJwt(): string {
    const config = this.getConfig();
    if (!config.appId || !config.privateKey) {
      throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are required to generate App JWT');
    }

    return GitHubAppJwtSigner.generateAppJwt(config.appId, config.privateKey);
  }

  /**
   * Obtains an installation access token for a specific installation ID.
   * Caches the token for 50 minutes (tokens are valid for 60 minutes).
   */
  public static async getInstallationToken(installationId: number): Promise<InstallationAccessToken> {
    const cacheKey = `devpilot:${process.env.NODE_ENV || 'development'}:cache:github_token:${installationId}`;

    // 1. Check Redis cache first
    const cached = await RedisCache.get<InstallationAccessToken>(cacheKey);
    if (cached && new Date(cached.expiresAt).getTime() > Date.now() + 5 * 60 * 1000) {
      return cached;
    }

    // 2. In test or development fallback mode without real GitHub credentials
    if (!this.isAppConfigured() || process.env.NODE_ENV === 'test') {
      const mockToken: InstallationAccessToken = {
        token: `ghs_mock_token_for_inst_${installationId}_${Date.now()}`,
        expiresAt: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
        permissions: {
          contents: 'read',
          metadata: 'read',
          pull_requests: 'read',
        },
        repositorySelection: 'all',
      };
      this.mockTokens.set(installationId, mockToken);
      await RedisCache.set(cacheKey, mockToken, 3000);
      return mockToken;
    }

    // 3. Real GitHub API token exchange
    try {
      const jwt = this.generateAppJwt();
      const response = await fetch(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwt}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        const errorClass = this.classifyApiError(response.status, errorText);
        logger.error('Failed to obtain GitHub App installation access token', {
          installationId,
          status: response.status,
          errorClass,
        });
        throw new Error(`GitHub token acquisition failed (${errorClass}): ${response.status}`);
      }

      const data = await response.json();
      const tokenRecord: InstallationAccessToken = {
        token: data.token,
        expiresAt: data.expires_at,
        permissions: data.permissions || {},
        repositorySelection: data.repository_selection || 'all',
      };

      // Cache token for 50 minutes (3000 seconds)
      await RedisCache.set(cacheKey, tokenRecord, 3000);
      return tokenRecord;
    } catch (err) {
      logger.error('Error in getInstallationToken', {
        installationId,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  /**
   * Resolves the installation for a given repository (owner/name).
   */
  public static async getInstallationForRepo(owner: string, name?: string): Promise<GitHubInstallation | null> {
    const accountLogin = owner.toLowerCase();

    // Check in-memory store
    if (this.mockInstallations.has(accountLogin)) {
      return this.mockInstallations.get(accountLogin)!;
    }

    // Check PostgreSQL
    try {
      const res = await Database.query<any>(
        `SELECT id, installation_id, account_type, account_id, account_login, repository_selection, permissions, created_at, updated_at
         FROM github_installations
         WHERE LOWER(account_login) = $1
         LIMIT 1`,
        [accountLogin]
      );

      if (res.rows.length > 0) {
        const row = res.rows[0];
        const inst: GitHubInstallation = {
          id: row.id,
          installationId: Number(row.installation_id),
          accountType: row.account_type,
          accountId: Number(row.account_id),
          accountLogin: row.account_login,
          repositorySelection: row.repository_selection,
          permissions: row.permissions || {},
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
        this.mockInstallations.set(accountLogin, inst);
        return inst;
      }
    } catch (err) {
      logger.debug('Database lookup for github_installations fallback', {
        owner,
        error: (err as Error).message,
      });
    }

    // Default mock installation in development/test
    if (process.env.NODE_ENV === 'test' || !this.isAppConfigured()) {
      const defaultMock: GitHubInstallation = {
        id: `inst_${accountLogin}`,
        installationId: 10001,
        accountType: 'Organization',
        accountId: 20001,
        accountLogin,
        repositorySelection: 'all',
        permissions: { contents: 'read', metadata: 'read', pull_requests: 'read' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.mockInstallations.set(accountLogin, defaultMock);
      return defaultMock;
    }

    return null;
  }

  /**
   * Obtains a valid token for accessing a repository (via App installation or server-side PAT fallback).
   */
  public static async getRepoToken(owner: string, name?: string): Promise<string | null> {
    // 1. Try GitHub App installation token
    try {
      const installation = await this.getInstallationForRepo(owner, name);
      if (installation) {
        const tokenRecord = await this.getInstallationToken(installation.installationId);
        return tokenRecord.token;
      }
    } catch (err) {
      logger.warn('Failed to obtain App token for repo — attempting fallback', {
        owner,
        error: (err as Error).message,
      });
    }

    // 2. Server-side PAT fallback (for public repos or development compatibility)
    const pat = process.env.GITHUB_TOKEN?.trim();
    if (pat) {
      return pat;
    }

    return null;
  }

  /**
   * Registers or updates a GitHub App installation record.
   */
  public static async registerInstallation(installation: GitHubInstallation): Promise<void> {
    this.mockInstallations.set(installation.accountLogin.toLowerCase(), installation);

    try {
      await Database.query(
        `INSERT INTO github_installations (id, installation_id, account_type, account_id, account_login, repository_selection, permissions, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (installation_id) DO UPDATE
         SET account_login = EXCLUDED.account_login,
             permissions = EXCLUDED.permissions,
             repository_selection = EXCLUDED.repository_selection,
             updated_at = NOW()`,
        [
          installation.id,
          installation.installationId,
          installation.accountType,
          installation.accountId,
          installation.accountLogin,
          installation.repositorySelection,
          JSON.stringify(installation.permissions),
        ]
      );
    } catch (err) {
      logger.warn('Failed to persist github_installation to database', {
        installationId: installation.installationId,
        error: (err as Error).message,
      });
    }
  }

  /**
   * Classifies GitHub API HTTP error responses into structured categories.
   */
  public static classifyApiError(status: number, message?: string): GitHubApiErrorClass {
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) {
      if (message && message.includes('rate limit')) return 'RATE_LIMITED';
      return 'INVALID_INSTALLATION';
    }
    if (status === 404) return 'REPO_NOT_FOUND';
    if (status === 429) return 'RATE_LIMITED';
    if (status >= 500) return 'TRANSIENT_SERVER_ERROR';
    return 'TRANSIENT_SERVER_ERROR';
  }

  /**
   * Test reset utility.
   */
  public static resetState(): void {
    this.mockInstallations.clear();
    this.mockTokens.clear();
  }
}
