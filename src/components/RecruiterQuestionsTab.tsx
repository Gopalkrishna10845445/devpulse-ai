'use client';

import React, { useState } from 'react';
import { RecruiterQuestion } from '@/lib/types';

interface RecruiterQuestionsTabProps {
  questions: RecruiterQuestion[];
}

export const RecruiterQuestionsTab: React.FC<RecruiterQuestionsTabProps> = ({ questions }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="w-full flex flex-col space-y-4 stagger-fade-up">
      
      {/* Title */}
      <div className="flex items-center justify-between pt-2 pb-2">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-on-surface mb-1">Interview Technical Q&A</h2>
          <p className="text-xs text-on-surface-variant">Tailored Questions for Identified Resume Gaps & GitHub Claims</p>
        </div>

        <span className="px-3 py-1 rounded-full bg-surface border border-border-subtle text-xs font-mono text-on-surface">
          {questions.length} Questions
        </span>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const isExpanded = expandedIndex === idx;
          return (
            <div key={idx} className="rounded-xl bg-surface border border-border-subtle overflow-hidden">
              
              {/* Question Header */}
              <div
                onClick={() => toggleExpand(idx)}
                className="p-4 cursor-pointer flex items-start justify-between gap-4 hover:bg-white/5 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-on-surface">Q{idx + 1}.</span>
                    <span className="px-2 py-0.5 rounded bg-surface-container-high text-[10px] font-mono text-on-surface border border-border-subtle">
                      {q.category}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-mono">Target: {q.targetSkillOrClaim}</span>
                  </div>
                  <h5 className="text-xs font-semibold text-on-surface leading-relaxed">{q.question}</h5>
                </div>

                <div className="pt-1 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
              </div>

              {/* Answer Key Drawer */}
              {isExpanded && (
                <div className="p-4 bg-surface-container-lowest border-t border-border-subtle space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-semantic-emerald font-semibold">
                    <span className="material-symbols-outlined text-[16px]">task_alt</span>
                    <span>Suggested Evaluation Criteria & Strong Answer Key</span>
                  </div>
                  <p className="text-on-surface-variant leading-relaxed font-mono text-[11px] pl-5">
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
