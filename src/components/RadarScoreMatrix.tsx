'use client';

import React from 'react';
import { QuadrantScores } from '@/lib/types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface RadarScoreMatrixProps {
  quadrants: QuadrantScores;
}

export const RadarScoreMatrix: React.FC<RadarScoreMatrixProps> = ({ quadrants }) => {
  const radarData = [
    { subject: 'ATS Formatting', score: quadrants.atsFormatting, fullMark: 100 },
    { subject: 'Impact & STAR', score: quadrants.impactAndStarBullets, fullMark: 100 },
    { subject: 'GitHub Proof', score: quadrants.githubProofOfWork, fullMark: 100 },
    { subject: 'Code Hygiene', score: quadrants.codeHygieneAndArch, fullMark: 100 },
  ];

  const quadrantList = [
    {
      title: 'ATS & Formatting',
      score: quadrants.atsFormatting,
      icon: 'verified_user',
      description: 'Contact completeness, single-column parsing, standard section headers.',
    },
    {
      title: 'Impact & STAR Metrics',
      score: quadrants.impactAndStarBullets,
      icon: 'analytics',
      description: 'Quantifiable regex metrics ($, %, ms, scale) and engineering power verbs.',
    },
    {
      title: 'GitHub Proof-of-Work',
      score: quadrants.githubProofOfWork,
      icon: 'code_blocks',
      description: 'Commit velocity, stars/forks count, repository portfolio breadth.',
    },
    {
      title: 'Code Hygiene & Depth',
      score: quadrants.codeHygieneAndArch,
      icon: 'health_and_safety',
      description: 'Automated CI/CD workflows, unit test coverage, README docs.',
    },
  ];

  return (
    <div className="w-full mb-6 stagger-fade-up">
      <div className="rounded-2xl p-6 sm:p-8 bg-surface border border-border-subtle shadow-2xl">
        
        <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-6">
          <div>
            <h3 className="text-base font-headline font-bold text-on-surface tracking-tight">4-Quadrant Competency Matrix</h3>
            <p className="text-xs text-on-surface-variant">Multi-signal evaluation combining hard ATS heuristics with real GitHub code telemetry</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface border border-border-subtle font-mono">
            Radar Diagnostics
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Radar Chart */}
          <div className="lg:col-span-5 h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" stroke="#c4c7c8" tick={{ fill: '#e5e1e4', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.08)" />
                <Radar
                  name="Candidate"
                  dataKey="score"
                  stroke="#ffffff"
                  fill="#ffffff"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Quadrant Progress Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quadrantList.map((q, idx) => {
              return (
                <div key={idx} className="p-4 rounded-xl bg-surface-container-lowest border border-border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-on-surface">{q.icon}</span>
                      <span className="text-xs font-semibold text-on-surface">{q.title}</span>
                    </div>
                    <span className="text-xs font-bold font-mono text-on-surface">{q.score}/100</span>
                  </div>

                  <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden border border-border-subtle">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${q.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-on-surface-variant leading-snug">{q.description}</p>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
};
