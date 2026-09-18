'use client';

import React, { useState, useEffect } from 'react';
import { NavSection } from './Sidebar';
import {
  Shield,
  BarChart3,
  GitPullRequest,
  Search,
  ArrowRight,
  GitBranch,
  GitCommit,
  Clock,
  ExternalLink,
  MessageSquare,
  Code2,
  Wrench,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  Sparkles,
} from 'lucide-react';

interface OverviewTabProps {
  onNavigateSection: (section: NavSection) => void;
  currentRepo: string;
  onSelectRepo: (repo: string) => void;
}

interface RepoDataState {
  description: string;
  languages: string[];
  frameworks: string[];
  license: string;
  branch: string;
  commitSha: string;
  lastAnalyzed: string;
  healthScore: number;
  securityCritical: number;
  securityHigh: number;
  securityTotal: number;
  maintainabilityScore: number;
  circularCycles: number;
  hotspotsCount: number;
  openPRsCount: number;
  activities: {
    id: string;
    type: 'push' | 'pr' | 'security' | 'analysis';
    title: string;
    detail: string;
    timestamp: string;
  }[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  onNavigateSection,
  currentRepo,
  onSelectRepo,
}) => {
  const [repoInput, setRepoInput] = useState(currentRepo);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<RepoDataState>({
    description: 'AI-powered Developer / Codebase Intelligence Platform with ReAct Agent, deterministic AST graph, RAG Q&A, and 6-layer security scanning.',
    languages: ['TypeScript', 'JavaScript', 'CSS'],
    frameworks: ['Next.js 14', 'React 18', 'Tailwind CSS'],
    license: 'MIT',
    branch: 'main',
    commitSha: 'a1b2c3d',
    lastAnalyzed: 'Just now',
    healthScore: 92,
    securityCritical: 0,
    securityHigh: 1,
    securityTotal: 4,
    maintainabilityScore: 91,
    circularCycles: 0,
    hotspotsCount: 2,
    openPRsCount: 1,
    activities: [
      {
        id: '1',
        type: 'analysis',
        title: 'Repository analysis refreshed',
        detail: 'AST symbol index and dependency graph up to date',
        timestamp: 'Just now',
      },
      {
        id: '2',
        type: 'security',
        title: 'Security scan completed',
        detail: '0 Critical, 1 High finding flagged for review',
        timestamp: '12 minutes ago',
      },
      {
        id: '3',
        type: 'push',
        title: 'Push to main',
        detail: 'devpilot-stitch-ui frontend design system integration',
        timestamp: '1 hour ago',
      },
    ],
  });

  // Fetch real telemetry/health when currentRepo changes
  useEffect(() => {
    let isMounted = true;
    async function fetchRepoDetails() {
      setIsLoading(true);
      try {
        // Fetch engineering report
        const engRes = await fetch('/api/repository/engineering', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repositoryId: currentRepo }),
        });
        const engJson = await engRes.json();

        // Fetch security report
        const secRes = await fetch('/api/repository/security', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repositoryId: currentRepo }),
        });
        const secJson = await secRes.json();

        if (isMounted) {
          const engReport = engJson?.report;
          const secReport = secJson?.report;

          const secFindings = secReport?.findings || [];
          const critCount = secFindings.filter((f: any) => f.severity === 'CRITICAL').length;
          const highCount = secFindings.filter((f: any) => f.severity === 'HIGH').length;

          const health = engReport?.summary?.overallScore ?? 92;
          const maintainability = engReport?.summary?.maintainabilityScore ?? 91;
          const cycles = engReport?.summary?.circularDependencyCycles?.length ?? 0;
          const hotspots = engReport?.summary?.hotspots?.length ?? 2;
          const commitSha = engReport?.summary?.commitSha || secReport?.summary?.commitSha || 'a1b2c3d';

          setData(prev => ({
            ...prev,
            commitSha: commitSha.slice(0, 7),
            lastAnalyzed: 'Just now',
            healthScore: health,
            securityCritical: critCount,
            securityHigh: highCount,
            securityTotal: secFindings.length,
            maintainabilityScore: maintainability,
            circularCycles: cycles,
            hotspotsCount: hotspots,
          }));
        }
      } catch {
        // Keep resilient fallback defaults if network is offline
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchRepoDetails();
    return () => {
      isMounted = false;
    };
  }, [currentRepo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoInput.trim()) {
      onSelectRepo(repoInput.trim());
    }
  };

  const handleAnalyzeClick = () => {
    onNavigateSection('codebase');
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Stitch Hero Greeting & Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border p-6 rounded-md shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-text-primary">
              Good afternoon, Gopal.
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Repository is up to date
            </span>
          </div>
          <p className="text-body-sm text-text-secondary mt-1">
            Here&apos;s what&apos;s happening with your codebase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAnalyzeClick}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-text-primary text-white text-body-sm font-medium rounded-md hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} className="text-slate-300" />
            )}
            <span>Analyze repository</span>
          </button>
        </div>
      </div>

      {/* Target Repository Header / Metadata Card */}
      <div className="bg-surface border border-border rounded-md p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold font-mono text-text-primary">
                {currentRepo}
              </h2>
              <a
                href={`https://github.com/${currentRepo}`}
                target="_blank"
                rel="noreferrer"
                className="text-text-muted hover:text-text-primary transition-colors"
                title="View on GitHub"
              >
                <ExternalLink size={14} />
              </a>
            </div>
            <p className="text-body-sm text-text-secondary">
              {data.description}
            </p>
          </div>

          {/* Quick Repo Switcher Form */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 min-w-[280px]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="owner/repo"
                className="w-full pl-8 pr-2.5 py-1.5 rounded bg-surface-alt border border-border text-caption font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-text-primary"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-surface-alt hover:bg-border text-text-primary border border-border text-caption font-medium transition-colors"
            >
              Switch
            </button>
          </form>
        </div>

        {/* Badges & Tech Stack */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-caption">
          <div className="flex flex-wrap items-center gap-2">
            {data.languages.map((lang) => (
              <span
                key={lang}
                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-200"
              >
                {lang}
              </span>
            ))}
            {data.frameworks.map((fw) => (
              <span
                key={fw}
                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-200"
              >
                {fw}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px] border border-slate-200">
              {data.license}
            </span>
          </div>

          <div className="flex items-center gap-4 text-text-muted font-mono text-[11px]">
            <span className="inline-flex items-center gap-1">
              <GitBranch size={12} />
              {data.branch}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitCommit size={12} />
              {data.commitSha}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              Last analyzed {data.lastAnalyzed}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Compact Health & Intelligence Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Repository Health */}
        <div
          onClick={() => onNavigateSection('engineering')}
          className="bg-surface border border-border rounded-md p-4 hover:border-text-muted transition-colors cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-text-secondary">Repository Health</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
              Good
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-text-primary">
              {data.healthScore}<span className="text-sm font-normal text-text-muted">/100</span>
            </div>
            <p className="text-caption text-text-secondary mt-0.5">
              Maintainability & Architecture
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-text-muted group-hover:text-text-primary">
            <span>View Architecture</span>
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Security Findings */}
        <div
          onClick={() => onNavigateSection('security')}
          className="bg-surface border border-border rounded-md p-4 hover:border-text-muted transition-colors cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-text-secondary">Security</span>
            <Shield size={14} className="text-text-muted" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-text-primary">
              {data.securityHigh} <span className="text-sm font-normal text-text-muted">high priority</span>
            </div>
            <p className="text-caption text-text-secondary mt-0.5">
              {data.securityTotal === 0 ? 'No findings detected' : `${data.securityTotal} findings flagged for review`}
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-text-muted group-hover:text-text-primary">
            <span>Review Findings</span>
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Engineering Intelligence */}
        <div
          onClick={() => onNavigateSection('engineering')}
          className="bg-surface border border-border rounded-md p-4 hover:border-text-muted transition-colors cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-text-secondary">Engineering</span>
            <BarChart3 size={14} className="text-text-muted" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-text-primary">
              {data.maintainabilityScore}<span className="text-sm font-normal text-text-muted">/100</span>
            </div>
            <p className="text-caption text-text-secondary mt-0.5">
              {data.circularCycles === 0 ? '0 Circular cycles' : `${data.circularCycles} Circular cycles`} · {data.hotspotsCount} Hotspots
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-text-muted group-hover:text-text-primary">
            <span>Maintainability Report</span>
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Pull Requests */}
        <div
          onClick={() => onNavigateSection('pullrequests')}
          className="bg-surface border border-border rounded-md p-4 hover:border-text-muted transition-colors cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-text-secondary">Pull Requests</span>
            <GitPullRequest size={14} className="text-text-muted" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-text-primary">
              {data.openPRsCount} <span className="text-sm font-normal text-text-muted">active</span>
            </div>
            <p className="text-caption text-text-secondary mt-0.5">
              {data.openPRsCount === 0 ? 'No PRs awaiting review' : '1 awaiting review audit'}
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-text-muted group-hover:text-text-primary">
            <span>Review Diff Impact</span>
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions Panel */}
        <div className="bg-surface border border-border rounded-md p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <h3 className="text-body-sm font-semibold text-text-primary">
              Quick Actions
            </h3>
            <span className="text-[11px] text-text-muted font-mono">DevPilot Workflows</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Ask DevPilot */}
            <div
              onClick={() => onNavigateSection('qa')}
              className="p-3.5 rounded border border-border bg-surface-alt hover:border-text-primary hover:bg-surface transition-all cursor-pointer group space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-text-primary" />
                <span className="text-body-sm font-medium text-text-primary group-hover:underline">
                  Ask DevPilot
                </span>
              </div>
              <p className="text-caption text-text-secondary">
                Ask a question about the codebase.
              </p>
            </div>

            {/* Analyze Codebase */}
            <div
              onClick={() => onNavigateSection('codebase')}
              className="p-3.5 rounded border border-border bg-surface-alt hover:border-text-primary hover:bg-surface transition-all cursor-pointer group space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <Code2 size={15} className="text-text-primary" />
                <span className="text-body-sm font-medium text-text-primary group-hover:underline">
                  Analyze Codebase
                </span>
              </div>
              <p className="text-caption text-text-secondary">
                Run a fresh AST & topology analysis.
              </p>
            </div>

            {/* Review Pull Requests */}
            <div
              onClick={() => onNavigateSection('pullrequests')}
              className="p-3.5 rounded border border-border bg-surface-alt hover:border-text-primary hover:bg-surface transition-all cursor-pointer group space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <GitPullRequest size={15} className="text-text-primary" />
                <span className="text-body-sm font-medium text-text-primary group-hover:underline">
                  Review Pull Requests
                </span>
              </div>
              <p className="text-caption text-text-secondary">
                See what changed and check downstream blast radius.
              </p>
            </div>

            {/* Find & Fix Issues */}
            <div
              onClick={() => onNavigateSection('security')}
              className="p-3.5 rounded border border-border bg-surface-alt hover:border-text-primary hover:bg-surface transition-all cursor-pointer group space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <Wrench size={15} className="text-text-primary" />
                <span className="text-body-sm font-medium text-text-primary group-hover:underline">
                  Find & Fix Issues
                </span>
              </div>
              <p className="text-caption text-text-secondary">
                Review issues and generate verifiable code patches.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity Stream */}
        <div className="bg-surface border border-border rounded-md p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <h3 className="text-body-sm font-semibold text-text-primary">
              Recent Activity
            </h3>
            <span className="text-[11px] text-text-muted font-mono">Live Timeline</span>
          </div>

          <div className="space-y-3">
            {data.activities.length === 0 ? (
              <p className="text-caption text-text-muted py-4 text-center">
                No recent activity.
              </p>
            ) : (
              data.activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-3 text-body-sm pb-2.5 border-b border-border/40 last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-2.5">
                    {act.type === 'push' && <GitCommit size={15} className="text-text-muted mt-0.5 flex-shrink-0" />}
                    {act.type === 'security' && <Shield size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />}
                    {act.type === 'analysis' && <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 flex-shrink-0" />}
                    {act.type === 'pr' && <GitPullRequest size={15} className="text-text-muted mt-0.5 flex-shrink-0" />}
                    <div>
                      <div className="font-medium text-text-primary text-caption">
                        {act.title}
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        {act.detail}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted flex-shrink-0">
                    {act.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
