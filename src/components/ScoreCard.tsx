'use client';

import React from 'react';
import { QuadrantScores } from '@/lib/types';

interface ScoreCardProps {
  overallScore: number | null;
  profileName: string;
  targetRole: string;
  recommendation: string;
  quadrants: QuadrantScores;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  overallScore,
  profileName,
  targetRole,
  recommendation,
  quadrants,
}) => {
  const quadrantList = [
    { label: 'Contact & Structure', score: quadrants.atsFormatting, weight: '25%' },
    { label: 'Impact & STAR Bullets', score: quadrants.impactAndStarBullets, weight: '25%' },
    { label: 'GitHub Proof-of-Work', score: quadrants.githubProofOfWork, weight: '25%' },
    { label: 'Commit Velocity Score', score: quadrants.codeHygieneAndArch, weight: '25%' },
  ];

  return (
    <div className="bg-surface border border-border rounded-md p-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="text-heading-sm text-text-primary">Engineering score matrix</h3>
          <p className="text-caption text-text-muted mt-0.5">Resume heuristics shown where calculated. GitHub scores stay unavailable until real evidence exists.</p>
        </div>
        <span className="px-2 py-1 rounded-sm border border-border text-[10px] font-mono text-text-secondary uppercase tracking-wider">
          {recommendation}
        </span>
      </div>

      {/* Score + Quadrants */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">

        {/* Score */}
        <div className="md:col-span-3 flex flex-col items-center justify-center p-5 rounded-md bg-surface-alt border border-border text-center">
          <span className="font-mono text-4xl font-bold text-text-primary tracking-tight">
            {overallScore === null ? '—' : overallScore}
          </span>
          <span className="text-[10px] font-mono text-text-muted uppercase mt-1">
            {overallScore === null ? 'Unavailable' : '/ 100'}
          </span>
          <div className="mt-3 pt-3 border-t border-border w-full">
            <p className="text-body-sm font-medium text-text-primary truncate">{profileName}</p>
            <p className="text-[10px] font-mono text-text-muted mt-0.5">{targetRole}</p>
          </div>
        </div>

        {/* Quadrant bars */}
        <div className="md:col-span-9 space-y-3.5">
          {quadrantList.map((q, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-text-secondary flex items-center gap-2">
                  {q.label}
                  <span className="text-caption font-mono text-text-muted">({q.weight})</span>
                </span>
                <span className="font-mono font-medium text-text-primary">
                  {q.score === null ? 'Unavailable' : `${q.score}/100`}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-alt border border-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-text-primary transition-all duration-500"
                  style={{ width: `${q.score === null ? 0 : q.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
