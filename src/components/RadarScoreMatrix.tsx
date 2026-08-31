'use client';

import React from 'react';
import { QuadrantScores } from '@/lib/types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { ShieldCheck, Zap, GitBranch, Code } from 'lucide-react';

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
      title: 'ATS & Formatting Score',
      score: quadrants.atsFormatting,
      icon: ShieldCheck,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/30',
      description: 'Contact info detection, single-column parsing, standard section headers.',
    },
    {
      title: 'Impact & STAR Bullets',
      score: quadrants.impactAndStarBullets,
      icon: Zap,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      description: 'Quantifiable regex metrics ($, %, ms, users) and strong engineering action verbs.',
    },
    {
      title: 'GitHub Proof-of-Work',
      score: quadrants.githubProofOfWork,
      icon: GitBranch,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/30',
      description: 'Active commit velocity, stars/forks count, top repository portfolio breadth.',
    },
    {
      title: 'Code Hygiene & Depth',
      score: quadrants.codeHygieneAndArch,
      icon: Code,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/30',
      description: 'Automated CI/CD workflows, unit tests presence, README docs & PR lifecycle.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">4-Quadrant Competency Matrix</h3>
            <p className="text-xs text-slate-400">Multi-signal evaluation combining hard ATS heuristics with real GitHub code telemetry</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
            Full Radar Diagnostics
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Radar Chart */}
          <div className="lg:col-span-5 h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" />
                <Radar
                  name="Candidate"
                  dataKey="score"
                  stroke="#00f0ff"
                  fill="#00f0ff"
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Quadrant Progress Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quadrantList.map((q, idx) => {
              const Icon = q.icon;
              return (
                <div key={idx} className="glass-card p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg ${q.bgColor} ${q.borderColor} border`}>
                        <Icon className={`w-4 h-4 ${q.color}`} />
                      </div>
                      <span className="text-xs font-bold text-slate-200">{q.title}</span>
                    </div>
                    <span className={`text-sm font-extrabold font-mono ${q.color}`}>{q.score}/100</span>
                  </div>

                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500`}
                      style={{ width: `${q.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug">{q.description}</p>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
};
