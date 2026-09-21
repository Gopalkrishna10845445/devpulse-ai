/**
 * Phase 8 — Pull Request Review Engine
 *
 * Central orchestrator for evaluating GitHub Pull Requests.
 * Combines authoritative GitHub PR diffs, AST symbol mapping,
 * deterministic impact analyzers (Architecture, Security, Testing, Dependencies, Docs),
 * and grounded AI synthesis into a cohesive developer review.
 */

import {
  ParsedDiffFile,
  PRReviewFinding,
  PRReviewRequest,
  PRReviewSummary,
  PullRequestMetadata,
  PullRequestReview,
} from './types';
import {
  fetchPullRequestDiff,
  fetchPullRequestFiles,
  fetchPullRequestMetadata,
  parseRepoOwnerAndName,
} from './githubPRFetcher';
import { parseUnifiedDiff } from './diffParser';
import { mapChangedSymbols } from './symbolMapper';
import {
  analyzeArchitectureImpact,
  analyzeDependencyImpact,
  analyzeDocumentationImpact,
  analyzeSecurityImpact,
  analyzeTestingImpact,
} from './impactAnalyzers';
import { ingestRepository } from '../repository/repositoryIngestor';
import { analyzeCodebase } from '../intelligence/codebaseAnalyzer';
import { maskTextSecrets } from '../security/redactor';

export class PRReviewEngine {
  /**
   * Reviews a GitHub Pull Request deterministically.
   */
  public static async reviewPullRequest(request: PRReviewRequest): Promise<PullRequestReview> {
    const startTime = Date.now();
    const { owner, repo } = parseRepoOwnerAndName(request.repositoryId);
    const repoFullName = `${owner}/${repo}`;

    // 1. Fetch Authoritative PR Metadata & Files from GitHub API
    const prMetadata: PullRequestMetadata = await fetchPullRequestMetadata(
      owner,
      repo,
      request.pullRequestNumber
    );

    const changedFiles = await fetchPullRequestFiles(
      owner,
      repo,
      request.pullRequestNumber
    );

    // 2. Fetch Authoritative Unified Diff
    const rawDiff = await fetchPullRequestDiff(
      owner,
      repo,
      request.pullRequestNumber
    );

    // 3. Parse Unified Diff
    const parsedFiles: ParsedDiffFile[] = parseUnifiedDiff(rawDiff);

    // If parsedFiles is empty but changedFiles has entries (e.g. from files API patch property)
    if (parsedFiles.length === 0 && changedFiles.length > 0) {
      for (const cf of changedFiles) {
        if (cf.patch) {
          const singleDiff = `diff --git a/${cf.filePath} b/${cf.filePath}\n--- a/${cf.filePath}\n+++ b/${cf.filePath}\n${cf.patch}`;
          const parsedSingle = parseUnifiedDiff(singleDiff);
          if (parsedSingle.length > 0) {
            parsedFiles.push(parsedSingle[0]);
          }
        }
      }
    }

    // 4. Ingest repository context / symbols if available
    let index = request.preloadedIndex;
    let intelligence = request.preloadedIntelligence;

    if (!index && !intelligence) {
      try {
        index = await ingestRepository({
          owner,
          repository: repo,
          branch: prMetadata.baseBranch || 'main',
        });
        if (index) {
          intelligence = await analyzeCodebase({ index });
        }
      } catch {
        // Fallback gracefully to diff-only analysis if full repo ingestion fails
      }
    }

    // 5. Map Changed Symbols
    const changedSymbols = mapChangedSymbols(parsedFiles, intelligence);

    // 6. Run Multi-Dimensional Impact Analyzers
    const archResult = analyzeArchitectureImpact(parsedFiles, intelligence);
    const secResult = analyzeSecurityImpact(parsedFiles);
    const testResult = analyzeTestingImpact(parsedFiles);
    const depResult = analyzeDependencyImpact(parsedFiles);
    const docResult = analyzeDocumentationImpact(parsedFiles);

    // 7. Aggregate & Deduplicate Findings
    const rawFindings: PRReviewFinding[] = [
      ...archResult.findings,
      ...secResult.findings,
      ...testResult.findings,
      ...depResult.findings,
      ...docResult.findings,
    ];

    const findingsMap = new Map<string, PRReviewFinding>();
    for (const f of rawFindings) {
      if (!findingsMap.has(f.id)) {
        findingsMap.set(f.id, f);
      }
    }
    const findings = Array.from(findingsMap.values());

    // 8. Compute Severity Counts & Summary
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let infoCount = 0;

    for (const f of findings) {
      if (f.severity === 'critical') criticalCount++;
      else if (f.severity === 'high') highCount++;
      else if (f.severity === 'medium') mediumCount++;
      else if (f.severity === 'low') lowCount++;
      else if (f.severity === 'info') infoCount++;
    }

    let verdict: PRReviewSummary['verdict'] = 'approve';
    if (criticalCount > 0 || highCount >= 2) {
      verdict = 'request_changes';
    } else if (highCount === 1 || mediumCount > 0 || lowCount > 0) {
      verdict = 'comment';
    }

    const keyFindings = findings.map(f => f.title).slice(0, 5);

    const executiveSummary =
      verdict === 'request_changes'
        ? `Review requires changes: ${criticalCount} critical and ${highCount} high severity issue(s) identified in PR diff.`
        : verdict === 'comment'
        ? `Review generated ${findings.length} advisory finding(s). Recommend addressing findings prior to merge.`
        : `PR changes verified: Clean diff with 0 high-priority security or architecture anomalies.`;

    const summary: PRReviewSummary = {
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
      verdict,
      keyFindings,
      executiveSummary,
    };

    // 9. Recommendations & Validation Plan
    const recommendations: string[] = [];
    if (criticalCount > 0) {
      recommendations.push('Resolve all critical security findings and sensitive file leaks before merging.');
    }
    if (archResult.impact.status !== 'healthy') {
      recommendations.push('Refactor architectural layer bypasses to preserve modular service boundaries.');
    }
    if (testResult.impact.status === 'warning') {
      recommendations.push('Add automated test coverage for newly introduced or modified production logic.');
    }
    if (depResult.impact.advisoriesDetected.length > 0) {
      recommendations.push('Upgrade or replace dependencies with known vulnerability advisories.');
    }
    if (recommendations.length === 0) {
      recommendations.push('All deterministic checks passed. Proceed with standard CI verification and peer approval.');
    }

    const validationPlan: string[] = [
      'Execute automated test suite (`npm test` or framework test runner)',
      'Run TypeScript / static type checker (`npx tsc --noEmit`)',
      'Run repository code linter (`npm run lint`)',
      'Verify build compilation (`npm run build`)',
    ];

    const durationMs = Date.now() - startTime;

    return {
      id: `PR-REV-${repoFullName.replace('/', '-')}-${prMetadata.number}-${prMetadata.headSha.slice(0, 7)}`,
      repositoryId: repoFullName,
      pullRequest: prMetadata,
      baseCommit: prMetadata.baseSha,
      headCommit: prMetadata.headSha,
      changedFiles,
      changedSymbols,
      summary,
      findings,
      architectureImpact: archResult.impact,
      securityImpact: secResult.impact,
      testingImpact: testResult.impact,
      dependencyImpact: depResult.impact,
      documentationImpact: docResult.impact,
      recommendations,
      validationPlan,
      reviewStatus: 'complete',
      generatedAt: new Date().toISOString(),
      durationMs,
      metadata: {
        ruleCount: findings.length,
        filesAnalyzed: parsedFiles.length || changedFiles.length,
        linesAdded: prMetadata.additions,
        linesDeleted: prMetadata.deletions,
        aiSynthesisUsed: false,
      },
    };
  }
}
