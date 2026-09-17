import { describe, it, expect } from 'vitest';
import { applyPatchInMemory, computeDiffHash, generateUnifiedDiff, validateDiffConsistency } from '../diffUtils';

describe('Phase 7: Diff Utilities & In-Memory Patching', () => {
  const sampleBefore = 'const apiKey = "sk-proj-1234567890";\nconst port = 3000;';
  const sampleAfter = 'const apiKey = process.env.API_KEY || "";\nconst port = 3000;';

  it('generates standard unified diff matching beforeCode and afterCode', () => {
    const diff = generateUnifiedDiff('src/config.ts', sampleBefore, sampleAfter);

    expect(diff).toContain('--- a/src/config.ts');
    expect(diff).toContain('+++ b/src/config.ts');
    expect(diff).toContain('-const apiKey = "sk-proj-1234567890";');
    expect(diff).toContain('+const apiKey = process.env.API_KEY || "";');
  });

  it('computes deterministic SHA-256 diff hash', () => {
    const diff1 = generateUnifiedDiff('src/config.ts', sampleBefore, sampleAfter);
    const diff2 = generateUnifiedDiff('src/config.ts', sampleBefore, sampleAfter);
    const hash1 = computeDiffHash(diff1);
    const hash2 = computeDiffHash(diff2);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('validates diff consistency between code transformations and diff lines', () => {
    const diff = generateUnifiedDiff('src/config.ts', sampleBefore, sampleAfter);
    expect(validateDiffConsistency(sampleBefore, sampleAfter, diff)).toBe(true);

    const invalidDiff = '--- a/src/config.ts\n+++ b/src/config.ts\n-some other line';
    expect(validateDiffConsistency(sampleBefore, sampleAfter, invalidDiff)).toBe(false);
  });

  it('applies patch in memory to source file content cleanly', () => {
    const fileContent = `// Header\n${sampleBefore}\n// Footer`;
    const result = applyPatchInMemory(fileContent, sampleBefore, sampleAfter);

    expect(result.success).toBe(true);
    expect(result.patchedContent).toBe(`// Header\n${sampleAfter}\n// Footer`);
    expect(result.patchedContent).not.toContain('sk-proj-1234567890');
  });

  it('fails gracefully when beforeCode is not found in source file', () => {
    const fileContent = 'const port = 8080;\nconsole.log("hello");';
    const result = applyPatchInMemory(fileContent, sampleBefore, sampleAfter);

    expect(result.success).toBe(false);
    expect(result.error).toContain('could not be found');
  });
});
