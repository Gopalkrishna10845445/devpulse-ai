/**
 * Phase 8 — Symbol Mapper Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { parseUnifiedDiff } from '../diffParser';
import { mapChangedSymbols } from '../symbolMapper';
import { CodebaseIntelligence } from '../../intelligence/types';

const SAMPLE_DIFF = `diff --git a/src/services/orderService.ts b/src/services/orderService.ts
--- a/src/services/orderService.ts
+++ b/src/services/orderService.ts
@@ -15,4 +15,6 @@ export class OrderService {
   public processOrder(orderId: string): boolean {
+    console.log("Processing order", orderId);
     return true;
   }
 }
`;

describe('Phase 8 Changed Symbol Mapper', () => {
  it('maps modified line numbers to corresponding CodeSymbol from intelligence', () => {
    const parsed = parseUnifiedDiff(SAMPLE_DIFF);

    const mockIntelligence: CodebaseIntelligence = {
      repository: { owner: 'test-org', name: 'test-repo', fullName: 'test-org/test-repo', defaultBranch: 'main' } as any,
      symbols: [
        {
          name: 'processOrder',
          kind: 'function',
          filePath: 'src/services/orderService.ts',
          line: 15,
          isExported: true,
          signature: 'public processOrder(orderId: string): boolean',
        },
        {
          name: 'OrderService',
          kind: 'class',
          filePath: 'src/services/orderService.ts',
          line: 1,
          isExported: true,
        },
      ],
      files: [],
      imports: [],
      exports: [],
      relationships: [],
      architecture: {} as any,
      analyzedAt: new Date().toISOString(),
      status: 'complete',
      durationMs: 10,
    };

    const changedSymbols = mapChangedSymbols(parsed, mockIntelligence);
    expect(changedSymbols).toHaveLength(1);
    expect(changedSymbols[0].name).toBe('processOrder');
    expect(changedSymbols[0].kind).toBe('function');
    expect(changedSymbols[0].filePath).toBe('src/services/orderService.ts');
  });

  it('parses symbols directly from diff when intelligence is not supplied', () => {
    const parsed = parseUnifiedDiff(SAMPLE_DIFF);
    const changedSymbols = mapChangedSymbols(parsed, null);
    expect(changedSymbols.length).toBeGreaterThanOrEqual(1);
  });
});
