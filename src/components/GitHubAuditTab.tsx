'use client';

import React from 'react';
import { GitHubTelemetry } from '@/lib/types';
import { Github, Star, GitFork, GitCommit, CheckCircle2, XCircle, ExternalLink, Code, ShieldCheck, Flame } from 'lucide-react';

interface GitHubAuditTabProps {
  github: GitHubTelemetry;
}

export const GitHubAuditTab: React.FC<GitHubAuditTabProps> = ({ github }) => {
  return (
    <div className="space-y-6">
      
      {/* Profile Header */}
      <div className="glass-card p-6 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center space-x-4">
          <img
            src={github.avatarUrl}
            alt={github.name}
            className="w-16 h-16 rounded-full border-2 border-purple-500/40 shadow-lg"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white">{github.name}</h3>
              <a
                href={`https://github.com/${github.username}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                @{github.username} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-slate-300 max-w-lg mt-0.5">{github.bio}</p>
          </div>
        </div>

        {/* Velocity Stats */}
        <div className="flex items-center space-x-4 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6 text-xs">
          <div className="text-center">
            <span className="text-slate-400 text-[10px] uppercase font-semibold block">Commit Streak</span>
            <span className="font-extrabold text-amber-400 text-sm flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-amber-400" /> {github.activeCommitStreakDays} Days
            </span>
          </div>

          <div className="text-center">
            <span className="text-slate-400 text-[10px] uppercase font-semibold block">Velocity</span>
            <span className="font-extrabold text-cyan-400 text-sm">{github.recentCommitVelocity}/mo</span>
          </div>

          <div className="text-center">
            <span className="text-slate-400 text-[10px] uppercase font-semibold block">Hygiene Score</span>
            <span className="font-extrabold text-emerald-400 text-sm">{github.overallHygieneScore}/100</span>
          </div>
        </div>

      </div>

      {/* Language Distribution Share */}
      <div className="glass-card p-6 rounded-xl border border-slate-800">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Code className="w-4 h-4 text-cyan-400" /> Repository Language Distribution
        </h4>

        {/* Stacked Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden flex mb-4 border border-slate-800">
          {github.languages.map((lang, idx) => (
            <div
              key={idx}
              style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
              className="h-full transition-all duration-300"
              title={`${lang.name}: ${lang.percentage}%`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          {github.languages.map((lang, idx) => (
            <div key={idx} className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: lang.color }} />
              <span className="text-slate-200 font-medium">{lang.name}</span>
              <span className="text-slate-400 text-[11px]">({lang.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Repositories Grid */}
      <div>
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Github className="w-4 h-4 text-purple-400" /> Inspected Public Repositories ({github.topRepositories.length})
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {github.topRepositories.map((repo, idx) => (
            <div key={idx} className="glass-card p-5 rounded-xl border border-slate-800 space-y-3">
              
              <div className="flex items-start justify-between">
                <div>
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                  >
                    {repo.name} <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">{repo.description}</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-slate-900 text-cyan-300 text-xs font-mono font-bold border border-slate-800">
                  {repo.codeQualityScore}/100
                </span>
              </div>

              {/* Repo Stats & Badges */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" /> {repo.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="w-3.5 h-3.5 text-slate-400" /> {repo.forks}
                  </span>
                  <span className="font-mono text-purple-300">{repo.language}</span>
                </div>

                <div className="flex items-center space-x-1.5 text-[10px]">
                  <span className={`px-1.5 py-0.5 rounded ${repo.hasCiWorkflow ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    CI/CD
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${repo.hasTests ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    Tests
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${repo.hasReadme ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
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
