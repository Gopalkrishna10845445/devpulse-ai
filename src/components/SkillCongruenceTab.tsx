'use client';

import React, { useState } from 'react';
import { SkillCongruenceItem } from '@/lib/types';

interface SkillCongruenceTabProps {
  skillMatrix: SkillCongruenceItem[];
  candidateName?: string;
}

export const SkillCongruenceTab: React.FC<SkillCongruenceTabProps> = ({
  skillMatrix,
  candidateName = 'Alex Rivera',
}) => {
  const [filter, setFilter] = useState<'ALL' | 'VERIFIED' | 'PARTIAL' | 'RESUME_ONLY'>('ALL');

  const filtered = skillMatrix.filter((item) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  const verifiedCount = skillMatrix.filter((s) => s.status === 'VERIFIED').length;
  const partialCount = skillMatrix.filter((s) => s.status === 'PARTIAL').length;
  const missingCount = skillMatrix.filter((s) => s.status === 'RESUME_ONLY').length;

  return (
    <div className="w-full flex flex-col stagger-fade-up space-y-4">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-2">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-on-surface mb-1">Skills Congruence</h2>
          <p className="text-xs text-on-surface-variant">Audit Trail for {candidateName}</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              filter === 'ALL'
                ? 'bg-white/10 text-primary border border-white/20'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All ({skillMatrix.length})
          </button>
          
          <button
            onClick={() => setFilter('VERIFIED')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              filter === 'VERIFIED'
                ? 'bg-semantic-emerald/20 text-emerald-400 border border-semantic-emerald/40'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Verified ({verifiedCount})
          </button>

          <button
            onClick={() => setFilter('PARTIAL')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              filter === 'PARTIAL'
                ? 'bg-semantic-amber/20 text-amber-400 border border-semantic-amber/40'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Partial ({partialCount})
          </button>

          <button
            onClick={() => setFilter('RESUME_ONLY')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              filter === 'RESUME_ONLY'
                ? 'bg-semantic-red/20 text-red-400 border border-semantic-red/40'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Missing ({missingCount})
          </button>
        </div>
      </div>

      {/* Skills Congruence Audit Table Container */}
      <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-border-subtle bg-surface">
        <div className="min-w-[640px] w-full">
          
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-border-subtle bg-surface-container-lowest sticky top-0 z-10">
            <div className="col-span-3 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Skill
            </div>
            <div className="col-span-4 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Resume Claim
            </div>
            <div className="col-span-3 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              GitHub Evidence
            </div>
            <div className="col-span-2 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider text-right">
              Status
            </div>
          </div>

          {/* Table Body */}
          <div className="flex flex-col divide-y divide-border-subtle">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant">
                No skill items found matching the selected filter.
              </div>
            ) : (
              filtered.map((item, idx) => {
                let badgeClass = 'bg-semantic-red text-primary';
                let statusLabel = 'Missing';

                if (item.status === 'VERIFIED') {
                  badgeClass = 'bg-semantic-emerald text-background';
                  statusLabel = 'Verified';
                } else if (item.status === 'PARTIAL') {
                  badgeClass = 'bg-semantic-amber text-background';
                  statusLabel = 'Partial';
                }

                // Construct clean resume claim text
                const claimQuote = `"${item.claimedLevel} proficiency in ${item.category}"`;
                const githubProof = item.evidenceDetails || 'No public repositories found';

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors group cursor-default items-center"
                  >
                    {/* Col 1: Skill */}
                    <div className="col-span-3 flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                        {item.skill}
                      </span>
                      <span className="text-[10px] text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container-high border border-border-subtle">
                        {item.category}
                      </span>
                    </div>

                    {/* Col 2: Resume Claim */}
                    <div className="col-span-4 flex items-center">
                      <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors truncate">
                        {claimQuote}
                      </span>
                    </div>

                    {/* Col 3: GitHub Evidence */}
                    <div className="col-span-3 flex items-center">
                      <span className="text-xs text-on-surface-variant truncate">
                        {githubProof}
                      </span>
                    </div>

                    {/* Col 4: Status Badge */}
                    <div className="col-span-2 flex items-center justify-end">
                      <div className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider ${badgeClass}`}>
                        {statusLabel}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
