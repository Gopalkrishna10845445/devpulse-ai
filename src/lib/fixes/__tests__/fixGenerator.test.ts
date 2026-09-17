import { describe, it, expect } from 'vitest';
import { createMockRepoIndex } from '../../security/__tests__/testHelpers';
import { buildFixContext } from '../fixContextBuilder';
import { CodeFixGenerator } from '../fixGenerator';
import { CodeFixRequest } from '../types';

describe('Phase 7: Code Fix Generator', () => {
  const generator = new CodeFixGenerator();

  it('generates deterministic remediation proposal for hardcoded secret', async () => {
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
          content: 'const OPENAI_KEY = "sk-proj-12345678901234567890";',
          sizeBytes: 60,
          extension: '.ts',
          sha: '1',
        },
      ],
    });

    const request: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'secret-openai-1',
      category: 'security',
      filePath: 'src/config.ts',
      lineRange: '1',
      findingRule: 'RULE_SECRET_OPENAI',
      findingTitle: 'OpenAI API Key exposed',
    };

    const ctx = buildFixContext(request, repoIndex);
    const proposal = await generator.generateProposal(request, ctx);

    expect(proposal.title).toContain('Extract hardcoded secret');
    expect(proposal.afterCode).toContain('process.env.');
    expect(proposal.afterCode).not.toContain('sk-proj-12345678901234567890');
    expect(proposal.unifiedDiff).toContain('--- a/src/config.ts');
    expect(proposal.validationPlan.length).toBeGreaterThan(0);
    expect(proposal.status).toBe('proposed');
  });

  it('generates deterministic remediation proposal for disabled TLS verification', async () => {
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: 'src/client.ts',
          name: 'client.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const agent = new https.Agent({ rejectUnauthorized: false });',
          sizeBytes: 65,
          extension: '.ts',
          sha: '2',
        },
      ],
    });

    const request: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'config-tls-1',
      category: 'security',
      filePath: 'src/client.ts',
      lineRange: '1',
      findingRule: 'RULE_CONFIG_TLS_DISABLED',
      findingTitle: 'Disabled TLS Certificate Verification',
    };

    const ctx = buildFixContext(request, repoIndex);
    const proposal = await generator.generateProposal(request, ctx);

    expect(proposal.title).toContain('Enable TLS certificate verification');
    expect(proposal.afterCode).toContain('rejectUnauthorized: true');
    expect(proposal.status).toBe('proposed');
  });

  it('generates deterministic remediation for dynamic eval()', async () => {
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: 'src/calc.ts',
          name: 'calc.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const val = eval(inputStr);',
          sizeBytes: 40,
          extension: '.ts',
          sha: '3',
        },
      ],
    });

    const request: CodeFixRequest = {
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'code-eval-1',
      category: 'security',
      filePath: 'src/calc.ts',
      lineRange: '1',
      findingRule: 'RULE_CODE_DYNAMIC_EVAL',
      findingTitle: 'Dynamic Code Execution (eval)',
    };

    const ctx = buildFixContext(request, repoIndex);
    const proposal = await generator.generateProposal(request, ctx);

    expect(proposal.title).toContain('Replace dynamic eval() with structured JSON.parse');
    expect(proposal.afterCode).toContain('JSON.parse(inputStr)');
  });
});
