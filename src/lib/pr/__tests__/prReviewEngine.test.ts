/**
 * Phase 8 — PR Review Engine Unit & Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PRReviewEngine } from '../prReviewEngine';
import * as githubFetcher from '../githubPRFetcher';

describe('Phase 8 PR Review Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('conducts end-to-end PR review combining diff parsing, impact scorecards, and deterministic findings', async () => {
    vi.spyOn(githubFetcher, 'fetchPullRequestMetadata').mockResolvedValue({
      number: 42,
      title: 'Add authentication middleware and admin routes',
      body: 'Implements JWT auth and admin dashboard route.',
      author: 'dev-alice',
      state: 'open',
      baseBranch: 'main',
      headBranch: 'feature/auth-admin',
      baseSha: 'abc1234567890abcdef',
      headSha: 'def9876543210fedcba',
      createdAt: '2026-09-18T00:00:00Z',
      updatedAt: '2026-09-18T00:00:00Z',
      additions: 120,
      deletions: 15,
      changedFilesCount: 3,
      htmlUrl: 'https://github.com/org/repo/pull/42',
    });

    vi.spyOn(githubFetcher, 'fetchPullRequestFiles').mockResolvedValue([
      { filePath: 'src/routes/admin.ts', additions: 50, deletions: 0, changes: 50, status: 'added' },
      { filePath: 'src/auth/jwt.ts', additions: 70, deletions: 15, changes: 85, status: 'modified' },
    ]);

    const mockDiff = `diff --git a/src/routes/admin.ts b/src/routes/admin.ts
new file mode 100644
--- /dev/null
+++ b/src/routes/admin.ts
@@ -0,0 +1,5 @@
+import { prisma } from '@/lib/database/prisma';
+export async function GET() {
+  return prisma.user.findMany();
+}
diff --git a/src/auth/jwt.ts b/src/auth/jwt.ts
--- a/src/auth/jwt.ts
+++ b/src/auth/jwt.ts
@@ -10,2 +10,4 @@
+const JWT_SECRET = "sk-live-1234567890abcdef1234567890";
+export const S3_KEY = process.env.NEW_S3_KEY;
`;

    vi.spyOn(githubFetcher, 'fetchPullRequestDiff').mockResolvedValue(mockDiff);

    const review = await PRReviewEngine.reviewPullRequest({
      repositoryId: 'org/repo',
      pullRequestNumber: 42,
    });

    expect(review).toBeDefined();
    expect(review.pullRequest.number).toBe(42);
    expect(review.repositoryId).toBe('org/repo');
    expect(review.reviewStatus).toBe('complete');
    expect(review.summary.criticalCount).toBeGreaterThan(0); // Secret detected
    expect(review.summary.verdict).toBe('request_changes');
    expect(review.findings.length).toBeGreaterThanOrEqual(2);
    expect(review.recommendations.length).toBeGreaterThan(0);
    expect(review.validationPlan.length).toBeGreaterThan(0);
  });
});
