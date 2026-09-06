'use client';

import React from 'react';
import { FullEvaluationReport } from '@/lib/types';

interface ScoreOverviewProps {
  report: FullEvaluationReport;
  onExport: () => void;
}

export const ScoreOverview: React.FC<ScoreOverviewProps> = ({ report, onExport }) => {
  const getBadgeColor = (rec: string) => {
    if (rec === 'Strong Hire') return 'bg-semantic-emerald/20 text-emerald-400 border-semantic-emerald/40';
    if (rec === 'Hire with Technical Interview') return 'bg-semantic-amber/20 text-amber-400 border-semantic-amber/40';
    return 'bg-semantic-red/20 text-red-400 border-semantic-red/40';
  };

  return (
    <div className="w-full mb-6 stagger-fade-up">
      <div className="rounded-2xl p-6 sm:p-8 bg-surface border border-border-subtle shadow-2xl relative overflow-hidden">
        
        {/* Subtle mesh ambient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-3xl rounded-full pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Column: Candidate Score & Title */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-4 border-b lg:border-b-0 lg:border-r border-border-subtle pb-6 lg:pb-0 lg:pr-8">
            
            <div className="flex items-center gap-6">
              {/* Score Badge */}
              <div className="relative flex items-center justify-center w-28 h-28 rounded-2xl bg-surface-container-lowest border border-border-subtle p-2 shadow-inner">
                <div className="w-full h-full rounded-xl bg-surface-container flex flex-col items-center justify-center border border-border-subtle">
                  <span className="text-3xl font-headline font-bold text-on-surface">
                    {report.overallScore}
                  </span>
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Score</span>
                </div>
              </div>

              {/* Candidate Info */}
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-headline font-bold text-on-surface tracking-tight">
                  {report.candidateName}
                </h2>
                <p className="text-xs text-on-surface-variant font-medium">{report.targetRole}</p>

                {/* Recommendation Pill */}
                <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getBadgeColor(report.keyTakeaways.hiringRecommendation)}`}>
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  <span>{report.keyTakeaways.hiringRecommendation}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Strengths & Gaps */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold font-mono text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">insights</span>
                <span>Recruiter Evaluation Takeaways</span>
              </h3>
              
              <button
                onClick={onExport}
                className="px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-bright text-xs font-medium text-on-surface border border-border-subtle transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px] text-semantic-emerald">download</span>
                <span>PDF Report</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Strengths */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-border-subtle">
                <div className="flex items-center gap-1.5 text-xs font-bold text-semantic-emerald mb-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Validated Strengths</span>
                </div>
                <ul className="space-y-2 text-xs text-on-surface-variant">
                  {report.keyTakeaways.strengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-semantic-emerald">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gaps / Risks */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-border-subtle">
                <div className="flex items-center gap-1.5 text-xs font-bold text-semantic-amber mb-2">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  <span>Identified Technical Gaps</span>
                </div>
                <ul className="space-y-2 text-xs text-on-surface-variant">
                  {report.keyTakeaways.gaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-semantic-amber">•</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
