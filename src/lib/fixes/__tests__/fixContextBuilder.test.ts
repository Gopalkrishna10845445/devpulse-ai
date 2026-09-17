import { describe, it, expect } from 'vitest';
import { createMockRepoIndex } from '../../security/__tests__/testHelpers';
import { buildFixContext, isSafeRepositoryPath } from '../fixContextBuilder';
import { CodeFixRequest } from '../types';

describe('Phase 7: Fix Context Builder & Path Safety', () => {
  it('validates safe repository paths and rejects path traversal attempts', () => {
    expect(isSafeRepositoryPath('src/config.ts')).toBe(true);
    expect(isSafeRepositoryPath('lib/utils/auth.js')).toBe(true);

    // Traversal and absolute paths
    expect(isSafeRepositoryPath('../etc/passwd')).toBe(false);
    expect(isSafeRepositoryPath('src/../../secrets.json')).toBe(false);
    expect(isSafeRepositoryPath('/var/www/index.js')).toBe(false);
    expect(isSafeRepositoryPath('C:\\Windows\\system32')).toBe(false);
  });

  it('builds grounded fix context from repository files and redacts secret values', () => {
    const rawSecret = 'sk-proj-productionSecret1234567890';
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
          content: `import https from 'https';\nconst key = "${rawSecret}";\nexport function getClient() { return key; }`,
          sizeBytes: 120,
          extension: '.ts',
          sha: '1',
        },
      ],
    });

    const request: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'sec-secret-1',
      category: 'security',
      filePath: 'src/api/client.ts',
      lineRange: '2',
      findingRule: 'RULE_SECRET_OPENAI',
      findingDescription: `Exposed secret: ${rawSecret}`,
    };

    const ctx = buildFixContext(request, repoIndex);

    expect(ctx.targetFile).toBe('src/api/client.ts');
    expect(ctx.startLine).toBe(2);
    expect(ctx.surroundingCode).toContain('const key =');

    // Evidence & context must NOT leak the unmasked secret
    expect(ctx.redactedEvidence.summary).not.toContain(rawSecret);
    expect(ctx.redactedEvidence.summary).toContain('sk-proj-••••••••7890');
    expect(ctx.promptContext).not.toContain(rawSecret);
  });

  it('throws error when target file does not exist in repository index', () => {
    const repoIndex = createMockRepoIndex({ files: [] });
    const request: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'f1',
      category: 'engineering',
      filePath: 'src/missing.ts',
    };

    expect(() => buildFixContext(request, repoIndex)).toThrow('does not exist');
  });
});
