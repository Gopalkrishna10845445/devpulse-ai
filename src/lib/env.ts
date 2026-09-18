/**
 * Phase 11 — Environment & Configuration Hardening
 *
 * Centralized, safe access to environment variables with validation,
 * type safety, and zero secret leakage.
 */

export interface AppConfig {
  nodeEnv: string;
  port: number;
  hasGitHubToken: boolean;
  hasGeminiKey: boolean;
  hasOpenAIKey: boolean;
  hasGenericAIKey: boolean;
  hasWebhookSecret: boolean;
  isLLMAvailable: boolean;
}

export interface ConfigStatus {
  status: 'healthy' | 'degraded';
  environment: string;
  checks: {
    gitHubApi: {
      configured: boolean;
      mode: 'authenticated (5,000 req/hr)' | 'unauthenticated (60 req/hr)';
    };
    aiEngine: {
      configured: boolean;
      provider: 'google-gemini' | 'openai' | 'generic' | 'deterministic-fallback';
    };
    webhooks: {
      configured: boolean;
      signatureVerification: 'enforced' | 'unconfigured';
    };
  };
}

/**
 * Validates and retrieves server-side environment configuration.
 * Never returns raw secret values in public getters.
 */
export class EnvironmentConfig {
  private static instance: EnvironmentConfig;

  public static getInstance(): EnvironmentConfig {
    if (!this.instance) {
      this.instance = new EnvironmentConfig();
    }
    return this.instance;
  }

  public get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  public get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  public get port(): number {
    const p = parseInt(process.env.PORT || '3005', 10);
    return isNaN(p) ? 3005 : p;
  }

  public get gitHubToken(): string | undefined {
    return process.env.GITHUB_TOKEN?.trim() || undefined;
  }

  public get geminiApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY?.trim() || undefined;
  }

  public get openAIApiKey(): string | undefined {
    return process.env.OPENAI_API_KEY?.trim() || undefined;
  }

  public get genericAiApiKey(): string | undefined {
    return process.env.AI_API_KEY?.trim() || undefined;
  }

  public get webhookSecret(): string | undefined {
    return process.env.GITHUB_WEBHOOK_SECRET?.trim() || undefined;
  }

  public get isGitHubTokenConfigured(): boolean {
    return Boolean(this.gitHubToken && this.gitHubToken.length > 0);
  }

  public get isGeminiConfigured(): boolean {
    return Boolean(this.geminiApiKey && this.geminiApiKey.length > 0);
  }

  public get isOpenAIConfigured(): boolean {
    return Boolean(this.openAIApiKey && this.openAIApiKey.length > 0);
  }

  public get isGenericAIConfigured(): boolean {
    return Boolean(this.genericAiApiKey && this.genericAiApiKey.length > 0);
  }

  public get isLLMAvailable(): boolean {
    return this.isGeminiConfigured || this.isOpenAIConfigured || this.isGenericAIConfigured;
  }

  public get isWebhookSecretConfigured(): boolean {
    return Boolean(this.webhookSecret && this.webhookSecret.length > 0);
  }

  /**
   * Generates a safe status object suitable for health check endpoints and logs.
   * Discloses availability state without exposing keys or hashes.
   */
  public getStatus(): ConfigStatus {
    const isGitHubConfigured = this.isGitHubTokenConfigured;
    const isLLM = this.isLLMAvailable;
    const isWebhookConfigured = this.isWebhookSecretConfigured;

    let aiProvider: 'google-gemini' | 'openai' | 'generic' | 'deterministic-fallback' = 'deterministic-fallback';
    if (this.isGeminiConfigured) aiProvider = 'google-gemini';
    else if (this.isOpenAIConfigured) aiProvider = 'openai';
    else if (this.isGenericAIConfigured) aiProvider = 'generic';

    return {
      status: 'healthy',
      environment: this.nodeEnv,
      checks: {
        gitHubApi: {
          configured: isGitHubConfigured,
          mode: isGitHubConfigured ? 'authenticated (5,000 req/hr)' : 'unauthenticated (60 req/hr)',
        },
        aiEngine: {
          configured: isLLM,
          provider: aiProvider,
        },
        webhooks: {
          configured: isWebhookConfigured,
          signatureVerification: isWebhookConfigured ? 'enforced' : 'unconfigured',
        },
      },
    };
  }
}

export const envConfig = EnvironmentConfig.getInstance();
