/**
 * Production Phase 4 — GitHub App Type Definitions
 *
 * Scoped installation tokens, permissions, and metadata.
 */

export interface GitHubAppConfig {
  appId?: string;
  privateKey?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface InstallationAccessToken {
  token: string;
  expiresAt: string;
  permissions: Record<string, string>;
  repositorySelection: 'all' | 'selected';
}

export interface GitHubInstallation {
  id: string;
  installationId: number;
  accountType: 'User' | 'Organization';
  accountId: number;
  accountLogin: string;
  repositorySelection: 'all' | 'selected';
  permissions: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type GitHubApiErrorClass =
  | 'INVALID_INSTALLATION'
  | 'EXPIRED_TOKEN'
  | 'REVOKED_INSTALLATION'
  | 'REPO_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TRANSIENT_SERVER_ERROR'
  | 'UNAUTHORIZED';
