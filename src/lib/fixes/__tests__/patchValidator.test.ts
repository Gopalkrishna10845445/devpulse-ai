import { describe, it, expect } from 'vitest';
import { createMockRepoIndex } from '../../security/__tests__/testHelpers';
import { computeDiffHash, generateUnifiedDiff } from '../diffUtils';
import { validateProposalPatch } from '../patchValidator';
import { CodeFixProposal } from '../types';

describe('Phase 7: Patch Validator', () => {
  const targetFile = 'src/service.ts';
  const beforeCode = 'const insecure = eval(expr);';
  const afterCode = 'const insecure = JSON.parse(expr);';
  const diff = generateUnifiedDiff(targetFile, beforeCode, afterCode);
  const diffHash = computeDiffHash(diff);

  it('validates clean and matching patch proposal', () => {
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: targetFile,
          name: 'service.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: `export function parse(expr: string) {\n  ${beforeCode}\n  return insecure;\n}`,
          sizeBytes: 100,
          extension: '.ts',
          sha: '1',
        },
      ],
    });

    const proposal: CodeFixProposal = {
      id: 'fix-1',
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'find-1',
      category: 'security',
      title: 'Fix dynamic eval',
      explanation: 'Replaced eval with JSON.parse',
      rationale: 'Prevent code execution',
      affectedFiles: [targetFile],
      affectedSymbols: ['parse'],
      targetFile,
      beforeCode,
      afterCode,
      unifiedDiff: diff,
      diffHash,
      evidence: { summary: 'eval detected', references: [] },
      confidence: 'high',
      validationPlan: [],
      warnings: [],
      generatedAt: new Date().toISOString(),
      status: 'proposed',
    };

    const res = validateProposalPatch(proposal, repoIndex);
    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it('flags error if target file does not exist or beforeCode does not match source', () => {
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: targetFile,
          name: 'service.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const completelyDifferentCode = 123;',
          sizeBytes: 40,
          extension: '.ts',
          sha: '1',
        },
      ],
    });

    const proposal: CodeFixProposal = {
      id: 'fix-2',
      repositoryId: 'org/repo',
      commitSha: 'main',
      findingId: 'find-2',
      category: 'security',
      title: 'Fix',
      explanation: '',
      rationale: '',
      affectedFiles: [targetFile],
      affectedSymbols: [],
      targetFile,
      beforeCode: 'const nonExistent = 1;',
      afterCode: 'const fixed = 2;',
      unifiedDiff: generateUnifiedDiff(targetFile, 'const nonExistent = 1;', 'const fixed = 2;'),
      diffHash: computeDiffHash(generateUnifiedDiff(targetFile, 'const nonExistent = 1;', 'const fixed = 2;')),
      evidence: { summary: '', references: [] },
      confidence: 'high',
      validationPlan: [],
      warnings: [],
      generatedAt: new Date().toISOString(),
      status: 'proposed',
    };

    const res = validateProposalPatch(proposal, repoIndex);
    expect(res.isValid).toBe(false);
    expect(res.errors.some(e => e.includes('could not be found') || e.includes('Failed to apply'))).toBe(true);
  });
});
