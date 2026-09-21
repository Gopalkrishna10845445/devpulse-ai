/**
 * Production Phase 2 — GitHub OAuth Integration Service
 *
 * Implements standard OAuth 2.0 Web Application Flow for GitHub:
 * 1. Generates authorization URL with CSRF state
 * 2. Exchanges temporary authorization code for user access token
 * 3. Retrieves user profile from GitHub API
 */

import { maskTextSecrets } from '../security/redactor';
import { Logger } from '../logger';

export interface GitHubUserProfile {
  id: string;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

export class GitHubOAuthService {
  private static getClientId(): string | undefined {
    return process.env.GITHUB_CLIENT_ID?.trim() || undefined;
  }

  private static getClientSecret(): string | undefined {
    return process.env.GITHUB_CLIENT_SECRET?.trim() || undefined;
  }

  private static getRedirectUri(): string {
    return (
      process.env.GITHUB_OAUTH_REDIRECT_URI?.trim() ||
      'http://localhost:3005/api/auth/callback'
    );
  }

  /**
   * Constructs GitHub OAuth authorization URL.
   */
  public static getAuthorizationUrl(state: string): string {
    const clientId = this.getClientId() || 'devpilot_client_id_placeholder';
    const redirectUri = encodeURIComponent(this.getRedirectUri());
    const scope = encodeURIComponent('read:user user:email repo');

    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
  }

  /**
   * Exchanges authorization code for an OAuth access token.
   */
  public static async exchangeCodeForAccessToken(code: string, state?: string): Promise<string> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    if (!clientId || !clientSecret) {
      // In local dev without OAuth credentials configured, allow safe mock token for testing
      if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_AUTH_BYPASS === 'true') {
        Logger.info('Mock OAuth token exchange in dev/test mode');
        return `mock_token_${code}`;
      }
      throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required for OAuth code exchange.');
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: this.getRedirectUri(),
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub OAuth token exchange failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return data.access_token;
  }

  /**
   * Fetches user profile from GitHub API using the OAuth token.
   */
  public static async fetchUserProfile(accessToken: string): Promise<GitHubUserProfile> {
    if (accessToken.startsWith('mock_token_')) {
      const suffix = accessToken.replace('mock_token_', '');
      return {
        id: `mock_gh_${suffix}`,
        login: `developer_${suffix}`,
        name: 'DevPilot Developer',
        email: 'developer@devpilot.local',
        avatar_url: undefined,
      };
    }

    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'DevPilot-App',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile from GitHub: HTTP ${response.status}`);
    }

    const data = await response.json();

    // Fetch primary email if not public in profile
    let email = data.email;
    if (!email) {
      try {
        const emailRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'DevPilot-App',
            Accept: 'application/vnd.github.v3+json',
          },
        });
        if (emailRes.ok) {
          const emails = await emailRes.json();
          const primary = emails.find((e: any) => e.primary && e.verified) || emails[0];
          if (primary) email = primary.email;
        }
      } catch (err) {
        // Non-fatal if emails scope is restricted
      }
    }

    return {
      id: String(data.id),
      login: data.login,
      name: data.name || data.login,
      email: email || undefined,
      avatar_url: data.avatar_url,
    };
  }
}
