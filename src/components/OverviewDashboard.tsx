'use client';

import React from 'react';
import { FullEvaluationReport } from '@/lib/types';
import { MetricCard } from './MetricCard';
import { ScoreCard } from './ScoreCard';
import { GitHubActivityChart } from './GitHubActivityChart';
import { SkillCongruenceTab } from './SkillCongruenceTab';
import { AIReviewPanel } from './AIReviewPanel';
import { ActivityFeed } from './ActivityFeed';

interface OverviewDashboardProps {
  report: FullEvaluationReport;
  onExportPDF: () => void;
  onNavigateSection: (section: any) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  report,
  onExportPDF,
  onNavigateSection,
}) => {
  const verifiedSkillCount = report.skillMatrix.filter((s) => s.status === 'VERIFIED').length;
  const totalSkillCount = report.skillMatrix.length;

  return (
    <div className="space-y-6 stagger-fade-up">
      
      {/* 1. Developer / Engineering Health Overview (Compact Metric Tiles) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant/80">
            Engineering Health Overview
          </h2>
          <span className="font-label-mono text-[10px] text-cyan-400">Telemetry Active</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            label="Overall Score"
            value={`${report.overallScore}/100`}
            subtext={report.keyTakeaways.hiringRecommendation}
            icon="equalizer"
            status="cyan"
            trend="+12%"
          />
          <MetricCard
            label="Code Quality"
            value={`${report.github.overallHygieneScore}/100`}
            subtext="Clean AST & repo hygiene"
            icon="code_blocks"
            status="emerald"
          />
          <MetricCard
            label="GitHub Activity"
            value={`${report.github.recentCommitVelocity}/mo`}
            subtext={`${report.github.publicReposCount} Repositories`}
            icon="commit"
            status="purple"
          />
          <MetricCard
            label="Skills Verified"
            value={`${verifiedSkillCount}/${totalSkillCount}`}
            subtext="Code proof on GitHub"
            icon="verified"
            status="emerald"
          />
          <MetricCard
            label="AI Review Score"
            value={`${report.deterministic.actionVerbScore}/100`}
            subtext="Impact & power verbs"
            icon="auto_fix_high"
            status="cyan"
          />
          <MetricCard
            label="Commit Streak"
            value={`${report.github.activeCommitStreakDays} Days`}
            subtext={`${report.github.totalStars} Total Stars`}
            icon="local_fire_department"
            status="amber"
          />
        </div>
      </div>

      {/* 2. Engineering Score & 4-Quadrant Competency Matrix */}
      <ScoreCard
        overallScore={report.overallScore}
        candidateName={report.candidateName}
        targetRole={report.targetRole}
        recommendation={report.keyTakeaways.hiringRecommendation}
        quadrants={report.quadrants}
      />

      {/* 3. GitHub Insights & Repository Telemetry */}
      <GitHubActivityChart github={report.github} />

      {/* 4. Skills Convergence Table & Audit Trail */}
      <div className="p-6 rounded-xl bg-surface border border-border-subtle space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3.5">
          <div>
            <h3 className="font-headline font-semibold text-sm sm:text-base text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-semantic-emerald">verified</span>
              <span>Skills Convergence Matrix</span>
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant/70 mt-0.5">Resume claimed skills vs actual GitHub open-source code proof</p>
          </div>

          <button
            onClick={() => onNavigateSection('skills')}
            className="font-label-mono text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <span>Full Matrix</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>

        <SkillCongruenceTab
          skillMatrix={report.skillMatrix}
          candidateName={report.candidateName}
        />
      </div>

      {/* 5. AI Code Review & Bullet Optimizer Panel */}
      <AIReviewPanel bulletRewrites={report.bulletRewrites} />

      {/* 6. Recent Engineering Activity Feed */}
      <ActivityFeed githubUsername={report.github.username} />

    </div>
  );
};

