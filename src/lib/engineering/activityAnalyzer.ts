/**
 * Phase 5 — Activity Signal Analyzer
 *
 * Deterministically evaluates engineering activity trends from Phase 1 GitHub telemetry
 * when available. Returns explicit 'Insufficient historical data' when telemetry is absent.
 *
 * NOTE: Never manufactures or fabricates historical activity trends.
 */

import { GitHubTelemetry } from '../types';
import { ActivityIndicators, EngineeringFinding, SignalMetric } from './types';

export function analyzeActivity(
  github?: GitHubTelemetry | null
): { indicators: ActivityIndicators; findings: EngineeringFinding[] } {
  const findings: EngineeringFinding[] = [];

  if (!github || github.isFallbackData) {
    const metrics: SignalMetric[] = [
      {
        name: 'Commit Activity',
        value: null,
        status: 'unavailable',
        label: 'Commit Activity',
        description: 'Commit velocity over recent development window.',
        unavailableReason: 'Insufficient historical GitHub telemetry data.',
      },
      {
        name: '30-Day Commits',
        value: null,
        status: 'unavailable',
        label: '30-Day Commits',
        description: 'Total commits in the past 30 days.',
        unavailableReason: 'GitHub activity history not loaded.',
      },
      {
        name: 'PR Merge Ratio',
        value: null,
        status: 'unavailable',
        label: 'PR Merge Ratio',
        description: 'Percentage of merged pull requests versus closed.',
        unavailableReason: 'GitHub pull request data unavailable.',
      },
    ];

    return {
      indicators: {
        status: 'unavailable',
        summary: 'Historical activity metrics unavailable (requires live GitHub telemetry).',
        isAvailable: false,
        unavailableReason: 'Insufficient historical GitHub telemetry data.',
        activeCommitStreakDays: null,
        recentCommitVelocity: null,
        commitCount30Days: null,
        prMergeRatio: null,
        metrics,
      },
      findings: [],
    };
  }

  // Live GitHub data is available
  const streak = github.activeCommitStreakDays;
  const velocity = github.recentCommitVelocity;
  const commits30d = github.commitCount30Days;
  const prRatio = github.prMergeRatio;

  if (commits30d !== null && commits30d === 0) {
    findings.push({
      id: 'activity-dormant-repo',
      category: 'activity',
      severity: 'low',
      title: 'No commit activity in past 30 days',
      description: 'Zero commits were detected in the primary branch over the past 30 days.',
      impact: 'Dormant repositories may have accumulated unmerged updates, dependency deprecations, or stale configurations.',
      confidence: 'high',
      deterministicRule: 'RULE_ACTIVITY_ZERO_30D_COMMITS',
      recommendation: 'Ensure active maintenance schedule or mark repository as archived if development has concluded.',
      evidence: {
        type: 'git_telemetry',
        summary: '0 commits recorded across past 30 days from GitHub REST API.',
        references: [{ metricName: '30DayCommits', metricValue: 0 }],
      },
    });
  }

  const metrics: SignalMetric[] = [
    {
      name: 'Active Commit Streak',
      value: streak !== null ? `${streak} days` : 'N/A',
      status: streak && streak >= 5 ? 'healthy' : 'neutral',
      label: 'Commit Streak',
      description: 'Consecutive active development days.',
      evidence: streak !== null ? `${streak} consecutive active days` : 'Unavailable',
    },
    {
      name: 'Recent Commit Velocity',
      value: velocity !== null ? `${velocity} / wk` : 'N/A',
      status: velocity && velocity >= 3 ? 'healthy' : 'neutral',
      label: 'Commit Velocity',
      description: 'Average commits pushed per active week.',
      evidence: velocity !== null ? `${velocity} commits per week` : 'Unavailable',
    },
    {
      name: '30-Day Commits',
      value: commits30d !== null ? commits30d : 'N/A',
      status: commits30d && commits30d > 0 ? 'healthy' : 'neutral',
      label: '30-Day Commits',
      description: 'Total commits recorded in past 30 days.',
      evidence: commits30d !== null ? `${commits30d} commits in 30 days` : 'Unavailable',
    },
    {
      name: 'PR Merge Ratio',
      value: prRatio !== null ? `${prRatio}%` : 'N/A',
      status: prRatio && prRatio >= 70 ? 'healthy' : 'neutral',
      label: 'PR Merge Ratio',
      description: 'Percentage of pull requests successfully merged.',
      evidence: prRatio !== null ? `${prRatio}% PR merge rate` : 'Unavailable',
    },
  ];

  return {
    indicators: {
      status: 'healthy',
      summary: `Active telemetry: ${commits30d ?? 0} commits in past 30 days. Velocity: ${velocity ?? 0}/week.`,
      isAvailable: true,
      activeCommitStreakDays: streak,
      recentCommitVelocity: velocity,
      commitCount30Days: commits30d,
      prMergeRatio: prRatio,
      metrics,
    },
    findings,
  };
}
