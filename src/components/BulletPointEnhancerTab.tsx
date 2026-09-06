'use client';

import React, { useState } from 'react';
import { BulletRewrite } from '@/lib/types';

interface BulletPointEnhancerTabProps {
  bulletRewrites: BulletRewrite[];
}

export const BulletPointEnhancerTab: React.FC<BulletPointEnhancerTabProps> = ({ bulletRewrites }) => {
  const [selectedFocus, setSelectedFocus] = useState<'metric' | 'star' | 'executive'>('metric');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [customRewrites, setCustomRewrites] = useState<BulletRewrite[]>([]);
  const [isRewritingCustom, setIsRewritingCustom] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCustomRewriteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput || customInput.trim().length < 10) return;
    setIsRewritingCustom(true);

    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulletPoint: customInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomRewrites([data, ...customRewrites]);
        setCustomInput('');
      }
    } catch (err) {
      console.error('Failed to rewrite bullet point:', err);
    } finally {
      setIsRewritingCustom(false);
    }
  };

  const allRewrites = [...customRewrites, ...bulletRewrites];

  return (
    <div className="w-full flex flex-col space-y-4 stagger-fade-up">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-2">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-on-surface mb-1">AI Bullet Point Optimizer</h2>
          <p className="text-xs text-on-surface-variant">Transform Passive Bullets into High-Impact Engineering Metrics</p>
        </div>

        {/* Focus Selector */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedFocus('metric')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedFocus === 'metric' ? 'bg-white/10 text-primary border border-white/20' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Metric Focus
          </button>
          
          <button
            onClick={() => setSelectedFocus('star')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedFocus === 'star' ? 'bg-white/10 text-primary border border-white/20' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            STAR Architectural
          </button>

          <button
            onClick={() => setSelectedFocus('executive')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedFocus === 'executive' ? 'bg-white/10 text-primary border border-white/20' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Executive Focus
          </button>
        </div>
      </div>

      {/* Live Custom Input Box */}
      <div className="p-4 rounded-xl bg-surface border border-border-subtle">
        <form onSubmit={handleCustomRewriteSubmit} className="flex flex-col sm:flex-row gap-2 items-center">
          <input
            type="text"
            placeholder="Paste any weak resume bullet point to rewrite live (e.g. Worked on performance)..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="flex-1 w-full px-4 py-2 rounded-lg bg-surface-container-lowest border border-border-subtle text-xs text-on-surface focus:outline-none focus:border-white/40"
          />
          <button
            type="submit"
            disabled={isRewritingCustom || customInput.trim().length < 10}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-xs transition-colors hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
            <span>Generate Rewrites</span>
          </button>
        </form>
      </div>

      {/* Rewrites Cards List */}
      <div className="space-y-3">
        {allRewrites.map((rewrite, idx) => {
          let chosenRewrite = rewrite.metricFocusText;
          let focusTitle = 'Metric-Driven Focus';

          if (selectedFocus === 'star') {
            chosenRewrite = rewrite.starArchitecturalText;
            focusTitle = 'STAR Architectural Focus';
          } else if (selectedFocus === 'executive') {
            chosenRewrite = rewrite.executiveFocusText;
            focusTitle = 'Executive Focus';
          }

          return (
            <div key={rewrite.id || idx} className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-on-surface">Bullet #{idx + 1}</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-high text-[10px] text-on-surface-variant font-mono border border-border-subtle">
                    {focusTitle}
                  </span>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-semantic-emerald/20 text-emerald-400 text-xs font-mono font-semibold border border-semantic-emerald/40 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  +{rewrite.improvementDelta} Impact
                </span>
              </div>

              {/* Detected Flaws */}
              {rewrite.detectedFlaws && rewrite.detectedFlaws.length > 0 && (
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {rewrite.detectedFlaws.map((flaw, fIdx) => (
                    <span key={fIdx} className="px-2 py-0.5 rounded bg-semantic-red/10 text-red-400 border border-semantic-red/30 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">warning</span>
                      {flaw}
                    </span>
                  ))}
                </div>
              )}

              {/* Before vs After Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                
                {/* Before */}
                <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-border-subtle space-y-1">
                  <span className="text-[10px] font-semibold text-semantic-red uppercase tracking-wider block">Before (Weak / Passive)</span>
                  <p className="text-on-surface-variant font-mono text-[11px] leading-relaxed">{rewrite.originalText}</p>
                </div>

                {/* After */}
                <div className="p-3.5 rounded-lg bg-surface-container-high border border-border-subtle space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-semantic-emerald uppercase tracking-wider block">After (AI Enhanced)</span>
                    <button
                      onClick={() => handleCopy(chosenRewrite, rewrite.id)}
                      className="px-2 py-0.5 rounded bg-surface border border-border-subtle text-on-surface text-[10px] font-medium transition-colors hover:border-white/30 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {copiedId === rewrite.id ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedId === rewrite.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-on-surface font-mono text-[11px] leading-relaxed">{chosenRewrite}</p>
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
