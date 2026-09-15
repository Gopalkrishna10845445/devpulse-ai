/**
 * GitHub Engineering Telemetry Analyzer
 *
 * Fetches real GitHub data via the GitHub REST API v3.
 * All calls are server-side only — GITHUB_TOKEN never leaves the server.
 *
 * Deep inspection strategy:
 *   - Top 12 repos fetched for basic metadata (stars, forks, language, etc.)
 *   - Top 3 most-recently-updated, non-forked, non-archived repos get deep inspection:
 *       README, CI workflows, test file detection, dependency manifests,
 *       30-day commit count, PR merge ratio
 *   - Language data: aggregate byte counts across top repos via /languages endpoint
 *
 * Rate limit budget per evaluation (approximate):
 *   1  GET /users/{username}
 *   1  GET /users/{username}/repos
 *   3  GET /repos/{owner}/{repo}/languages      (3 repos)
 *   3  GET /repos/{owner}/{repo}/readme
 *   3  GET /repos/{owner}/{repo}/contents/.github/workflows
 *   3  GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
 *   3  GET /repos/{owner}/{repo}/commits?since=...
 *   3  GET /repos/{owner}/{repo}/pulls?state=closed
 *   ─────────────────────────────────────────────────────
 *   ~20 requests total (5000/hr authenticated, 60/hr unauthenticated)
 */

import { GitHubTelemetry, RepositoryMetadata } from './types';
import { aggregateHygieneScore } from './hygieneScore';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = 'https://api.github.com';

/** Number of repositories to fetch basic metadata for */
const REPO_FETCH_LIMIT = 12;

/** Number of repositories to run deep inspection on */
const DEEP_INSPECT_LIMIT = 3;

/** Commit history window in days */
const COMMIT_WINDOW_DAYS = 30;

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript:  '#3178c6',
  JavaScript:  '#f1e05a',
  Go:          '#00add8',
  Python:      '#3572A5',
  Rust:        '#dea584',
  Java:        '#b07219',
  'C++':       '#f34b7d',
  'C#':        '#178600',
  C:           '#555555',
  HTML:        '#e34c26',
  CSS:         '#563d7c',
  SCSS:        '#c6538c',
  Shell:       '#89e051',
  Bash:        '#89e051',
  Ruby:        '#701516',
  PHP:         '#4F5D95',
  Swift:       '#ffac45',
  Kotlin:      '#A97BFF',
  Dart:        '#00B4AB',
  Scala:       '#c22d40',
  R:           '#198CE7',
  Lua:         '#000080',
  Vue:         '#41b883',
  Svelte:      '#ff3e00',
};

/** Patterns that indicate test files/directories */
const TEST_PATTERNS = [
  /^test\//i,
  /^tests\//i,
  /^\+tests\//i,
  /^__tests__\//i,
  /^spec\//i,
  /^specs\//i,
  /\.test\.[jt]sx?$/i,
  /\.spec\.[jt]sx?$/i,
  /_test\.[jt]sx?$/i,
  /\.test\.py$/i,
  /\.spec\.py$/i,
  /^test_.*\.py$/i,
  /\btest_.*\.py$/i,
  /\.test\.go$/i,
  /_test\.go$/i,
  /\.test\.rb$/i,
  /\.test\.java$/i,
  /Spec\.java$/i,
  /Test\.java$/i,
  /\.test\.rs$/i,
];

/** Dependency manifest filenames */
const MANIFEST_FILENAMES = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'setup.py',
  'setup.cfg',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'go.mod',
  'Cargo.toml',
  'Gemfile',
  'composer.json',
  'pubspec.yaml',
  'Package.swift',
  'mix.exs',
  'project.clj',
  'deps.edn',
];

// ─── Helper: Build auth headers ───────────────────────────────────────────────

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'DevPilot-GitHub-Analyzer/1.0',
    Accept: 'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

// ─── Helper: Classify fetch errors ────────────────────────────────────────────

type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; rateLimited: boolean; notFound: boolean; reason: string };

async function ghFetch<T>(url: string, headers: Record<string, string>): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, { headers });
    if (res.status === 200) {
      const data = await res.json() as T;
      return { ok: true, data };
    }
    if (res.status === 404) {
      return { ok: false, status: 404, rateLimited: false, notFound: true, reason: `Not found: ${url}` };
    }
    if (res.status === 403 || res.status === 429) {
      return {
        ok: false,
        status: res.status,
        rateLimited: true,
        notFound: false,
        reason: `Rate limited or access denied (${res.status}). Set GITHUB_TOKEN to increase rate limit.`,
      };
    }
    return {
      ok: false,
      status: res.status,
      rateLimited: false,
      notFound: false,
      reason: `GitHub API returned ${res.status} for ${url}`,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      status: 0,
      rateLimited: false,
      notFound: false,
      reason: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── Fallback constructor ─────────────────────────────────────────────────────

export function unavailableGitHubTelemetry(
  username: string,
  reason: string
): GitHubTelemetry {
  return {
    username: username || '',
    name: username || '',
    avatarUrl: '',
    bio: '',
    publicReposCount: 0,
    totalStars: 0,
    totalForks: 0,
    accountAgeYears: 0,
    languages: [],
    languageBytes: [],
    topRepositories: [],
    commitCount30Days: null,
    recentCommitVelocity: null,
    activeCommitStreakDays: null,
    prMergeRatio: null,
    dependencyManifests: [],
    overallHygieneScore: null,
    hygieneBreakdown: null,
    isFallbackData: true,
    unavailableReason: reason,
    deepInspectedRepos: 0,
    rateLimited: false,
    errors: [reason],
  };
}

// ─── README detection ─────────────────────────────────────────────────────────

async function checkReadme(
  owner: string,
  repo: string,
  headers: Record<string, string>
): Promise<{ result: boolean | null; rateLimited: boolean }> {
  const res = await ghFetch<unknown>(`${API_BASE}/repos/${owner}/${repo}/readme`, headers);
  if (res.ok) return { result: true, rateLimited: false };
  if (!res.ok && res.notFound) return { result: false, rateLimited: false };
  if (!res.ok && res.rateLimited) return { result: null, rateLimited: true };
  return { result: null, rateLimited: false };
}

// ─── CI/CD workflow detection ─────────────────────────────────────────────────

async function checkCIWorkflows(
  owner: string,
  repo: string,
  headers: Record<string, string>
): Promise<{ result: boolean | null; rateLimited: boolean }> {
  const res = await ghFetch<unknown[]>(
    `${API_BASE}/repos/${owner}/${repo}/contents/.github/workflows`,
    headers
  );
  if (res.ok) {
    // Check if any .yml or .yaml files exist
    const files = res.data;
    const hasWorkflows = Array.isArray(files) && files.some((f: any) =>
      typeof f.name === 'string' && /\.(yml|yaml)$/i.test(f.name)
    );
    return { result: hasWorkflows, rateLimited: false };
  }
  if (!res.ok && res.notFound) return { result: false, rateLimited: false };
  if (!res.ok && res.rateLimited) return { result: null, rateLimited: true };
  return { result: null, rateLimited: false };
}

// ─── Test file + dependency manifest detection ────────────────────────────────

interface TreeFile {
  path: string;
  type: string; // 'blob' | 'tree'
}

async function inspectRepoTree(
  owner: string,
  repo: string,
  branch: string,
  headers: Record<string, string>
): Promise<{
  hasTests: boolean | null;
  dependencyManifests: string[];
  rateLimited: boolean;
}> {
  const res = await ghFetch<{ tree: TreeFile[] }>(
    `${API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    headers
  );

  if (!res.ok) {
    return {
      hasTests: null,
      dependencyManifests: [],
      rateLimited: res.rateLimited,
    };
  }

  const tree = res.data.tree || [];
  // GitHub truncates at 100,000 items — acceptable for our needs

  let hasTests = false;
  const foundManifests = new Set<string>();

  for (const item of tree) {
    if (item.type !== 'blob') continue;
    const filePath = item.path;
    const fileName = filePath.split('/').pop() || '';

    // Test detection
    if (!hasTests) {
      hasTests = TEST_PATTERNS.some(p => p.test(filePath) || p.test(fileName));
    }

    // Dependency manifest detection
    if (MANIFEST_FILENAMES.includes(fileName)) {
      foundManifests.add(fileName);
    }
  }

  return {
    hasTests,
    dependencyManifests: Array.from(foundManifests),
    rateLimited: false,
  };
}

// ─── Commit count (30-day window) ────────────────────────────────────────────

/**
 * Counts commits in the last COMMIT_WINDOW_DAYS days for a specific repo.
 * Uses the author login filter to count only the profile owner's commits.
 *
 * Note: Commits using email-only authors without a GitHub login may be undercounted.
 * This is an accepted limitation — see Phase 1 final report.
 */
async function fetchCommitCount(
  owner: string,
  repo: string,
  username: string,
  headers: Record<string, string>
): Promise<{ count: number | null; dates: string[]; rateLimited: boolean }> {
  const since = new Date();
  since.setDate(since.getDate() - COMMIT_WINDOW_DAYS);
  const sinceISO = since.toISOString();

  // GitHub returns up to 100 per page. For most repos 30-day commits < 100.
  const url = `${API_BASE}/repos/${owner}/${repo}/commits?author=${encodeURIComponent(username)}&since=${sinceISO}&per_page=100`;
  const res = await ghFetch<any[]>(url, headers);

  if (!res.ok) {
    return { count: null, dates: [], rateLimited: res.rateLimited };
  }

  const commits = res.data;
  if (!Array.isArray(commits)) return { count: null, dates: [], rateLimited: false };

  // Extract commit dates for streak calculation
  const dates = commits
    .map(c => c?.commit?.committer?.date || c?.commit?.author?.date)
    .filter(Boolean)
    .map((d: string) => d.split('T')[0]); // YYYY-MM-DD

  return { count: commits.length, dates, rateLimited: false };
}

// ─── Commit streak calculation ────────────────────────────────────────────────

/**
 * Calculates the longest consecutive-day streak in a list of commit dates.
 * Searches from today backward, requiring at least 1 commit per day.
 */
export function calculateCommitStreak(allDates: string[]): number {
  if (allDates.length === 0) return 0;

  const dateSet = new Set(allDates);
  const now = new Date();

  // Work in UTC throughout — consistent with GitHub commit date extraction (ISO split on 'T')
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayStr = todayUTC.toISOString().split('T')[0];

  const yesterdayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const yesterdayStr = yesterdayUTC.toISOString().split('T')[0];

  // Grace rule: if today (UTC) has no commit, start from yesterday
  let startUTC: Date;
  if (dateSet.has(todayStr)) {
    startUTC = todayUTC;
  } else if (dateSet.has(yesterdayStr)) {
    startUTC = yesterdayUTC;
  } else {
    return 0;
  }

  let streak = 0;
  const cursor = new Date(startUTC);

  while (true) {
    const ds = cursor.toISOString().split('T')[0];
    if (dateSet.has(ds)) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}


// ─── PR merge ratio ───────────────────────────────────────────────────────────

/**
 * Fetches closed PRs for a repo and calculates merge ratio.
 *
 * Ratio = merged PRs / total closed PRs × 100
 * Returns null (not 0%) when no closed PRs exist — they are different states.
 */
async function fetchPRMergeRatio(
  owner: string,
  repo: string,
  headers: Record<string, string>
): Promise<{ ratio: number | null; rateLimited: boolean }> {
  const url = `${API_BASE}/repos/${owner}/${repo}/pulls?state=closed&per_page=100`;
  const res = await ghFetch<any[]>(url, headers);

  if (!res.ok) {
    return { ratio: null, rateLimited: res.rateLimited };
  }

  const pulls = res.data;
  if (!Array.isArray(pulls) || pulls.length === 0) {
    // "No closed PRs" is distinct from "0% merged" — return null
    return { ratio: null, rateLimited: false };
  }

  const merged = pulls.filter(p => p.merged_at !== null).length;
  const ratio = Math.round((merged / pulls.length) * 100);
  return { ratio, rateLimited: false };
}

// ─── Language aggregation ─────────────────────────────────────────────────────

async function fetchLanguageBytes(
  owner: string,
  repo: string,
  headers: Record<string, string>
): Promise<Record<string, number>> {
  const res = await ghFetch<Record<string, number>>(
    `${API_BASE}/repos/${owner}/${repo}/languages`,
    headers
  );
  return res.ok ? res.data : {};
}

// ─── Main telemetry fetcher ───────────────────────────────────────────────────

export async function fetchGitHubTelemetry(username: string): Promise<GitHubTelemetry> {
  const cleanUsername = username
    .replace(/https?:\/\/github\.com\//i, '')
    .replace(/\/$/, '')
    .trim();

  if (!cleanUsername) {
    return unavailableGitHubTelemetry('', 'No GitHub username provided');
  }

  const headers = buildHeaders();
  const errors: string[] = [];
  let rateLimited = false;

  // ── 1. User Profile ────────────────────────────────────────────────────────
  const userRes = await ghFetch<any>(`${API_BASE}/users/${encodeURIComponent(cleanUsername)}`, headers);

  if (!userRes.ok) {
    if (userRes.notFound) {
      return unavailableGitHubTelemetry(cleanUsername, `GitHub user "${cleanUsername}" was not found`);
    }
    if (userRes.rateLimited) {
      return unavailableGitHubTelemetry(
        cleanUsername,
        'GitHub API rate limit reached. Set GITHUB_TOKEN in .env.local to raise the limit to 5000 requests/hour.'
      );
    }
    return unavailableGitHubTelemetry(cleanUsername, userRes.reason);
  }

  const userData = userRes.data;

  // ── 2. Repository List ──────────────────────────────────────────────────────
  const reposRes = await ghFetch<any[]>(
    `${API_BASE}/users/${encodeURIComponent(cleanUsername)}/repos?sort=updated&per_page=${REPO_FETCH_LIMIT}`,
    headers
  );

  if (!reposRes.ok) {
    if (reposRes.rateLimited) rateLimited = true;
    errors.push(reposRes.reason);
    // Return profile-only data if repos fail
    return buildTelemetry(userData, cleanUsername, [], [], 0, null, null, null, null, [], [], rateLimited, errors);
  }

  const allRepos: any[] = Array.isArray(reposRes.data) ? reposRes.data : [];

  // ── 3. Build basic repository metadata (no deep API calls yet) ─────────────
  let totalStars = 0;
  let totalForks = 0;

  const basicRepos: RepositoryMetadata[] = allRepos.map((repo: any) => {
    totalStars += repo.stargazers_count || 0;
    totalForks += repo.forks_count || 0;

    return {
      name: repo.name || '',
      owner: repo.owner?.login || cleanUsername,
      description: repo.description || '',
      url: repo.html_url || '',
      defaultBranch: repo.default_branch || 'main',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      openIssues: repo.open_issues_count || 0,
      size: repo.size || 0,
      isArchived: Boolean(repo.archived),
      isFork: Boolean(repo.fork),
      createdAt: repo.created_at ? String(repo.created_at).split('T')[0] : '',
      updatedAt: repo.updated_at ? String(repo.updated_at).split('T')[0] : '',
      hasReadme: null,
      hasCiWorkflow: null,
      hasTests: null,
      hasLicense: Boolean(repo.license),
      commitCount30Days: null,
      prMergeRatio: null,
      codeQualityScore: null,
      dependencyManifests: [],
    };
  });

  // ── 4. Select repos for deep inspection ────────────────────────────────────
  // Prefer: non-fork, non-archived, most recently updated
  const deepCandidates = basicRepos
    .filter(r => !r.isArchived && !r.isFork)
    .slice(0, DEEP_INSPECT_LIMIT);

  // If fewer than DEEP_INSPECT_LIMIT after filtering, include archived/forked ones too
  const reposToDeepInspect = deepCandidates.length > 0
    ? deepCandidates
    : basicRepos.slice(0, DEEP_INSPECT_LIMIT);

  const deepInspectedNames = new Set(reposToDeepInspect.map(r => r.name));

  // ── 5. Deep inspection ─────────────────────────────────────────────────────
  const allCommitDates: string[] = [];
  let totalCommits30Days = 0;
  let hasCommitData = false;
  let totalMergedPRs = 0;
  let totalClosedPRs = 0;
  let hasPRData = false;
  const allDependencyManifests = new Set<string>();
  const totalLanguageBytes: Record<string, number> = {};

  for (const repo of reposToDeepInspect) {
    const owner = repo.owner;
    const repoName = repo.name;
    const branch = repo.defaultBranch;

    // ── 5a. Languages (byte-weighted) ─────────────────────────────────────
    const langBytes = await fetchLanguageBytes(owner, repoName, headers);
    for (const [lang, bytes] of Object.entries(langBytes)) {
      totalLanguageBytes[lang] = (totalLanguageBytes[lang] || 0) + bytes;
    }

    // ── 5b. README ─────────────────────────────────────────────────────────
    const readmeResult = await checkReadme(owner, repoName, headers);
    if (readmeResult.rateLimited) rateLimited = true;

    // ── 5c. CI Workflows ───────────────────────────────────────────────────
    const ciResult = await checkCIWorkflows(owner, repoName, headers);
    if (ciResult.rateLimited) rateLimited = true;

    // ── 5d. Tree inspection (tests + manifests) ────────────────────────────
    const treeResult = await inspectRepoTree(owner, repoName, branch, headers);
    if (treeResult.rateLimited) rateLimited = true;
    treeResult.dependencyManifests.forEach(m => allDependencyManifests.add(m));

    // ── 5e. Commit count (30 days) ─────────────────────────────────────────
    const commitResult = await fetchCommitCount(owner, repoName, cleanUsername, headers);
    if (commitResult.rateLimited) rateLimited = true;
    if (commitResult.count !== null) {
      totalCommits30Days += commitResult.count;
      allCommitDates.push(...commitResult.dates);
      hasCommitData = true;
    }

    // ── 5f. PR merge ratio ─────────────────────────────────────────────────
    const prResult = await fetchPRMergeRatio(owner, repoName, headers);
    if (prResult.rateLimited) rateLimited = true;
    if (prResult.ratio !== null) {
      // Reconstruct approximate merged/closed counts from ratio
      // We accumulate them separately to get an aggregate
      hasPRData = true;
    }

    // Update the repo metadata in basicRepos
    const repoIdx = basicRepos.findIndex(r => r.name === repoName);
    if (repoIdx >= 0) {
      basicRepos[repoIdx] = {
        ...basicRepos[repoIdx],
        hasReadme: readmeResult.result,
        hasCiWorkflow: ciResult.result,
        hasTests: treeResult.hasTests,
        dependencyManifests: treeResult.dependencyManifests,
        commitCount30Days: commitResult.count,
        prMergeRatio: prResult.ratio,
      };
    }
  }

  // Also fetch language bytes for repos NOT in deep inspect (basic only)
  for (const repo of basicRepos.filter(r => !deepInspectedNames.has(r.name))) {
    const langBytes = await fetchLanguageBytes(repo.owner, repo.name, headers);
    for (const [lang, bytes] of Object.entries(langBytes)) {
      totalLanguageBytes[lang] = (totalLanguageBytes[lang] || 0) + bytes;
    }
  }

  // ── 6. Aggregate PR ratio across deep-inspected repos ─────────────────────
  // Re-fetch consolidated — use averaged ratio across repos that had PR data
  const prRatios = basicRepos
    .filter(r => deepInspectedNames.has(r.name) && r.prMergeRatio !== null)
    .map(r => r.prMergeRatio as number);

  const aggregatedPRRatio = prRatios.length > 0
    ? Math.round(prRatios.reduce((a, b) => a + b, 0) / prRatios.length)
    : null;

  // ── 7. Language share from bytes ───────────────────────────────────────────
  const totalBytes = Object.values(totalLanguageBytes).reduce((a, b) => a + b, 0) || 1;
  const languageBytes = Object.entries(totalLanguageBytes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8) // top 8 languages
    .map(([name, bytes]) => ({
      name,
      bytes,
      color: LANGUAGE_COLORS[name] || '#94a3b8',
    }));

  const languages = languageBytes.map(l => ({
    name: l.name,
    percentage: Math.round((l.bytes / totalBytes) * 100),
    color: l.color,
  }));

  // ── 8. Commit metrics ─────────────────────────────────────────────────────
  const commitCount30Days = hasCommitData ? totalCommits30Days : null;

  // velocity = commits / 4.3 weeks ≈ commits per week (rounded to 1 decimal)
  const recentCommitVelocity = commitCount30Days !== null
    ? Math.round((commitCount30Days / 4.3) * 10) / 10
    : null;

  // streak = consecutive days with commits, counting from today backward
  const activeCommitStreakDays = allCommitDates.length > 0
    ? calculateCommitStreak(allCommitDates)
    : null;

  // ── 9. Hygiene score (deterministic) ──────────────────────────────────────
  const deepReposForHygiene = basicRepos.filter(r => deepInspectedNames.has(r.name));
  const hygieneBreakdown = deepReposForHygiene.length > 0
    ? aggregateHygieneScore(deepReposForHygiene)
    : null;

  const overallHygieneScore = hygieneBreakdown?.total ?? null;

  // ── 10. Account age ────────────────────────────────────────────────────────
  const createdAt = userData.created_at ? new Date(userData.created_at) : null;
  const accountAgeYears = createdAt && !Number.isNaN(createdAt.getTime())
    ? Math.max(0, new Date().getFullYear() - createdAt.getFullYear())
    : 0;

  return buildTelemetry(
    userData,
    cleanUsername,
    basicRepos,
    languages,
    reposToDeepInspect.length,
    commitCount30Days,
    recentCommitVelocity,
    activeCommitStreakDays,
    aggregatedPRRatio,
    Array.from(allDependencyManifests),
    languageBytes,
    rateLimited,
    errors,
    totalStars,
    totalForks,
    accountAgeYears,
    overallHygieneScore,
    hygieneBreakdown ?? null,
  );
}

// ─── Build telemetry object ───────────────────────────────────────────────────

function buildTelemetry(
  userData: any,
  cleanUsername: string,
  repos: RepositoryMetadata[],
  languages: { name: string; percentage: number; color: string }[],
  deepInspectedRepos: number,
  commitCount30Days: number | null,
  recentCommitVelocity: number | null,
  activeCommitStreakDays: number | null,
  prMergeRatio: number | null,
  dependencyManifests: string[],
  languageBytes: { name: string; bytes: number; color: string }[],
  rateLimited: boolean,
  errors: string[],
  totalStars = 0,
  totalForks = 0,
  accountAgeYears = 0,
  overallHygieneScore: number | null = null,
  hygieneBreakdown: import('./types').HygieneScoreBreakdown | null = null,
): GitHubTelemetry {
  return {
    username: userData?.login || cleanUsername,
    name: userData?.name || userData?.login || cleanUsername,
    avatarUrl: userData?.avatar_url || '',
    bio: userData?.bio || '',
    publicReposCount: typeof userData?.public_repos === 'number'
      ? userData.public_repos
      : repos.length,
    totalStars,
    totalForks,
    accountAgeYears,
    languages,
    languageBytes,
    topRepositories: repos,
    commitCount30Days,
    recentCommitVelocity,
    activeCommitStreakDays,
    prMergeRatio,
    dependencyManifests,
    overallHygieneScore,
    hygieneBreakdown,
    isFallbackData: false,
    deepInspectedRepos,
    rateLimited,
    errors,
  };
}
