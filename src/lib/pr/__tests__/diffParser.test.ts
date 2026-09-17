/**
 * Phase 8 — Diff Parser Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { parseUnifiedDiff, extractAddedCode, extractSnippetForLine } from '../diffParser';

const SAMPLE_DIFF = `diff --git a/src/auth/service.ts b/src/auth/service.ts
index 1234567..89abcdef 100644
--- a/src/auth/service.ts
+++ b/src/auth/service.ts
@@ -10,6 +10,8 @@ export class AuthService {
   private secret: string;
 
   constructor() {
+    this.secret = "sk-proj-supersecretkey1234567890";
+    console.log("Auth initialized");
   }
 
   public validateToken(token: string): boolean {
diff --git a/src/utils/config.ts b/src/utils/config.ts
new file mode 100644
--- /dev/null
+++ b/src/utils/config.ts
@@ -0,0 +1,5 @@
+export const API_URL = process.env.API_ENDPOINT_URL;
+export function getPort(): number {
+  return 3000;
+}
`;

describe('Phase 8 Diff Parser', () => {
  it('parses multi-file unified diff correctly', () => {
    const parsed = parseUnifiedDiff(SAMPLE_DIFF);
    expect(parsed).toHaveLength(2);

    // File 1
    expect(parsed[0].filePath).toBe('src/auth/service.ts');
    expect(parsed[0].status).toBe('modified');
    expect(parsed[0].addedLinesCount).toBe(2);
    expect(parsed[0].addedLineNumbers).toContain(13);
    expect(parsed[0].addedLineNumbers).toContain(14);

    // File 2
    expect(parsed[1].filePath).toBe('src/utils/config.ts');
    expect(parsed[1].status).toBe('added');
    expect(parsed[1].addedLinesCount).toBe(4);
  });

  it('handles empty or whitespace diff gracefully', () => {
    expect(parseUnifiedDiff('')).toEqual([]);
    expect(parseUnifiedDiff('   \n  ')).toEqual([]);
  });

  it('extracts added code content from a parsed file', () => {
    const parsed = parseUnifiedDiff(SAMPLE_DIFF);
    const addedCode = extractAddedCode(parsed[0]);
    expect(addedCode).toContain('this.secret = "sk-proj-supersecretkey1234567890";');
    expect(addedCode).toContain('console.log("Auth initialized");');
  });

  it('extracts snippet around target line with line numbers', () => {
    const parsed = parseUnifiedDiff(SAMPLE_DIFF);
    const snippet = extractSnippetForLine(parsed[0], 13, 2);
    expect(snippet).toContain('+');
    expect(snippet).toContain('sk-proj');
  });
});
