import { GitHubTelemetry, RepositoryMetadata } from './types';

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Go: '#00add8',
  Python: '#3572A5',
  Rust: '#dea584',
  Java: '#b07219',
  'C++': '#f34b7d',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Ruby: '#701516',
};

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
    topRepositories: [],
    activeCommitStreakDays: null,
    recentCommitVelocity: null,
    overallHygieneScore: null,
    isFallbackData: true,
    unavailableReason: reason,
  };
}

export async function fetchGitHubTelemetry(username: string): Promise<GitHubTelemetry> {
  const cleanUsername = username.replace(/https?:\/\/github\.com\//i, '').replace(/\/$/, '').trim();

  if (!cleanUsername) {
    return unavailableGitHubTelemetry('', 'No GitHub username provided');
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'DevPulse-AI-Evaluator',
      Accept: 'application/vnd.github.v3+json',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}`, { headers });

    if (userRes.status === 404) {
      return unavailableGitHubTelemetry(cleanUsername, `GitHub user "${cleanUsername}" was not found`);
    }
    if (userRes.status === 403 || userRes.status === 429) {
      return unavailableGitHubTelemetry(
        cleanUsername,
        'GitHub API rate limit or access denied. Set GITHUB_TOKEN on the server to continue.'
      );
    }
    if (!userRes.ok) {
      return unavailableGitHubTelemetry(
        cleanUsername,
        `GitHub API returned status ${userRes.status}`
      );
    }

    const userData = await userRes.json();
    const reposRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?sort=updated&per_page=15`,
      { headers }
    );

    if (reposRes.status === 403 || reposRes.status === 429) {
      return unavailableGitHubTelemetry(
        cleanUsername,
        'GitHub API rate limit or access denied while listing repositories. Set GITHUB_TOKEN on the server to continue.'
      );
    }

    const reposData = reposRes.ok ? await reposRes.json() : [];
    if (!Array.isArray(reposData)) {
      return unavailableGitHubTelemetry(cleanUsername, 'GitHub repository list was not a valid array');
    }

    let totalStars = 0;
    let totalForks = 0;
    const languageCounts: Record<string, number> = {};

    const topRepositories: RepositoryMetadata[] = reposData.slice(0, 6).map((repo: any) => {
      totalStars += repo.stargazers_count || 0;
      totalForks += repo.forks_count || 0;

      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }

      return {
        name: repo.name,
        description: repo.description || '',
        url: repo.html_url,
        language: repo.language || 'Unknown',
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        updatedAt: repo.updated_at ? String(repo.updated_at).split('T')[0] : '',
        hasReadme: null,
        hasCiWorkflow: null,
        hasTests: null,
        hasLicense: Boolean(repo.license),
        commitCount30Days: null,
        prMergeRatio: null,
        codeQualityScore: null,
      };
    });

    const totalLangRepos = Object.values(languageCounts).reduce((a, b) => a + b, 0) || 1;
    const languages = Object.entries(languageCounts).map(([name, count]) => ({
      name,
      percentage: Math.round((count / totalLangRepos) * 100),
      color: LANGUAGE_COLORS[name] || '#94a3b8',
    }));

    const createdAt = userData.created_at ? new Date(userData.created_at) : null;
    const accountAgeYears = createdAt && !Number.isNaN(createdAt.getTime())
      ? Math.max(0, new Date().getFullYear() - createdAt.getFullYear())
      : 0;

    return {
      username: userData.login || cleanUsername,
      name: userData.name || userData.login || cleanUsername,
      avatarUrl: userData.avatar_url || '',
      bio: userData.bio || '',
      publicReposCount: typeof userData.public_repos === 'number' ? userData.public_repos : topRepositories.length,
      totalStars,
      totalForks,
      accountAgeYears,
      languages,
      topRepositories,
      activeCommitStreakDays: null,
      recentCommitVelocity: null,
      overallHygieneScore: null,
      isFallbackData: false,
    };
  } catch (error) {
    console.warn(`[GitHub Analyzer] API call failed for ${cleanUsername}:`, error);
    return unavailableGitHubTelemetry(
      cleanUsername,
      'GitHub API request failed. Engineering data unavailable.'
    );
  }
}
