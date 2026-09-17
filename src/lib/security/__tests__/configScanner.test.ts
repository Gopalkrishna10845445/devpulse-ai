import { describe, it, expect } from 'vitest';
import { scanConfiguration } from '../configScanner';
import { createMockRepoIndex } from './testHelpers';

describe('Phase 6: Configuration Security Scanner', () => {
  it('detects disabled TLS verification and insecure CORS', () => {
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: 'src/api/client.ts',
          name: 'client.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const agent = new https.Agent({ rejectUnauthorized: false });',
          sizeBytes: 100,
          extension: '.ts',
          sha: '1',
        },
        {
          path: 'src/server.ts',
          name: 'server.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'app.use(cors({ origin: "*" }));',
          sizeBytes: 80,
          extension: '.ts',
          sha: '2',
        },
      ],
    });

    const res = scanConfiguration(repoIndex);
    expect(res.indicators.insecureFlagsCount).toBe(2);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CONFIG_TLS_DISABLED')).toBe(true);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CONFIG_PERMISSIVE_CORS')).toBe(true);
  });

  it('detects privileged Docker container configuration and CI write-all permissions', () => {
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: 'docker-compose.yml',
          name: 'docker-compose.yml',
          type: 'file',
          language: 'yaml',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'services:\n  app:\n    privileged: true\n',
          sizeBytes: 50,
          extension: '.yml',
          sha: '3',
        },
        {
          path: '.github/workflows/deploy.yml',
          name: 'deploy.yml',
          type: 'file',
          language: 'yaml',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'name: Deploy\npermissions: write-all\n',
          sizeBytes: 40,
          extension: '.yml',
          sha: '4',
        },
      ],
    });

    const res = scanConfiguration(repoIndex);
    expect(res.indicators.insecureFlagsCount).toBe(2);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CONFIG_DOCKER_PRIVILEGED')).toBe(true);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CONFIG_CI_PERMISSIVE_PERMS')).toBe(true);
  });
});
