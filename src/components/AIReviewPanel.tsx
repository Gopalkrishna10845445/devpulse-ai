'use client';

import React, { useState } from 'react';
import { BulletRewrite } from '@/lib/types';

interface AIReviewPanelProps {
  bulletRewrites: BulletRewrite[];
}

export const AIReviewPanel: React.FC<AIReviewPanelProps> = ({ bulletRewrites }) => {
  const [selectedFocus, setSelectedFocus] = useState<'metric' | 'star' | 'executive'>('metric');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalFlaws = bulletRewrites.reduce((acc, b) => acc + (b.detectedFlaws?.length || 0), 0);

  return (
    <div className="p-6 rounded-xl bg-surface border border-border-subtle space-y-5 shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3.5">
        <div>
          <h3 className="font-headline font-semibold text-sm sm:text-base text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-purple-400">auto_fix_high</span>
            <span>AI Code & Bullet Review Panel</span>
          </h3>
          <p className="font-body-sm text-xs text-on-surface-variant/70 mt-0.5">Architectural rewrites, impact metric extraction & flaw analysis</p>
        </div>

        {/* Perspective Controls */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-container-lowest border border-border-subtle text-xs">
          <button
            onClick={() => setSelectedFocus('metric')}
            className={`px-3 py-1 rounded-md font-body-sm text-[11px] transition-all ${
              selectedFocus === 'metric' ? 'bg-surface-container-low text-cyan-300 border border-border-subtle font-medium' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Metric Focus
          </button>
          
          <button
            onClick={() => setSelectedFocus('star')}
            className={`px-3 py-1 rounded-md font-body-sm text-[11px] transition-all ${
              selectedFocus === 'star' ? 'bg-surface-container-low text-purple-300 border border-border-subtle font-medium' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            STAR Architectural
          </button>

          <button
            onClick={() => setSelectedFocus('executive')}
            className={`px-3 py-1 rounded-md font-body-sm text-[11px] transition-all ${
              selectedFocus === 'executive' ? 'bg-surface-container-low text-semantic-emerald border border-border-subtle font-medium' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Executive Focus
          </button>
        </div>
      </div>

      {/* Audit Stats Banner */}
      <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-container-lowest border border-border-subtle text-xs">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[18px] text-semantic-red">error</span>
          <div>
            <div className="font-label-mono font-bold text-primary text-xs">{totalFlaws} Issues</div>
            <div className="font-body-sm text-[11px] text-on-surface-variant/70">Flaws Detected</div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-l border-border-subtle pl-4">
          <span className="material-symbols-outlined text-[18px] text-semantic-emerald">trending_up</span>
          <div>
            <div className="font-label-mono font-bold text-semantic-emerald text-xs">+18 ATS Boost</div>
            <div className="font-body-sm text-[11px] text-on-surface-variant/70">Average Delta</div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-l border-border-subtle pl-4">
          <span className="material-symbols-outlined text-[18px] text-cyan-400">task_alt</span>
          <div>
            <div className="font-label-mono font-bold text-primary text-xs">{bulletRewrites.length} Rewrites</div>
            <div className="font-body-sm text-[11px] text-on-surface-variant/70">Ready to Apply</div>
          </div>
        </div>
      </div>

      {/* Side by Side Diff Rewrites List */}
      <div className="space-y-3.5">
        {bulletRewrites.map((rewrite, idx) => {
          let chosenText = rewrite.metricFocusText;
          if (selectedFocus === 'star') chosenText = rewrite.starArchitecturalText;
          if (selectedFocus === 'executive') chosenText = rewrite.executiveFocusText;

          return (
            <div key={rewrite.id || idx} className="p-4 rounded-xl bg-surface-container-lowest border border-border-subtle space-y-3">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-label-mono text-xs font-semibold text-primary">Item #{idx + 1}</span>
                  {rewrite.detectedFlaws?.map((flaw, fIdx) => (
                    <span key={fIdx} className="px-2 py-0.5 rounded bg-semantic-red/10 text-semantic-red font-label-mono text-[9px] border border-semantic-red/20">
                      {flaw}
                    </span>
                  ))}
                </div>

                <span className="font-label-mono text-xs text-semantic-emerald font-semibold">
                  +{rewrite.improvementDelta} Impact
                </span>
              </div>

              {/* Side by Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                
                {/* BEFORE */}
                <div className="p-3.5 rounded-lg bg-semantic-red/5 border border-semantic-red/20 space-y-1.5">
                  <span className="font-label-caps text-[9px] text-semantic-red uppercase tracking-wider block">Original (Weak / Passive)</span>
                  <p className="font-mono text-xs text-on-surface-variant leading-relaxed">{rewrite.originalText}</p>
                </div>

                {/* AFTER */}
                <div className="p-3.5 rounded-lg bg-semantic-emerald/5 border border-semantic-emerald/20 space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-[9px] text-semantic-emerald uppercase tracking-wider block">AI Optimization</span>
                    <button
                      onClick={() => handleCopy(chosenText, rewrite.id)}
                      className="px-2 py-0.5 rounded bg-surface-container-low border border-border-subtle text-[10px] text-primary hover:border-white/30 transition-colors flex items-center gap-1 font-label-mono"
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {copiedId === rewrite.id ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedId === rewrite.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="font-mono text-xs text-primary leading-relaxed">{chosenText}</p>
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

