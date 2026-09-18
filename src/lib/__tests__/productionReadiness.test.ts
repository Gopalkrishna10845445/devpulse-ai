import { describe, it, expect } from 'vitest';
import { EnvironmentConfig, envConfig } from '../env';
import { Logger } from '../logger';
import { GET as healthHandler } from '@/app/api/health/route';

describe('Phase 11 — Production Readiness, Security & Observability', () => {
  describe('Environment & Configuration Hardening', () => {
    it('returns a safe status object without leaking secret values or tokens', () => {
      const status = envConfig.getStatus();

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('environment');
      expect(status.checks).toHaveProperty('gitHubApi');
      expect(status.checks).toHaveProperty('aiEngine');
      expect(status.checks).toHaveProperty('webhooks');

      const statusJson = JSON.stringify(status);
      expect(statusJson).not.toContain('ghp_');
      expect(statusJson).not.toContain('AIzaSy');
      expect(statusJson).not.toContain('whsec_');
      expect(statusJson).not.toContain('Bearer');
    });

    it('EnvironmentConfig singleton behaves consistently', () => {
      const instance1 = EnvironmentConfig.getInstance();
      const instance2 = EnvironmentConfig.getInstance();
      expect(instance1).toBe(instance2);
      expect(typeof instance1.port).toBe('number');
    });
  });

  describe('Structured Logger & Automatic Secret Redaction', () => {
    it('redacts tokens and keys from log payloads', () => {
      let loggedOutput = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        loggedOutput = msg;
      };

      try {
        Logger.info('Testing logger secret redaction', {
          token: 'ghp_superSecretToken1234567890abcdef',
          apiKey: 'AIzaSyFakeGoogleApiKey987654321',
          normalField: 'safeValue',
        });

        expect(loggedOutput).toContain('safeValue');
        expect(loggedOutput).not.toContain('ghp_superSecretToken1234567890abcdef');
        expect(loggedOutput).not.toContain('AIzaSyFakeGoogleApiKey987654321');
        expect(loggedOutput).toContain('[REDACTED_SECRET]');
      } finally {
        console.log = originalLog;
      }
    });

    it('redacts hidden prompts from log payloads', () => {
      let loggedOutput = '';
      const originalLog = console.log;
      console.log = (msg: string) => {
        loggedOutput = msg;
      };

      try {
        Logger.info('Testing prompt masking in logs', {
          systemInstruction: 'Confidential system instruction that should never appear in logs',
          operation: 'test',
        });

        expect(loggedOutput).toContain('test');
        expect(loggedOutput).not.toContain('Confidential system instruction');
        expect(loggedOutput).toContain('[REDACTED_INTERNAL_PROMPT]');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Health Check API Route (/api/health)', () => {
    it('returns 200 OK with expected production health metadata', async () => {
      const response = await healthHandler();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('devpilot-ai');
      expect(data.version).toBe('1.0.0');
      expect(typeof data.uptimeSeconds).toBe('number');
      expect(data.dependencies).toBeDefined();
      expect(data.dependencies.githubApi).toBeDefined();
      expect(data.dependencies.aiEngine).toBeDefined();
      expect(data.dependencies.webhooks).toBeDefined();
      expect(data.dependencies.vectorStore).toBeDefined();
      expect(data.dependencies.jobManager).toBeDefined();

      const responseString = JSON.stringify(data);
      expect(responseString).not.toContain('ghp_');
      expect(responseString).not.toContain('AIzaSy');
      expect(responseString).not.toContain('whsec_');
    });
  });
});
