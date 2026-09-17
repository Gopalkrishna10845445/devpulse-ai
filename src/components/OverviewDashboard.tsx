'use client';

import React from 'react';
import { FullEvaluationReport } from '@/lib/types';
import { MetricCard } from './MetricCard';
import { ScoreCard } from './ScoreCard';
import { GitHubActivityChart } from './GitHubActivityChart';
import { TechnologyIntelligenceTab } from './TechnologyIntelligenceTab';
import { AIReviewPanel } from './AIReviewPanel';
import { ActivityFeed } from './ActivityFeed';
import { ArrowRight } from 'lucide-react';

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
    <div className="space-y-8 stagger-fade-up">
      
      {/* Section: Metric Tiles */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
            Engineering health
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Overall score"
            value={report.overallScore === null ? '—' : `${report.overallScore}/100`}
            subtext={report.overallScore === null ? 'Data unavailable' : report.keyTakeaways.engineeringAssessment}
          />
          <MetricCard
            label="Code quality"
            value={report.github.overallHygieneScore === null ? '—' : `${report.github.overallHygieneScore}/100`}
            subtext={report.github.isFallbackData ? 'GitHub unavailable' : `${report.github.deepInspectedRepos} repos scored`}
          />
          <MetricCard
            label="Skills verified"
            value={`${verifiedSkillCount}/${totalSkillCount}`}
            subtext="Code proof on GitHub"
          />
          <MetricCard
            label="Commit velocity"
            value={report.github.recentCommitVelocity === null ? '—' : `${report.github.recentCommitVelocity}/wk`}
            subtext={`${report.github.commitCount30Days ?? '—'} commits in 30 days`}
          />
        </div>
      </section>

      {/* Section: Score Matrix */}
      <section>
        <ScoreCard
          overallScore={report.overallScore}
          profileName={report.profileName}
          targetRole={report.targetRole}
          recommendation={report.keyTakeaways.engineeringAssessment}
          quadrants={report.quadrants}
        />
      </section>

      {/* Section: GitHub Intelligence */}
      <section>
        <GitHubActivityChart github={report.github} />
      </section>

      {/* Section: Skills Matrix */}
      <section>
        <div className="bg-surface border border-border rounded-md p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-heading-sm text-text-primary">Skills convergence matrix</h3>
              <p className="text-caption text-text-muted mt-0.5">Resume claims vs. GitHub code evidence</p>
            </div>
            <button
              onClick={() => onNavigateSection('skills')}
              className="text-body-sm text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
            >
              <span>Full matrix</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <TechnologyIntelligenceTab
            skillMatrix={report.skillMatrix}
            profileName={report.profileName}
          />
        </div>
      </section>

      {/* Section: AI Review */}
      <section>
        <AIReviewPanel bulletRewrites={report.bulletRewrites} />
      </section>

      {/* Section: Activity Feed */}
      <section>
        <ActivityFeed githubUsername={report.github.username} />
      </section>

    </div>
  );
};
