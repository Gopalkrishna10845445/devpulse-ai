import { describe, it, expect } from 'vitest';
import { maskSecret, isPlaceholderSecret, sanitizeEvidenceSnippet } from '../redactor';
import { scanSecrets } from '../secretScanner';
import { createMockRepoIndex } from './testHelpers';

describe('Phase 6: Secret Scanner & Redaction', () => {
  it('correctly masks secrets without exposing raw credentials', () => {
    expect(maskSecret('sk-proj-1234567890abcdefghijklmnop')).toBe('sk-proj-••••••••mnop');
    expect(maskSecret('AKIA1234567890ABCDEF')).toBe('AKIA••••••••CDEF');
    expect(maskSecret('ghp_123456789012345678901234567890123456')).toBe('ghp_••••••••3456');
    expect(maskSecret('short')).toBe('••••••••');
  });

  it('filters out placeholder values and mock strings', () => {
    expect(isPlaceholderSecret('your_api_key_here')).toBe(true);
    expect(isPlaceholderSecret('TODO_REPLACE_ME')).toBe(true);
    expect(isPlaceholderSecret('process.env.OPENAI_API_KEY')).toBe(true);
    expect(isPlaceholderSecret('example_secret_token')).toBe(true);
    expect(isPlaceholderSecret('000000000000000000000000')).toBe(true);
    expect(isPlaceholderSecret('sk-proj-realValidLookingKey1234567890abcdef')).toBe(false);
  });

  it('sanitizes evidence snippets by replacing raw secrets with masked versions', () => {
    const raw = 'const key = "sk-proj-9876543210abcdefghijkl";';
    const sanitized = sanitizeEvidenceSnippet(raw, 'sk-proj-9876543210abcdefghijkl');
    expect(sanitized).not.toContain('sk-proj-9876543210abcdefghijkl');
    expect(sanitized).toContain('sk-proj-••••••••ijkl');
  });

  it('detects exposed OpenAI API keys with masked evidence and no plaintext leak', () => {
    const rawKey = 'sk-proj-secretKey12345678901234567890';
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: 'src/config.ts',
          name: 'config.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: `const openaiKey = "${rawKey}";`,
          sizeBytes: 100,
          extension: '.ts',
          sha: 'abc',
        },
      ],
    });

    const res = scanSecrets(repoIndex);
    expect(res.indicators.totalSecretsFound).toBe(1);
    expect(res.indicators.status).toBe('critical');

    const finding = res.findings[0];
    expect(finding.deterministicRule).toBe('RULE_SECRET_OPENAI');
    expect(finding.filePath).toBe('src/config.ts');
    expect(finding.lineStart).toBe(1);
    expect(finding.evidence.redactedContent).not.toContain(rawKey);
    expect(finding.evidence.redactedContent).toContain('sk-proj-••••••••7890');
  });

  it('detects database connection strings containing credentials and masks them', () => {
    const rawUri = 'postgres://admin:SuperSecretPass123!@db.production.internal:5432/appdb';
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: 'src/db.ts',
          name: 'db.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: `const dbUri = "${rawUri}";`,
          sizeBytes: 150,
          extension: '.ts',
          sha: '123',
        },
      ],
    });

    const res = scanSecrets(repoIndex);
    expect(res.indicators.totalSecretsFound).toBe(1);
    expect(res.findings[0].deterministicRule).toBe('RULE_SECRET_DB_CONNECTION_STRING');
    expect(res.findings[0].evidence.redactedContent).not.toContain('SuperSecretPass123!');
  });

  it('detects embedded private key headers', () => {
    const privateKey = `-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Y123...\n-----END RSA PRIVATE KEY-----`;
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: 'keys/server.key',
          name: 'server.key',
          type: 'file',
          language: 'key',
          isBinary: false,
          isSensitive: true,
          status: 'indexed',
          skipReason: null,
          content: privateKey,
          sizeBytes: 200,
          extension: '.key',
          sha: '456',
        },
      ],
    });

    const res = scanSecrets(repoIndex);
    expect(res.indicators.totalSecretsFound).toBe(1);
    expect(res.findings[0].deterministicRule).toBe('RULE_SECRET_PRIVATE_KEY');
    expect(res.findings[0].severity).toBe('critical');
  });

  it('ignores documentation examples and placeholder keys', () => {
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: 'README.md',
          name: 'README.md',
          type: 'file',
          language: 'markdown',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'OPENAI_API_KEY=your_api_key_here\nGITHUB_TOKEN=TODO_REPLACE_ME',
          sizeBytes: 80,
          extension: '.md',
          sha: '789',
        },
      ],
    });

    const res = scanSecrets(repoIndex);
    expect(res.indicators.totalSecretsFound).toBe(0);
    expect(res.indicators.status).toBe('healthy');
  });
});
