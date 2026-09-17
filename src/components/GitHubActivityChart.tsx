'use client';

import React from 'react';
import { GitHubTelemetry } from '@/lib/types';
import { ExternalLink } from 'lucide-react';

interface GitHubActivityChartProps {
  github: GitHubTelemetry;
}

export const GitHubActivityChart: React.FC<GitHubActivityChartProps> = ({ github }) => {
  return (
    <div className="bg-surface border border-border rounded-md p-5 space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="text-heading-sm text-text-primary">GitHub repository intelligence</h3>
          <p className="text-caption text-text-muted mt-0.5">Inspected public repositories and language labels from the GitHub API</p>
        </div>

        <div className="flex items-center gap-3 font-mono text-caption">
          <span className="text-text-muted">{github.publicReposCount} repos</span>
          <span className="text-text-muted">·</span>
          <span className="text-text-secondary">{github.totalStars} ★</span>
          <span className="text-text-muted">·</span>
          <span className="text-text-secondary">
            {github.recentCommitVelocity === null ? 'Commits/mo unavailable' : `${github.recentCommitVelocity} commits/mo`}
          </span>
        </div>
      </div>

      {/* Language Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-caption">
          <span className="font-mono text-text-muted uppercase tracking-wider">Language share</span>
          <span className="font-mono text-text-muted">
            {github.activeCommitStreakDays === null ? 'Streak unavailable' : `${github.activeCommitStreakDays} day streak`}
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-surface-alt border border-border overflow-hidden flex">
          {github.languages.map((lang, idx) => (
            <div
              key={idx}
              style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
              className="h-full"
              title={`${lang.name}: ${lang.percentage}%`}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-4 text-caption pt-1">
          {github.languages.map((lang, idx) => (
            <div key={idx} className="flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color }} />
              <span className="text-text-primary font-medium">{lang.name}</span>
              <span className="text-text-muted">({lang.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Repos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {github.topRepositories.slice(0, 4).map((repo, idx) => (
          <div key={idx} className="p-4 bg-surface-alt border border-border rounded-md space-y-2 hover:border-border-strong transition-colors">
            <div className="flex items-start justify-between gap-2">
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="text-body-sm font-medium text-text-primary hover:text-text-secondary transition-colors flex items-center gap-1.5 truncate"
              >
                <span className="truncate">{repo.name}</span>
                <ExternalLink size={10} className="text-text-muted flex-shrink-0" />
              </a>
              <span className="px-2 py-0.5 rounded-sm bg-surface border border-border text-[10px] font-mono text-text-muted">
                {repo.codeQualityScore === null ? 'n/a' : `${repo.codeQualityScore}/100`}
              </span>
            </div>

            <p className="text-caption text-text-muted line-clamp-1">{repo.description}</p>

            <div className="flex items-center justify-between text-[10px] font-mono text-text-muted pt-1">
              <div className="flex items-center gap-2.5">
                <span className="text-text-secondary font-medium">{repo.stars} ★</span>
                <span>{repo.forks} forks</span>
                <span className="text-text-primary font-medium">{repo.language}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                {repo.hasCiWorkflow && <span className="text-semantic-green">CI</span>}
                {repo.hasTests && <span className="text-semantic-green">Tests</span>}
                {repo.hasReadme && <span className="text-semantic-green">Docs</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
