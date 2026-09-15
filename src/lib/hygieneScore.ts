/**
 * Engineering Repository Hygiene Score
 *
 * Transparent, deterministic scoring of a repository's observable engineering signals.
 * Each signal is binary (present/absent) or graduated (activity level).
 * Unavailable signals (null) are excluded from scoring — missing data does NOT penalize.
 *
 * Maximum score: 100 points
 * ┌─────────────────────────┬────────────┬──────────────────────────────────────────────┐
 * │ Signal                  │ Max Points │ Condition                                    │
 * ├─────────────────────────┼────────────┼──────────────────────────────────────────────┤
 * │ README present          │ 20         │ hasReadme === true                           │
 * │ CI/CD workflow          │ 20         │ hasCiWorkflow === true                       │
 * │ Tests detected          │ 20         │ hasTests === true                            │
 * │ Recent activity         │ 0–20       │ commitCount30Days: 0→0, 1-5→10, 6-15→15, 16+→20 │
 * │ License present         │ 10         │ hasLicense === true                          │
 * │ Dependency manifest     │ 10         │ dependencyManifests.length > 0               │
 * └─────────────────────────┴────────────┴──────────────────────────────────────────────┘
 */

import type { HygieneScoreBreakdown, RepositoryMetadata } from './types';

interface RepoSignals {
  hasReadme: boolean | null;
  hasCiWorkflow: boolean | null;
  hasTests: boolean | null;
  hasLicense: boolean;
  commitCount30Days: number | null;
  dependencyManifests: string[];
}

/**
 * Compute activity points from commit count.
 * 0 commits  → 0 pts
 * 1–5 commits → 10 pts
 * 6–15 commits → 15 pts
 * 16+ commits  → 20 pts (full)
 */
export function activityPoints(commitCount: number | null): number {
  if (commitCount === null) return 0; // unavailable — excluded from scoring
  if (commitCount === 0) return 0;
  if (commitCount <= 5) return 10;
  if (commitCount <= 15) return 15;
  return 20;
}

/**
 * Calculate hygiene score for a single repository.
 * Returns a full breakdown with unavailableSignals for transparency.
 */
export function scoreRepo(signals: RepoSignals): HygieneScoreBreakdown {
  const unavailableSignals: string[] = [];
  let earnedPoints = 0;
  let maxPossiblePoints = 0;

  // --- README (20 pts) ---
  if (signals.hasReadme === null) {
    unavailableSignals.push('README');
  } else {
    maxPossiblePoints += 20;
    earnedPoints += signals.hasReadme ? 20 : 0;
  }
  const readmePoints = signals.hasReadme === true ? 20 : 0;

  // --- CI Workflow (20 pts) ---
  if (signals.hasCiWorkflow === null) {
    unavailableSignals.push('CI workflow');
  } else {
    maxPossiblePoints += 20;
    earnedPoints += signals.hasCiWorkflow ? 20 : 0;
  }
  const ciPoints = signals.hasCiWorkflow === true ? 20 : 0;

  // --- Tests (20 pts) ---
  if (signals.hasTests === null) {
    unavailableSignals.push('test detection');
  } else {
    maxPossiblePoints += 20;
    earnedPoints += signals.hasTests ? 20 : 0;
  }
  const testsPoints = signals.hasTests === true ? 20 : 0;

  // --- Activity (0–20 pts) ---
  // null means unavailable — excluded from denominator
  let actPts = 0;
  if (signals.commitCount30Days === null) {
    unavailableSignals.push('commit activity');
  } else {
    maxPossiblePoints += 20;
    actPts = activityPoints(signals.commitCount30Days);
    earnedPoints += actPts;
  }

  // --- License (10 pts) — always determinable from repo metadata ---
  maxPossiblePoints += 10;
  earnedPoints += signals.hasLicense ? 10 : 0;
  const licensePoints = signals.hasLicense ? 10 : 0;

  // --- Dependency Manifest (10 pts) ---
  // If the tree was unavailable, manifests array is empty but we can't distinguish
  // "no manifests" from "tree unavailable". We treat this as always available since
  // it's derived from the same tree fetch as tests — if tests is null, we mark deps unavailable too.
  if (signals.hasTests === null) {
    // tree was unavailable — can't determine manifests either
    unavailableSignals.push('dependency manifests');
  } else {
    maxPossiblePoints += 10;
    const hasManifest = signals.dependencyManifests.length > 0;
    earnedPoints += hasManifest ? 10 : 0;
  }
  const dependencyPoints = signals.dependencyManifests.length > 0 ? 10 : 0;

  const total = maxPossiblePoints === 0
    ? 0
    : Math.round((earnedPoints / maxPossiblePoints) * 100);

  return {
    readmePoints,
    ciPoints,
    testsPoints,
    activityPoints: actPts,
    licensePoints,
    dependencyPoints,
    maxPossiblePoints,
    earnedPoints,
    total,
    unavailableSignals,
  };
}

/**
 * Aggregate hygiene scores across multiple repositories.
 * Excludes archived repos from the calculation.
 * Returns the averaged score, or null if no repos could be scored.
 */
export function aggregateHygieneScore(
  repos: Pick<RepositoryMetadata,
    'hasReadme' | 'hasCiWorkflow' | 'hasTests' | 'hasLicense' |
    'commitCount30Days' | 'dependencyManifests' | 'isArchived'>[]
): HygieneScoreBreakdown | null {
  const activeRepos = repos.filter(r => !r.isArchived);
  if (activeRepos.length === 0) return null;

  const breakdowns = activeRepos.map(repo => scoreRepo({
    hasReadme: repo.hasReadme,
    hasCiWorkflow: repo.hasCiWorkflow,
    hasTests: repo.hasTests,
    hasLicense: repo.hasLicense,
    commitCount30Days: repo.commitCount30Days,
    dependencyManifests: repo.dependencyManifests,
  }));

  // Aggregate by summing earned and max across all repos, then computing overall percentage
  const totalEarned = breakdowns.reduce((acc, b) => acc + b.earnedPoints, 0);
  const totalMax = breakdowns.reduce((acc, b) => acc + b.maxPossiblePoints, 0);

  const avgReadme = Math.round(breakdowns.reduce((a, b) => a + b.readmePoints, 0) / breakdowns.length);
  const avgCi = Math.round(breakdowns.reduce((a, b) => a + b.ciPoints, 0) / breakdowns.length);
  const avgTests = Math.round(breakdowns.reduce((a, b) => a + b.testsPoints, 0) / breakdowns.length);
  const avgActivity = Math.round(breakdowns.reduce((a, b) => a + b.activityPoints, 0) / breakdowns.length);
  const avgLicense = Math.round(breakdowns.reduce((a, b) => a + b.licensePoints, 0) / breakdowns.length);
  const avgDeps = Math.round(breakdowns.reduce((a, b) => a + b.dependencyPoints, 0) / breakdowns.length);

  // Collect all unique unavailable signals
  const unavailableSet = new Set<string>();
  breakdowns.forEach(b => b.unavailableSignals.forEach(s => unavailableSet.add(s)));

  const total = totalMax === 0 ? 0 : Math.round((totalEarned / totalMax) * 100);

  return {
    readmePoints: avgReadme,
    ciPoints: avgCi,
    testsPoints: avgTests,
    activityPoints: avgActivity,
    licensePoints: avgLicense,
    dependencyPoints: avgDeps,
    maxPossiblePoints: Math.round(totalMax / breakdowns.length),
    earnedPoints: Math.round(totalEarned / breakdowns.length),
    total,
    unavailableSignals: Array.from(unavailableSet),
  };
}
