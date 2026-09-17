import { describe, it, expect } from 'vitest';
import { scanCodePatterns } from '../codePatternScanner';
import { createMockRepoIndex } from './testHelpers';

describe('Phase 6: Dangerous Code Pattern Scanner', () => {
  it('detects dynamic eval and child_process string interpolation', () => {
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: 'src/runtime.ts',
          name: 'runtime.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const result = eval(userExpression);',
          sizeBytes: 50,
          extension: '.ts',
          sha: '1',
        },
        {
          path: 'src/cli.ts',
          name: 'cli.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'child_process.exec(`git checkout ${branchName}`);',
          sizeBytes: 60,
          extension: '.ts',
          sha: '2',
        },
      ],
    });

    const res = scanCodePatterns(repoIndex);
    expect(res.indicators.dangerousPatternsCount).toBe(2);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CODE_DYNAMIC_EVAL')).toBe(true);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CODE_UNSAFE_EXEC')).toBe(true);

    // Verify conservative wording
    const execFinding = res.findings.find(f => f.deterministicRule === 'RULE_CODE_UNSAFE_EXEC');
    expect(execFinding?.description).toContain('Potential command injection risk');
  });

  it('detects unparameterized SQL interpolation and dangerouslySetInnerHTML', () => {
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: 'src/db/users.ts',
          name: 'users.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
          sizeBytes: 60,
          extension: '.ts',
          sha: '3',
        },
        {
          path: 'src/components/RawView.tsx',
          name: 'RawView.tsx',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: '<div dangerouslySetInnerHTML={{ __html: postContent }} />',
          sizeBytes: 70,
          extension: '.tsx',
          sha: '4',
        },
      ],
    });

    const res = scanCodePatterns(repoIndex);
    expect(res.indicators.dangerousPatternsCount).toBe(2);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CODE_SQL_INTERPOLATION')).toBe(true);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CODE_UNSAFE_HTML_INJECTION')).toBe(true);
  });
});
