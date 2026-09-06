'use client';

import React from 'react';
import { GitHubTelemetry } from '@/lib/types';

interface GitHubActivityChartProps {
  github: GitHubTelemetry;
}

export const GitHubActivityChart: React.FC<GitHubActivityChartProps> = ({ github }) => {
  return (
    <div className="p-6 rounded-xl bg-surface border border-border-subtle space-y-5 shadow-sm">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3.5">
        <div>
          <h3 className="font-headline font-semibold text-sm sm:text-base text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-cyan-400">code_blocks</span>
            <span>GitHub Repository Intelligence</span>
          </h3>
          <p className="font-body-sm text-xs text-on-surface-variant/70 mt-0.5">Public repositories, commit cadence & language distribution</p>
        </div>

        <div className="flex items-center gap-3 font-label-mono text-xs">
          <span className="text-on-surface-variant">{github.publicReposCount} Repos</span>
          <span className="text-on-surface-variant/40">•</span>
          <span className="text-semantic-amber">{github.totalStars} ★</span>
          <span className="text-on-surface-variant/40">•</span>
          <span className="text-cyan-400">{github.recentCommitVelocity} commits/mo</span>
        </div>
      </div>

      {/* Language Bar Share */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-label-caps text-label-caps text-on-surface-variant/80 uppercase tracking-wider">Language Share</span>
          <span className="font-label-mono text-[10px] text-semantic-emerald font-semibold">{github.activeCommitStreakDays} Day Streak</span>
        </div>

        <div className="w-full h-2 rounded-full bg-surface-container-lowest border border-white/5 overflow-hidden flex">
          {github.languages.map((lang, idx) => (
            <div
              key={idx}
              style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
              className="h-full"
              title={`${lang.name}: ${lang.percentage}%`}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-4 text-xs pt-1">
          {github.languages.map((lang, idx) => (
            <div key={idx} className="flex items-center gap-1.5 font-label-mono text-xs">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color }} />
              <span className="text-primary font-medium">{lang.name}</span>
              <span className="text-on-surface-variant/70">({lang.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Repos Compact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        {github.topRepositories.slice(0, 4).map((repo, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-surface-container-lowest border border-border-subtle space-y-2.5 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between gap-2">
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="font-headline font-semibold text-xs text-primary hover:text-cyan-400 transition-colors flex items-center gap-1.5 truncate"
              >
                <span className="truncate">{repo.name}</span>
                <span className="material-symbols-outlined text-[12px] text-on-surface-variant/70 flex-shrink-0">open_in_new</span>
              </a>
              <span className="px-2 py-0.5 rounded bg-surface-container-low text-cyan-300 font-label-mono text-[10px] border border-border-subtle">
                {repo.codeQualityScore}/100
              </span>
            </div>

            <p className="font-body-sm text-xs text-on-surface-variant/80 line-clamp-1">{repo.description}</p>

            <div className="flex items-center justify-between text-[10px] font-label-mono text-on-surface-variant/70 pt-1">
              <div className="flex items-center gap-2.5">
                <span className="text-semantic-amber font-semibold">{repo.stars} ★</span>
                <span>{repo.forks} forks</span>
                <span className="text-primary font-medium">{repo.language}</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold">
                {repo.hasCiWorkflow && <span className="text-semantic-emerald">CI</span>}
                {repo.hasTests && <span className="text-semantic-emerald">Tests</span>}
                {repo.hasReadme && <span className="text-semantic-emerald">Docs</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

