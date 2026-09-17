'use client';

import React from 'react';
import { GitHubTelemetry } from '@/lib/types';
import { ExternalLink, Star, GitFork, AlertCircle, Shield, Code, Package, Folder, Check, X } from 'lucide-react';

interface GitHubAuditTabProps {
  github: GitHubTelemetry;
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <span className="text-text-muted text-[10px] uppercase font-mono tracking-wider block">{label}</span>
      <span className="font-mono font-medium text-sm text-text-primary">{value}</span>
    </div>
  );
}

export const GitHubAuditTab: React.FC<GitHubAuditTabProps> = ({ github }) => {
  return (
    <div className="w-full flex flex-col space-y-6 stagger-fade-up">

      {/* Title */}
      <div>
        <h2 className="text-heading-lg text-text-primary">GitHub Engineering Intelligence</h2>
        <p className="text-body-sm text-text-muted mt-1">
          Real-time telemetry from GitHub REST API — {github.deepInspectedRepos} repositories deeply analyzed.
          {github.rateLimited && ' ⚠ Some signals were rate-limited.'}
        </p>
      </div>

      {/* Rate limit warning */}
      {github.rateLimited && (
        <div className="p-3 rounded-md bg-surface-alt border border-border text-body-sm text-text-secondary flex items-start gap-2">
          <AlertCircle size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
          <span>
            <span className="font-medium text-text-primary">Rate limit reached.</span> Set <code className="font-mono bg-surface px-1 py-0.5 rounded border border-border">GITHUB_TOKEN</code> in <code className="font-mono">.env.local</code> to increase quota to 5,000 requests/hour.
          </span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="p-5 rounded-md bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {github.avatarUrl ? (
            <img
              src={github.avatarUrl}
              alt={github.name || github.username}
              className="w-12 h-12 rounded-md border border-border"
            />
          ) : (
            <div className="w-12 h-12 rounded-md border border-border bg-surface-alt flex items-center justify-center text-text-secondary text-sm font-mono">
              {(github.name || github.username || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-heading-sm text-text-primary">{github.name || github.username}</h3>
              <a
                href={`https://github.com/${github.username}`}
                target="_blank"
                rel="noreferrer"
                className="text-body-sm font-mono text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
              >
                @{github.username}
                <ExternalLink size={11} />
              </a>
            </div>
            {github.bio && <p className="text-body-sm text-text-secondary max-w-lg mt-0.5">{github.bio}</p>}
            {github.isFallbackData && (
              <p className="text-caption text-text-muted mt-1 font-mono">
                Note: {github.unavailableReason || 'GitHub data unavailable'}
              </p>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-6">
          <MetricPill
            label="Streak"
            value={github.activeCommitStreakDays === null ? 'N/A' : `${github.activeCommitStreakDays}d`}
          />
          <MetricPill
            label="Velocity"
            value={github.recentCommitVelocity === null ? 'N/A' : `${github.recentCommitVelocity}/wk`}
          />
          <MetricPill
            label="30d Commits"
            value={github.commitCount30Days === null ? 'N/A' : String(github.commitCount30Days)}
          />
          <MetricPill
            label="Hygiene"
            value={github.overallHygieneScore === null ? 'N/A' : `${github.overallHygieneScore}/100`}
          />
        </div>
      </div>

      {/* Profile Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-md bg-surface border border-border">
          <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Public Repos</p>
          <p className="text-xl font-mono font-medium text-text-primary mt-1">{github.publicReposCount}</p>
        </div>
        <div className="p-4 rounded-md bg-surface border border-border">
          <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Total Stars</p>
          <p className="text-xl font-mono font-medium text-text-primary mt-1">{github.totalStars}</p>
        </div>
        <div className="p-4 rounded-md bg-surface border border-border">
          <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Total Forks</p>
          <p className="text-xl font-mono font-medium text-text-primary mt-1">{github.totalForks}</p>
        </div>
        <div className="p-4 rounded-md bg-surface border border-border">
          <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">PR Merge Ratio</p>
          <p className="text-xl font-mono font-medium text-text-primary mt-1">
            {github.prMergeRatio === null ? 'N/A' : `${github.prMergeRatio}%`}
          </p>
        </div>
      </div>

      {/* Engineering Hygiene Breakdown */}
      {github.hygieneBreakdown && (
        <div className="p-5 rounded-md bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-caption font-mono uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Shield size={14} className="text-text-muted" />
              <span>Engineering Hygiene Breakdown</span>
            </h4>
            <span className="font-mono font-medium text-sm text-text-primary">{github.hygieneBreakdown.total}/100</span>
          </div>
          <p className="text-caption text-text-muted">
            Deterministic score across {github.deepInspectedRepos} inspected repository(s). Unavailable signals excluded from denominator.
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
              <div key={label} className="p-3 rounded-sm bg-surface-alt border border-border text-center">
                <p className="text-[10px] text-text-muted uppercase font-mono">{label}</p>
                <p className="font-mono font-medium text-sm text-text-primary mt-0.5">
                  {pts}<span className="text-[10px] text-text-muted">/{max}</span>
                </p>
              </div>
            ))}
          </div>
          {github.hygieneBreakdown.unavailableSignals.length > 0 && (
            <p className="text-caption text-text-muted font-mono">
              Excluded signals: {github.hygieneBreakdown.unavailableSignals.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Language Distribution */}
      <div className="p-5 rounded-md bg-surface border border-border space-y-3">
        <h4 className="text-caption font-mono uppercase tracking-wider text-text-secondary flex items-center gap-2">
          <Code size={14} className="text-text-muted" />
          <span>Language Distribution</span>
          {github.languageBytes.length > 0 && (
            <span className="text-text-muted font-normal">(by byte weight)</span>
          )}
        </h4>

        {github.languages.length === 0 ? (
          <p className="text-body-sm text-text-muted font-mono">Language data unavailable.</p>
        ) : (
          <>
            <div className="w-full h-2 rounded-full bg-surface-alt overflow-hidden flex border border-border">
              {github.languages.map((lang, idx) => (
                <div
                  key={idx}
                  style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
                  className="h-full"
                  title={`${lang.name}: ${lang.percentage}%`}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
              {github.languages.map((lang, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color }} />
                  <span className="text-text-primary font-medium">{lang.name}</span>
                  <span className="text-text-muted font-mono text-[11px]">({lang.percentage}%)</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dependency Manifests */}
      {github.dependencyManifests.length > 0 && (
        <div className="p-5 rounded-md bg-surface border border-border space-y-3">
          <h4 className="text-caption font-mono uppercase tracking-wider text-text-secondary flex items-center gap-2">
            <Package size={14} className="text-text-muted" />
            <span>Detected Dependency Manifests</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {github.dependencyManifests.map((manifest, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-sm bg-surface-alt border border-border text-[11px] font-mono text-text-primary">
                {manifest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Inspected Repositories */}
      <div className="space-y-3">
        <h4 className="text-caption font-mono uppercase tracking-wider text-text-secondary flex items-center gap-2">
          <Folder size={14} className="text-text-muted" />
          <span>Inspected Repositories ({github.topRepositories.length})</span>
          <span className="text-text-muted font-normal text-[11px]">— {github.deepInspectedRepos} deep</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {github.topRepositories.map((repo, idx) => {
            const isDeepInspected = idx < github.deepInspectedRepos;
            return (
              <div key={idx} className={`p-4 rounded-md bg-surface border space-y-3 ${isDeepInspected ? 'border-border-strong' : 'border-border'}`}>
                
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-body-sm font-medium text-text-primary hover:underline flex items-center gap-1 font-mono"
                      >
                        {repo.name}
                        <ExternalLink size={11} className="text-text-muted" />
                      </a>
                      {repo.isArchived && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-surface-alt border border-border text-text-muted">archived</span>
                      )}
                      {repo.isFork && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-surface-alt border border-border text-text-muted">fork</span>
                      )}
                      {isDeepInspected && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-surface-alt border border-border-strong text-text-primary">deep</span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-body-sm text-text-muted mt-1 line-clamp-2">{repo.description}</p>
                    )}
                  </div>
                </div>

                {/* Repo Metrics Row */}
                <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-text-muted">
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="flex items-center gap-1">
                      <Star size={11} className="text-text-muted" />
                      {repo.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork size={11} className="text-text-muted" />
                      {repo.forks}
                    </span>
                    <span className="text-text-secondary">{repo.language}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className={`px-1.5 py-0.5 rounded-sm border ${
                      repo.hasCiWorkflow === true ? 'bg-surface-alt border-border text-text-primary' :
                      repo.hasCiWorkflow === false ? 'bg-surface border-border text-text-muted' :
                      'bg-surface border-border text-text-muted'
                    }`}>
                      {repo.hasCiWorkflow === null ? 'CI?' : repo.hasCiWorkflow ? 'CI ✓' : 'No CI'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-sm border ${
                      repo.hasTests === true ? 'bg-surface-alt border-border text-text-primary' :
                      repo.hasTests === false ? 'bg-surface border-border text-text-muted' :
                      'bg-surface border-border text-text-muted'
                    }`}>
                      {repo.hasTests === null ? 'Tests?' : repo.hasTests ? 'Tests ✓' : 'No Tests'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-sm border ${
                      repo.hasReadme === true ? 'bg-surface-alt border-border text-text-primary' :
                      repo.hasReadme === false ? 'bg-surface border-border text-text-muted' :
                      'bg-surface border-border text-text-muted'
                    }`}>
                      {repo.hasReadme === null ? 'README?' : repo.hasReadme ? 'README ✓' : 'No README'}
                    </span>
                  </div>
                </div>

                {/* Deep Inspect Metrics */}
                {isDeepInspected && (
                  <div className="flex flex-wrap gap-3 text-[11px] font-mono text-text-muted border-t border-border pt-2">
                    <span>
                      <span className="text-text-primary">{repo.commitCount30Days === null ? 'N/A' : repo.commitCount30Days}</span> commits/30d
                    </span>
                    <span>
                      PR ratio: <span className="text-text-primary">{repo.prMergeRatio === null ? 'N/A' : `${repo.prMergeRatio}%`}</span>
                    </span>
                    {repo.defaultBranch && (
                      <span>branch: <span className="text-text-primary">{repo.defaultBranch}</span></span>
                    )}
                    {repo.size > 0 && (
                      <span>size: <span className="text-text-primary">{repo.size < 1024 ? `${repo.size} KB` : `${(repo.size / 1024).toFixed(1)} MB`}</span></span>
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
        <div className="p-4 rounded-md bg-surface-alt border border-border text-body-sm text-text-muted space-y-1">
          <p className="font-mono text-caption uppercase tracking-wider text-text-secondary">GitHub API notes:</p>
          {github.errors.map((e, idx) => (
            <p key={idx} className="font-mono text-caption">• {e}</p>
          ))}
        </div>
      )}

    </div>
  );
};
