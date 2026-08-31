'use client';

import React, { useState } from 'react';
import { RecruiterQuestion } from '@/lib/types';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, CheckCircle2, ShieldQuestion } from 'lucide-react';

interface RecruiterQuestionsTabProps {
  questions: RecruiterQuestion[];
}

export const RecruiterQuestionsTab: React.FC<RecruiterQuestionsTabProps> = ({ questions }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const getCategoryColor = (category: RecruiterQuestion['category']) => {
    if (category === 'System Architecture') return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    if (category === 'Code Verification') return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    if (category === 'Metrics & Impact') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-card p-6 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldQuestion className="w-4 h-4 text-purple-400" /> Tailored Technical Recruiter & Hiring Manager Questions
          </h4>
          <p className="text-[11px] text-slate-400">Targeted questions generated specifically for identified resume gaps & unverified GitHub claims</p>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
          {questions.length} Custom Questions
        </span>
      </div>

      {/* Questions Accordion */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const isExpanded = expandedIndex === idx;
          return (
            <div key={idx} className="glass-card rounded-xl border border-slate-800 overflow-hidden">
              
              {/* Question Header */}
              <div
                onClick={() => toggleExpand(idx)}
                className="p-5 cursor-pointer flex items-start justify-between space-x-4 hover:bg-slate-900/40 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">Q{idx + 1}.</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getCategoryColor(q.category)}`}>
                      {q.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Target: {q.targetSkillOrClaim}</span>
                  </div>
                  <h5 className="text-sm font-semibold text-white leading-relaxed">{q.question}</h5>
                </div>

                <div className="pt-1 text-slate-400">
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-cyan-400" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {/* Answer Key Drawer */}
              {isExpanded && (
                <div className="p-5 bg-slate-950 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Suggested Evaluation Criteria & Strong Answer Key</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed pl-5 font-mono text-[11px]">
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
