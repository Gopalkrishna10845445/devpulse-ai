'use client';

import React, { useState } from 'react';
import { InvestigationQuestion } from '@/lib/types';
import { ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

interface InvestigationTabProps {
  questions: InvestigationQuestion[];
}

export const InvestigationTab: React.FC<InvestigationTabProps> = ({ questions }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="w-full flex flex-col space-y-6 stagger-fade-up">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading-lg text-text-primary">Investigation Q&A</h2>
          <p className="text-body-sm text-text-muted mt-1">Targeted questions derived from GitHub signal gaps and resume claims</p>
        </div>
        <span className="px-3 py-1 rounded-md bg-surface border border-border text-caption font-mono text-text-muted">
          {questions.length} questions
        </span>
      </div>

      {/* Accordion */}
      <div className="space-y-2">
        {questions.map((q, idx) => {
          const isExpanded = expandedIndex === idx;
          return (
            <div key={idx} className="bg-surface border border-border rounded-md overflow-hidden">
              
              <div
                onClick={() => toggleExpand(idx)}
                className="p-4 cursor-pointer flex items-start justify-between gap-4 hover:bg-surface-alt transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-caption font-mono font-medium text-text-primary">Q{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded-sm bg-surface-alt border border-border text-[10px] font-mono text-text-muted">
                      {q.category}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">Target: {q.targetSkillOrClaim}</span>
                  </div>
                  <h5 className="text-body-sm font-medium text-text-primary leading-relaxed">{q.question}</h5>
                </div>

                <div className="pt-1 text-text-muted flex-shrink-0">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 bg-surface-alt border-t border-border space-y-1 text-caption">
                  <div className="flex items-center gap-1.5 text-semantic-green font-medium">
                    <CheckCircle size={14} />
                    <span>Suggested evaluation criteria & strong answer key</span>
                  </div>
                  <p className="text-text-muted leading-relaxed font-mono text-[11px] pl-5">
                    {q.suggestedAnswerKey}
                  </p>
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};
