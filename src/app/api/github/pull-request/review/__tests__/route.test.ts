/**
 * Phase 8 — PR Review API Route Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { PRReviewEngine } from '@/lib/pr/prReviewEngine';

describe('POST /api/github/pull-request/review', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 if repositoryId is missing or invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/github/pull-request/review', {
      method: 'POST',
      body: JSON.stringify({ pullRequestNumber: 1 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('returns 400 if pullRequestNumber is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/github/pull-request/review', {
      method: 'POST',
      body: JSON.stringify({ repositoryId: 'owner/repo', pullRequestNumber: -1 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('successfully returns PullRequestReview for valid request', async () => {
    vi.spyOn(PRReviewEngine, 'reviewPullRequest').mockResolvedValue({
      id: 'PR-REV-1',
      repositoryId: 'owner/repo',
      pullRequest: { number: 1, title: 'Sample PR' } as any,
      baseCommit: 'abc',
      headCommit: 'def',
      changedFiles: [],
      changedSymbols: [],
      summary: {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0,
        verdict: 'approve',
        keyFindings: [],
        executiveSummary: 'Clean diff',
      },
      findings: [],
      architectureImpact: { summary: 'Clean', status: 'healthy', layerBypasses: [], circularDependencies: [], couplingChanges: [] },
      securityImpact: { summary: 'Clean', status: 'clean', introducedSecrets: 0, sensitiveChanges: [], advisoryCount: 0 },
      testingImpact: { summary: 'Clean', status: 'adequate', changedSourceFilesWithoutTests: [], newTestsCount: 0, modifiedTestsCount: 0, deletedTestsCount: 0 },
      dependencyImpact: { summary: 'Clean', status: 'clean', addedPackages: [], removedPackages: [], upgradedPackages: [], advisoriesDetected: [] },
      documentationImpact: { summary: 'Clean', status: 'adequate', publicApiChangesWithoutDocs: [], newConfigOrEnvVarsWithoutDocs: [] },
      recommendations: [],
      validationPlan: [],
      reviewStatus: 'complete',
      generatedAt: new Date().toISOString(),
      durationMs: 50,
      metadata: { ruleCount: 0, filesAnalyzed: 0, linesAdded: 0, linesDeleted: 0, aiSynthesisUsed: false },
    });

    const req = new NextRequest('http://localhost:3000/api/github/pull-request/review', {
      method: 'POST',
      body: JSON.stringify({ repositoryId: 'owner/repo', pullRequestNumber: 1 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.review.id).toBe('PR-REV-1');
  });
});
