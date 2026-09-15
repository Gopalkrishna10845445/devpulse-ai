'use client';

import React from 'react';
import { GitHubTelemetry } from '@/lib/types';

interface GitHubAuditTabProps {
  github: GitHubTelemetry;
}

function MetricPill({ label, value, color }: { label: string; value: string; color: 'emerald' | 'amber' | 'cyan' | 'muted' }) {
  const colorMap = {
    emerald: 'text-emerald-400',
    amber: 'text-semantic-amber',
    cyan: 'text-cyan-400',
    muted: 'text-on-surface-variant',
  };
  return (
    <div className="text-center">
      <span className="text-on-surface-variant text-[10px] uppercase font-semibold block">{label}</span>
      <span className={`font-headline font-bold text-sm ${colorMap[color]}`}>{value}</span>
    </div>
  );
}

export const GitHubAuditTab: React.FC<GitHubAuditTabProps> = ({ github }) => {
  return (
    <div className="w-full flex flex-col space-y-4 stagger-fade-up">

      {/* Title */}
      <div className="pt-2 pb-2">
        <h2 className="font-headline text-2xl font-semibold text-on-surface mb-1">GitHub Engineering Intelligence</h2>
        <p className="text-xs text-on-surface-variant">
          Real-time data from the GitHub REST API — {github.deepInspectedRepos} repos deeply analyzed.
          {github.rateLimited && ' ⚠ Some signals were rate-limited.'}
        </p>
      </div>

      {/* Rate limit / token warning */}
      {github.rateLimited && (
        <div className="p-3 rounded-xl bg-semantic-amber/10 border border-semantic-amber/30 text-xs text-amber-300">
          <span className="font-semibold">Rate limit reached.</span> Set <code className="font-mono bg-surface-container-high px-1 rounded">GITHUB_TOKEN</code> in <code className="font-mono">.env.local</code> to increase the limit to 5000 requests/hour. Some metrics may be incomplete.
        </div>
      )}

      {/* Profile Header Card */}
      <div className="p-5 rounded-xl bg-surface border border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-4">
          {github.avatarUrl ? (
            <img
              src={github.avatarUrl}
              alt={github.name || github.username}
              className="w-14 h-14 rounded-full border border-border-subtle shadow-md"
            />
          ) : (
            <div className="w-14 h-14 rounded-full border border-border-subtle bg-surface-container-low flex items-center justify-center text-on-surface-variant text-sm">
              {(github.name || github.username || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
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
            {github.isFallbackData && (
              <p className="text-xs text-semantic-amber mt-1">
                ⚠ {github.unavailableReason || 'GitHub data unavailable'}
              </p>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-border-subtle pt-3 sm:pt-0 sm:pl-5">
          <MetricPill
            label="Commit Streak"
            value={github.activeCommitStreakDays === null ? 'Unavailable' : `${github.activeCommitStreakDays} days`}
            color="amber"
          />
          <MetricPill
            label="Velocity"
            value={github.recentCommitVelocity === null ? 'Unavailable' : `${github.recentCommitVelocity}/wk`}
            color="cyan"
          />
          <MetricPill
            label="30-Day Commits"
            value={github.commitCount30Days === null ? 'Unavailable' : String(github.commitCount30Days)}
            color="muted"
          />
          <MetricPill
            label="Hygiene"
            value={github.overallHygieneScore === null ? 'Unavailable' : `${github.overallHygieneScore}/100`}
            color="emerald"
          />
        </div>
      </div>

      {/* Profile Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-surface border border-border-subtle">
          <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Public Repos</p>
          <p className="text-xl font-headline font-bold text-on-surface">{github.publicReposCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-subtle">
          <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Total Stars</p>
          <p className="text-xl font-headline font-bold text-semantic-amber">{github.totalStars}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-subtle">
          <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Total Forks</p>
          <p className="text-xl font-headline font-bold text-on-surface">{github.totalForks}</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-subtle">
          <p className="text-[10px] text-on-surface-variant uppercase font-semibold">PR Merge Ratio</p>
          <p className="text-xl font-headline font-bold text-on-surface">
            {github.prMergeRatio === null ? 'N/A' : `${github.prMergeRatio}%`}
          </p>
          {github.prMergeRatio === null && (
            <p className="text-[10px] text-on-surface-variant mt-0.5">No closed PRs or unavailable</p>
          )}
        </div>
      </div>

      {/* Engineering Hygiene Breakdown */}
      {github.hygieneBreakdown && (
        <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">shield</span>
              <span>Engineering Hygiene Score Breakdown</span>
            </h4>
            <span className="font-headline font-bold text-semantic-emerald text-sm">{github.hygieneBreakdown.total}/100</span>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Deterministic score across {github.deepInspectedRepos} deeply inspected repo(s). Unavailable signals excluded from denominator.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {[
              { label: 'README', pts: github.hygieneBreakdown.readmePoints, max: 20 },
              { label: 'CI/CD', pts: github.hygieneBreakdown.ciPoints, max: 20 },
              { label: 'Tests', pts: github.hygieneBreakdown.testsPoints, max: 20 },
              { label: 'Activity', pts: github.hygieneBreakdown.activityPoints, max: 20 },
              { label: 'License', pts: github.hygieneBreakdown.licensePoints, max: 10 },
              { label: 'Deps', pts: github.hygieneBreakdown.dependencyPoints, max: 10 },
            ].map(({ label, pts, max }) => (
              <div key={label} className="p-3 rounded-lg bg-surface-container-lowest border border-border-subtle text-center">
                <p className="text-[10px] text-on-surface-variant uppercase font-semibold">{label}</p>
                <p className={`font-headline font-bold text-base ${pts > 0 ? 'text-semantic-emerald' : 'text-on-surface-variant'}`}>
                  {pts}<span className="text-[10px] font-normal text-on-surface-variant">/{max}</span>
                </p>
              </div>
            ))}
          </div>
          {github.hygieneBreakdown.unavailableSignals.length > 0 && (
            <p className="text-[11px] text-on-surface-variant italic">
              Excluded (unavailable): {github.hygieneBreakdown.unavailableSignals.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Language Distribution */}
      <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">code</span>
          <span>Repository Language Distribution</span>
          {github.languageBytes.length > 0 && (
            <span className="text-on-surface-variant font-normal">(by byte weight)</span>
          )}
        </h4>

        {github.languages.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic">Language data unavailable.</p>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Dependency Manifests */}
      {github.dependencyManifests.length > 0 && (
        <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">package_2</span>
            <span>Detected Dependency Manifests</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {github.dependencyManifests.map((manifest, idx) => (
              <span key={idx} className="px-2 py-1 rounded-full bg-surface-container-low border border-border-subtle text-[11px] font-mono text-on-surface">
                {manifest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Inspected Public Repositories Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">folder_open</span>
          <span>Inspected Repositories ({github.topRepositories.length})</span>
          <span className="text-on-surface-variant font-normal text-[11px]">— {github.deepInspectedRepos} deep</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {github.topRepositories.map((repo, idx) => {
            const isDeepInspected = idx < github.deepInspectedRepos;
            return (
              <div key={idx} className={`p-4 rounded-xl bg-surface border space-y-3 ${isDeepInspected ? 'border-primary/30' : 'border-border-subtle'}`}>
                
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-on-surface hover:text-primary transition-colors flex items-center gap-1"
                      >
                        {repo.name}
                        <span className="material-symbols-outlined text-[12px] text-on-surface-variant">open_in_new</span>
                      </a>
                      {repo.isArchived && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-container-high border border-border-subtle text-on-surface-variant">archived</span>
                      )}
                      {repo.isFork && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-container-high border border-border-subtle text-on-surface-variant">fork</span>
                      )}
                      {isDeepInspected && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 border border-primary/30 text-cyan-400">deep</span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{repo.description}</p>
                  </div>
                </div>

                {/* Repo Metrics Row */}
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
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">bug_report</span>
                      {repo.openIssues}
                    </span>
                    <span className="font-mono text-on-surface">{repo.language}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded ${
                      repo.hasCiWorkflow === true ? 'bg-semantic-emerald/10 text-emerald-400' :
                      repo.hasCiWorkflow === false ? 'bg-surface-container-lowest text-on-surface-variant' :
                      'bg-surface-container-lowest text-on-surface-variant/50'
                    }`}>
                      {repo.hasCiWorkflow === null ? 'CI?' : repo.hasCiWorkflow ? 'CI ✓' : 'No CI'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${
                      repo.hasTests === true ? 'bg-semantic-emerald/10 text-emerald-400' :
                      repo.hasTests === false ? 'bg-surface-container-lowest text-on-surface-variant' :
                      'bg-surface-container-lowest text-on-surface-variant/50'
                    }`}>
                      {repo.hasTests === null ? 'Tests?' : repo.hasTests ? 'Tests ✓' : 'No Tests'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${
                      repo.hasReadme === true ? 'bg-semantic-emerald/10 text-emerald-400' :
                      repo.hasReadme === false ? 'bg-surface-container-lowest text-on-surface-variant' :
                      'bg-surface-container-lowest text-on-surface-variant/50'
                    }`}>
                      {repo.hasReadme === null ? 'Docs?' : repo.hasReadme ? 'README ✓' : 'No README'}
                    </span>
                  </div>
                </div>

                {/* Deep Inspect Metrics */}
                {isDeepInspected && (
                  <div className="flex flex-wrap gap-3 text-[11px] text-on-surface-variant border-t border-border-subtle pt-2">
                    <span>
                      <span className="font-semibold text-on-surface">
                        {repo.commitCount30Days === null ? 'Unavailable' : repo.commitCount30Days}
                      </span>
                      {' '}commits/30d
                    </span>
                    <span>
                      PR ratio:{' '}
                      <span className="font-semibold text-on-surface">
                        {repo.prMergeRatio === null ? 'N/A' : `${repo.prMergeRatio}%`}
                      </span>
                    </span>
                    {repo.defaultBranch && (
                      <span className="font-mono">
                        branch: <span className="text-on-surface">{repo.defaultBranch}</span>
                      </span>
                    )}
                    {repo.size > 0 && (
                      <span>size: <span className="text-on-surface">{repo.size < 1024 ? `${repo.size} KB` : `${(repo.size / 1024).toFixed(1)} MB`}</span></span>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* Non-fatal errors */}
      {github.errors.length > 0 && (
        <div className="p-4 rounded-xl bg-surface border border-border-subtle text-xs text-on-surface-variant space-y-1">
          <p className="font-semibold text-on-surface">Non-fatal GitHub API notes:</p>
          {github.errors.map((e, idx) => (
            <p key={idx} className="pl-2">• {e}</p>
          ))}
        </div>
      )}

    </div>
  );
};
