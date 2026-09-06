'use client';

import React from 'react';
import { QuadrantScores } from '@/lib/types';

interface ScoreCardProps {
  overallScore: number;
  candidateName: string;
  targetRole: string;
  recommendation: string;
  quadrants: QuadrantScores;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  overallScore,
  candidateName,
  targetRole,
  recommendation,
  quadrants,
}) => {
  const getBadgeStyle = (rec: string) => {
    if (rec === 'Strong Hire') return 'bg-semantic-emerald/15 text-semantic-emerald border-semantic-emerald/30';
    if (rec === 'Hire with Technical Interview') return 'bg-semantic-amber/15 text-semantic-amber border-semantic-amber/30';
    return 'bg-semantic-red/15 text-semantic-red border-semantic-red/30';
  };

  const quadrantList = [
    { label: 'ATS & Formatting', score: quadrants.atsFormatting, weight: '25%' },
    { label: 'Impact & STAR Bullets', score: quadrants.impactAndStarBullets, weight: '35%' },
    { label: 'GitHub Proof-of-Work', score: quadrants.githubProofOfWork, weight: '20%' },
    { label: 'Code Hygiene & Depth', score: quadrants.codeHygieneAndArch, weight: '20%' },
  ];

  return (
    <div className="p-6 rounded-xl bg-surface border border-border-subtle space-y-5 shadow-sm">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3.5">
        <div>
          <h3 className="font-headline font-semibold text-sm sm:text-base text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-cyan-400">equalizer</span>
            <span>Engineering Score Matrix</span>
          </h3>
          <p className="font-body-sm text-xs text-on-surface-variant/70 mt-0.5">Multi-signal assessment based on deterministic rules and GitHub code telemetry</p>
        </div>

        <span className={`px-2.5 py-1 rounded border font-label-caps text-[10px] uppercase tracking-wider font-semibold ${getBadgeStyle(recommendation)}`}>
          {recommendation}
        </span>
      </div>

      {/* Main Score Display Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Score Ring Display */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-5 rounded-xl bg-surface-container-lowest border border-border-subtle text-center">
          <div className="relative flex items-center justify-center w-28 h-28 rounded-full border-4 border-surface-container">
            <div className="w-full h-full rounded-full bg-surface flex flex-col items-center justify-center border border-border-subtle">
              <span className="font-mono text-4xl font-bold text-primary tracking-tight">{overallScore}</span>
              <span className="font-label-mono text-[10px] text-on-surface-variant/70 uppercase">/ 100</span>
            </div>
          </div>
          <div className="mt-3.5">
            <div className="font-headline font-semibold text-xs text-primary">{candidateName}</div>
            <div className="font-label-mono text-[10px] text-on-surface-variant/70 mt-0.5">{targetRole}</div>
          </div>
        </div>

        {/* 4 Quadrant Scores Progress Bars */}
        <div className="md:col-span-8 space-y-3.5">
          {quadrantList.map((q, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface font-medium flex items-center gap-2 font-body-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  {q.label}
                  <span className="font-label-mono text-[10px] text-on-surface-variant/60">({q.weight})</span>
                </span>
                <span className="font-label-mono font-semibold text-primary">{q.score}/100</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container-low border border-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                  style={{ width: `${q.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};

