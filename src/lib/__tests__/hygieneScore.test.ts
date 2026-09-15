import { describe, it, expect } from 'vitest';
import { activityPoints, scoreRepo, aggregateHygieneScore } from '../hygieneScore';

describe('activityPoints', () => {
  it('returns 0 for null (unavailable)', () => {
    expect(activityPoints(null)).toBe(0);
  });
  it('returns 0 for 0 commits', () => {
    expect(activityPoints(0)).toBe(0);
  });
  it('returns 10 for 1 commit', () => {
    expect(activityPoints(1)).toBe(10);
  });
  it('returns 10 for 5 commits', () => {
    expect(activityPoints(5)).toBe(10);
  });
  it('returns 15 for 6 commits', () => {
    expect(activityPoints(6)).toBe(15);
  });
  it('returns 15 for 15 commits', () => {
    expect(activityPoints(15)).toBe(15);
  });
  it('returns 20 for 16 commits', () => {
    expect(activityPoints(16)).toBe(20);
  });
  it('returns 20 for 100 commits', () => {
    expect(activityPoints(100)).toBe(20);
  });
});

describe('scoreRepo', () => {
  it('returns 100/100 when all signals are perfect', () => {
    const result = scoreRepo({
      hasReadme: true,
      hasCiWorkflow: true,
      hasTests: true,
      hasLicense: true,
      commitCount30Days: 20,
      dependencyManifests: ['package.json'],
    });
    expect(result.total).toBe(100);
    expect(result.earnedPoints).toBe(100);
    expect(result.maxPossiblePoints).toBe(100);
    expect(result.unavailableSignals).toHaveLength(0);
  });

  it('returns 0 when all signals are false/empty', () => {
    const result = scoreRepo({
      hasReadme: false,
      hasCiWorkflow: false,
      hasTests: false,
      hasLicense: false,
      commitCount30Days: 0,
      dependencyManifests: [],
    });
    expect(result.total).toBe(0);
    expect(result.earnedPoints).toBe(0);
  });

  it('excludes null signals from denominator (partial scoring)', () => {
    const result = scoreRepo({
      hasReadme: null,     // excluded → max is 80 not 100
      hasCiWorkflow: true,
      hasTests: true,
      hasLicense: true,
      commitCount30Days: 20,
      dependencyManifests: ['package.json'],
    });
    // earned: 20 (ci) + 20 (tests) + 20 (activity) + 10 (license) + 10 (deps) = 80
    // max possible: 80 (readme excluded)
    expect(result.maxPossiblePoints).toBe(80);
    expect(result.earnedPoints).toBe(80);
    expect(result.total).toBe(100); // 80/80 = 100%
    expect(result.unavailableSignals).toContain('README');
  });

  it('excludes CI from denominator when CI is null', () => {
    const result = scoreRepo({
      hasReadme: true,
      hasCiWorkflow: null,
      hasTests: true,
      hasLicense: true,
      commitCount30Days: 10,
      dependencyManifests: ['package.json'],
    });
    expect(result.unavailableSignals).toContain('CI workflow');
    // max: 80 (no CI in denominator), earned: 20+20+15+10+10=75
    expect(result.maxPossiblePoints).toBe(80);
    expect(result.earnedPoints).toBe(75);
  });

  it('excludes activity from denominator when commits are null', () => {
    const result = scoreRepo({
      hasReadme: true,
      hasCiWorkflow: true,
      hasTests: true,
      hasLicense: true,
      commitCount30Days: null,
      dependencyManifests: ['package.json'],
    });
    // max: 80 (activity excluded), earned: 20+20+20+10+10=80
    expect(result.maxPossiblePoints).toBe(80);
    expect(result.earnedPoints).toBe(80);
    expect(result.total).toBe(100);
    expect(result.unavailableSignals).toContain('commit activity');
  });

  it('excludes dep manifests from denominator when tests are null (tree unavailable)', () => {
    const result = scoreRepo({
      hasReadme: true,
      hasCiWorkflow: true,
      hasTests: null,   // tree unavailable
      hasLicense: true,
      commitCount30Days: 20,
      dependencyManifests: [],
    });
    expect(result.unavailableSignals).toContain('test detection');
    expect(result.unavailableSignals).toContain('dependency manifests');
    // max: 80 (tests + deps excluded), earned: 20+20+20+10=70
    expect(result.maxPossiblePoints).toBe(70);
  });

  it('correctly scores with multiple nulls', () => {
    const result = scoreRepo({
      hasReadme: null,
      hasCiWorkflow: null,
      hasTests: null,
      hasLicense: false,
      commitCount30Days: null,
      dependencyManifests: [],
    });
    // Only license is determinable (10 pts max), earned=0
    expect(result.maxPossiblePoints).toBe(10);
    expect(result.earnedPoints).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe('aggregateHygieneScore', () => {
  it('returns null for empty repo list', () => {
    expect(aggregateHygieneScore([])).toBeNull();
  });

  it('returns null when all repos are archived', () => {
    const result = aggregateHygieneScore([{
      hasReadme: true,
      hasCiWorkflow: true,
      hasTests: true,
      hasLicense: true,
      commitCount30Days: 20,
      dependencyManifests: ['package.json'],
      isArchived: true,
    }]);
    expect(result).toBeNull();
  });

  it('excludes archived repos from scoring', () => {
    const repos = [
      {
        hasReadme: true, hasCiWorkflow: true, hasTests: true, hasLicense: true,
        commitCount30Days: 20, dependencyManifests: ['package.json'], isArchived: false,
      },
      {
        hasReadme: false, hasCiWorkflow: false, hasTests: false, hasLicense: false,
        commitCount30Days: 0, dependencyManifests: [], isArchived: true, // should be excluded
      },
    ];
    const result = aggregateHygieneScore(repos);
    expect(result).not.toBeNull();
    expect(result!.total).toBe(100); // only the first repo counts
  });

  it('averages scores across multiple active repos', () => {
    const repos = [
      {
        hasReadme: true, hasCiWorkflow: true, hasTests: true, hasLicense: true,
        commitCount30Days: 20, dependencyManifests: ['package.json'], isArchived: false,
      },
      {
        hasReadme: false, hasCiWorkflow: false, hasTests: false, hasLicense: false,
        commitCount30Days: 0, dependencyManifests: [], isArchived: false,
      },
    ];
    const result = aggregateHygieneScore(repos);
    expect(result).not.toBeNull();
    // First repo: 100/100, second: 0/100, aggregate: 50/200 → 50%
    expect(result!.total).toBe(50);
  });
});
