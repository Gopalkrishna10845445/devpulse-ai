'use client';

import React from 'react';
import { GitHubTelemetry } from '@/lib/types';

interface GitHubAuditTabProps {
  github: GitHubTelemetry;
}

export const GitHubAuditTab: React.FC<GitHubAuditTabProps> = ({ github }) => {
  return (
    <div className="w-full flex flex-col space-y-4 stagger-fade-up">
      
      {/* Title */}
      <div className="pt-2 pb-2">
        <h2 className="font-headline text-2xl font-semibold text-on-surface mb-1">GitHub Portfolio Audit</h2>
        <p className="text-xs text-on-surface-variant">Public Code Repositories, Commit Velocity & Hygiene</p>
      </div>

      {/* Profile Header Card */}
      <div className="p-5 rounded-xl bg-surface border border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-4">
          <img
            src={github.avatarUrl}
            alt={github.name}
            className="w-14 h-14 rounded-full border border-border-subtle shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline font-semibold text-base text-on-surface">{github.name}</h3>
              <a
                href={`https://github.com/${github.username}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-on-surface-variant hover:text-primary flex items-center gap-1"
              >
                @{github.username}
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </div>
            <p className="text-xs text-on-surface-variant max-w-lg mt-0.5">{github.bio}</p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-border-subtle pt-3 sm:pt-0 sm:pl-5 text-xs">
          <div className="text-center">
            <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Commit Streak</span>
            <span className="font-headline font-bold text-semantic-amber text-sm flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
              {github.activeCommitStreakDays} Days
            </span>
          </div>

          <div className="text-center">
            <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Velocity</span>
            <span className="font-headline font-bold text-on-surface text-sm">{github.recentCommitVelocity}/mo</span>
          </div>

          <div className="text-center">
            <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">Hygiene</span>
            <span className="font-headline font-bold text-semantic-emerald text-sm">{github.overallHygieneScore}/100</span>
          </div>
        </div>

      </div>

      {/* Language Distribution */}
      <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">code</span>
          <span>Repository Language Share</span>
        </h4>

        <div className="w-full h-2.5 rounded-full bg-surface-container-lowest overflow-hidden flex border border-border-subtle">
          {github.languages.map((lang, idx) => (
            <div
              key={idx}
              style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
              className="h-full transition-all"
              title={`${lang.name}: ${lang.percentage}%`}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          {github.languages.map((lang, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lang.color }} />
              <span className="text-on-surface font-medium">{lang.name}</span>
              <span className="text-on-surface-variant text-[11px]">({lang.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inspected Public Repositories Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">folder_open</span>
          <span>Inspected Public Repositories ({github.topRepositories.length})</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {github.topRepositories.map((repo, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-surface border border-border-subtle space-y-3">
              
              <div className="flex items-start justify-between">
                <div>
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-on-surface hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {repo.name}
                    <span className="material-symbols-outlined text-[12px] text-on-surface-variant">open_in_new</span>
                  </a>
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{repo.description}</p>
                </div>

                <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[10px] font-mono border border-border-subtle">
                  {repo.codeQualityScore}/100
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-xs text-on-surface-variant">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-semantic-amber">star</span>
                    {repo.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">call_split</span>
                    {repo.forks}
                  </span>
                  <span className="font-mono text-on-surface">{repo.language}</span>
                </div>

                <div className="flex items-center gap-1 text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded ${repo.hasCiWorkflow ? 'bg-semantic-emerald/10 text-emerald-400' : 'bg-surface-container-lowest text-on-surface-variant'}`}>
                    CI/CD
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${repo.hasTests ? 'bg-semantic-emerald/10 text-emerald-400' : 'bg-surface-container-lowest text-on-surface-variant'}`}>
                    Tests
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${repo.hasReadme ? 'bg-semantic-emerald/10 text-emerald-400' : 'bg-surface-container-lowest text-on-surface-variant'}`}>
                    Docs
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
