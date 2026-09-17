import { describe, it, expect } from 'vitest';
import { scanAuthSignals } from '../authPatternScanner';
import { createMockRepoIndex } from './testHelpers';

describe('Phase 6: Authentication & Authorization Scanner', () => {
  it('distinguishes protected routes with auth middleware from unprotected endpoints', () => {
    const repoIndex = createMockRepoIndex({
      files: [
        {
          path: 'src/app/api/admin/route.ts',
          name: 'route.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'import { requireAuth } from "@/lib/auth";\nexport async function POST() { requireAuth(); }',
          sizeBytes: 80,
          extension: '.ts',
          sha: '1',
        },
        {
          path: 'src/app/api/public-metrics/route.ts',
          name: 'route.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'export async function GET() { return Response.json({ status: "ok" }); }',
          sizeBytes: 70,
          extension: '.ts',
          sha: '2',
        },
      ],
    });

    const res = scanAuthSignals(repoIndex);
    expect(res.indicators.protectedRoutesCount).toBe(1);
    expect(res.indicators.unprotectedEndpointsCount).toBe(1);

    const unprotectedFinding = res.findings.find(f => f.filePath === 'src/app/api/public-metrics/route.ts');
    expect(unprotectedFinding).toBeDefined();
    expect(unprotectedFinding?.deterministicRule).toBe('RULE_AUTH_NO_DETECTABLE_GUARD');
    expect(unprotectedFinding?.confidence).toBe('low');
    expect(unprotectedFinding?.description).toContain('No recognizable authentication middleware');
  });
});
