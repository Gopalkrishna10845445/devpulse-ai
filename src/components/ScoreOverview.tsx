'use client';

import React from 'react';
import { FullEvaluationReport } from '@/lib/types';
import { Award, CheckCircle, AlertTriangle, FileDown, ShieldCheck, Zap, Sparkles } from 'lucide-react';

interface ScoreOverviewProps {
  report: FullEvaluationReport;
  onExport: () => void;
}

export const ScoreOverview: React.FC<ScoreOverviewProps> = ({ report, onExport }) => {
  const getBadgeColor = (rec: string) => {
    if (rec === 'Strong Hire') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    if (rec === 'Hire with Technical Interview') return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
  };

  const getScoreColor = (score: number) => {
    if (score >= 88) return 'from-emerald-400 to-teal-500 text-emerald-400';
    if (score >= 75) return 'from-cyan-400 to-blue-500 text-cyan-400';
    return 'from-amber-400 to-rose-500 text-amber-400';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Overall Candidate Score Ring & Recommendation */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col items-center sm:items-start lg:items-center text-center lg:text-center space-y-4 sm:space-y-0 lg:space-y-4 sm:space-x-6 lg:space-x-0 border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-6 lg:pb-0 lg:pr-8">
            
            {/* Score Ring Badge */}
            <div className="relative flex items-center justify-center w-36 h-36 rounded-full glass-panel border-4 border-slate-800 p-2 shadow-2xl">
              <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center border border-slate-800">
                <span className={`text-4xl font-extrabold bg-gradient-to-r ${getScoreColor(report.overallScore)} bg-clip-text text-transparent`}>
                  {report.overallScore}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Overall Score</span>
              </div>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{report.candidateName}</h2>
              <p className="text-xs text-cyan-400 font-medium mb-3">{report.targetRole}</p>

              {/* Hiring Recommendation */}
              <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getBadgeColor(report.keyTakeaways.hiringRecommendation)}`}>
                <Award className="w-3.5 h-3.5" />
                <span>{report.keyTakeaways.hiringRecommendation}</span>
              </div>
            </div>

          </div>

          {/* Right Column: Key Strengths & Gaps */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Key Recruiter Takeaways
              </h3>
              <button
                onClick={onExport}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" /> Export PDF Report
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Strengths */}
              <div className="p-4 rounded-xl glass-card border border-emerald-500/20 bg-emerald-950/10">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Validated Strengths</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  {report.keyTakeaways.strengths.map((str, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gaps / Risks */}
              <div className="p-4 rounded-xl glass-card border border-amber-500/20 bg-amber-950/10">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Identified Gaps & Risks</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  {report.keyTakeaways.gaps.map((gap, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-amber-400 mt-0.5">•</span>
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
