'use client';

import React, { useState } from 'react';
import { SkillCongruenceItem } from '@/lib/types';

interface TechnologyIntelligenceTabProps {
  skillMatrix: SkillCongruenceItem[];
  profileName?: string;
}

export const TechnologyIntelligenceTab: React.FC<TechnologyIntelligenceTabProps> = ({
  skillMatrix,
  profileName = 'Engineering Profile',
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
    <div className="w-full flex flex-col space-y-4">
      
      {/* Filter */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'ALL' as const, label: `All (${skillMatrix.length})` },
          { id: 'VERIFIED' as const, label: `Verified (${verifiedCount})` },
          { id: 'PARTIAL' as const, label: `Partial (${partialCount})` },
          { id: 'RESUME_ONLY' as const, label: `Unverified (${missingCount})` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded-md text-caption font-medium transition-colors whitespace-nowrap ${
              filter === f.id
                ? 'bg-surface-alt text-text-primary border border-border'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto no-scrollbar rounded-md border border-border bg-surface">
        <div className="min-w-[600px] w-full">
          
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-border bg-surface-alt sticky top-0 z-10">
            <div className="col-span-3 text-[10px] font-mono text-text-muted uppercase tracking-wider">Technology</div>
            <div className="col-span-4 text-[10px] font-mono text-text-muted uppercase tracking-wider">Resume Claim</div>
            <div className="col-span-3 text-[10px] font-mono text-text-muted uppercase tracking-wider">GitHub Evidence</div>
            <div className="col-span-2 text-[10px] font-mono text-text-muted uppercase tracking-wider text-right">Status</div>
          </div>

          {/* Body */}
          <div className="flex flex-col divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-body-sm text-text-muted">
                No skill items found matching the selected filter.
              </div>
            ) : (
              filtered.map((item, idx) => {
                const statusConfig = {
                  VERIFIED: { color: 'text-semantic-green', dot: 'bg-semantic-green', label: 'Verified' },
                  PARTIAL: { color: 'text-semantic-amber', dot: 'bg-semantic-amber', label: 'Partial' },
                  RESUME_ONLY: { color: 'text-semantic-red', dot: 'bg-semantic-red', label: 'Unverified' },
                }[item.status] || { color: 'text-text-muted', dot: 'bg-text-muted', label: item.status };

                const claimQuote = `"${item.claimedLevel} proficiency in ${item.category}"`;
                const githubProof = item.evidenceDetails || 'No public repositories found';

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-surface-alt transition-colors group cursor-default items-center"
                  >
                    <div className="col-span-3">
                      <span className="font-mono text-caption text-text-primary group-hover:text-text-primary transition-colors">
                        {item.skill}
                      </span>
                    </div>
                    <div className="col-span-4">
                      <span className="text-caption text-text-muted group-hover:text-text-secondary transition-colors truncate block">
                        {claimQuote}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-caption text-text-muted truncate block">
                        {githubProof}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                      <span className={`text-[10px] font-mono ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
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
