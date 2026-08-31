'use client';

import React, { useState } from 'react';
import { SkillCongruenceItem } from '@/lib/types';
import { CheckCircle2, AlertCircle, HelpCircle, Filter, GitCommit, Code } from 'lucide-react';

interface SkillCongruenceTabProps {
  skillMatrix: SkillCongruenceItem[];
}

export const SkillCongruenceTab: React.FC<SkillCongruenceTabProps> = ({ skillMatrix }) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PARTIAL' | 'RESUME_ONLY'>('ALL');

  const filtered = skillMatrix.filter(item => {
    if (statusFilter === 'ALL') return true;
    return item.status === statusFilter;
  });

  const verifiedCount = skillMatrix.filter(s => s.status === 'VERIFIED').length;
  const partialCount = skillMatrix.filter(s => s.status === 'PARTIAL').length;
  const resumeOnlyCount = skillMatrix.filter(s => s.status === 'RESUME_ONLY').length;

  return (
    <div className="space-y-6">
      
      {/* Top Filter & Count Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-4 rounded-xl border border-slate-800">
        <div>
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Resume Skill Claims vs. GitHub Code Proof Matrix
          </h4>
          <p className="text-[11px] text-slate-400">Deterministic cross-check of resume keywords against GitHub repositories & package manifests</p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === 'ALL' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({skillMatrix.length})
          </button>
          
          <button
            onClick={() => setStatusFilter('VERIFIED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 ${
              statusFilter === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Verified 🟢</span>
            <span>({verifiedCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('PARTIAL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 ${
              statusFilter === 'PARTIAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Partial 🟡</span>
            <span>({partialCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('RESUME_ONLY')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 ${
              statusFilter === 'RESUME_ONLY' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Resume Only ⚪</span>
            <span>({resumeOnlyCount})</span>
          </button>
        </div>
      </div>

      {/* Skill Matrix Table */}
      <div className="glass-card rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Technology / Skill</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Claimed Level</th>
                <th className="px-5 py-3.5">GitHub Proof Status</th>
                <th className="px-5 py-3.5">Evidence Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((item, idx) => {
                let badgeStyle = 'bg-rose-950/40 text-rose-300 border-rose-500/40';
                let icon = <HelpCircle className="w-3.5 h-3.5 text-rose-400" />;
                let label = '⚪ Resume Only (No Code Proof)';

                if (item.status === 'VERIFIED') {
                  badgeStyle = 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40';
                  icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
                  label = '🟢 Verified in GitHub Code';
                } else if (item.status === 'PARTIAL') {
                  badgeStyle = 'bg-amber-950/40 text-amber-300 border-amber-500/40';
                  icon = <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
                  label = '🟡 Partial Evidence';
                }

                return (
                  <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-4 font-bold text-white flex items-center space-x-2">
                      <Code className="w-4 h-4 text-cyan-400" />
                      <span>{item.skill}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-300">{item.claimedLevel}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeStyle}`}>
                        {icon}
                        <span>{label}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-[11px] leading-relaxed max-w-xs">
                      {item.evidenceDetails}
                      {item.githubRepoName && (
                        <span className="block text-[10px] text-cyan-400 font-mono mt-0.5">
                          Repo: {item.githubRepoName}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
