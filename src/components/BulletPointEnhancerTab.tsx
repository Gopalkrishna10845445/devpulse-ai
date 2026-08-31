'use client';

import React, { useState } from 'react';
import { BulletRewrite } from '@/lib/types';
import { Zap, Copy, Check, Sparkles, TrendingUp, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

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
    <div className="space-y-6">
      
      {/* Perspective Switcher & Header */}
      <div className="glass-card p-6 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Interactive AI Bullet Point Optimizer & Score Booster
          </h4>
          <p className="text-[11px] text-slate-400">Replaces weak, passive resume bullets with quantified, high-impact engineering accomplishments</p>
        </div>

        {/* 3 Strategic Perspectives */}
        <div className="flex items-center space-x-2 text-xs bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedFocus('metric')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedFocus === 'metric' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Metric Focus 📊
          </button>
          
          <button
            onClick={() => setSelectedFocus('star')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedFocus === 'star' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            STAR Architectural 🚀
          </button>

          <button
            onClick={() => setSelectedFocus('executive')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              selectedFocus === 'executive' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Executive Leadership 💼
          </button>
        </div>
      </div>

      {/* Custom Bullet Rewriter Form */}
      <div className="glass-card p-5 rounded-xl border border-cyan-500/30 bg-cyan-950/10">
        <form onSubmit={handleCustomRewriteSubmit} className="flex flex-col sm:flex-row gap-3 items-center">
          <input
            type="text"
            placeholder="Paste any weak resume bullet point to optimize live (e.g. Worked on optimizing database queries)..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="flex-1 w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={isRewritingCustom || customInput.trim().length < 10}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate 3 Rewrites</span>
          </button>
        </form>
      </div>

      {/* Bullet Rewrites List */}
      <div className="space-y-4">
        {allRewrites.map((rewrite, idx) => {
          let chosenRewrite = rewrite.metricFocusText;
          let focusTitle = 'Metric-Driven Focus';
          let focusBadgeStyle = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';

          if (selectedFocus === 'star') {
            chosenRewrite = rewrite.starArchitecturalText;
            focusTitle = 'STAR Architectural Focus';
            focusBadgeStyle = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
          } else if (selectedFocus === 'executive') {
            chosenRewrite = rewrite.executiveFocusText;
            focusTitle = 'Executive Leadership Focus';
            focusBadgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
          }

          return (
            <div key={rewrite.id || idx} className="glass-card p-6 rounded-xl border border-slate-800 space-y-4">
              
              {/* Header with Delta Score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-300">Bullet #{idx + 1} Optimization</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${focusBadgeStyle}`}>
                    {focusTitle}
                  </span>
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +{rewrite.improvementDelta} ATS Impact
                </span>
              </div>

              {/* Detected Flaws */}
              {rewrite.detectedFlaws && rewrite.detectedFlaws.length > 0 && (
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {rewrite.detectedFlaws.map((flaw, fIdx) => (
                    <span key={fIdx} className="px-2 py-0.5 rounded bg-rose-950/30 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" /> {flaw}
                    </span>
                  ))}
                </div>
              )}

              {/* Diff Comparison: BEFORE vs AFTER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* BEFORE */}
                <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/20 space-y-2">
                  <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider block">Before (Weak / Passive)</span>
                  <p className="text-slate-300 leading-relaxed font-mono text-[11px]">{rewrite.originalText}</p>
                </div>

                {/* AFTER */}
                <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">After (AI Enhanced)</span>
                    <button
                      onClick={() => handleCopy(chosenRewrite, rewrite.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold transition-all flex items-center gap-1 border border-slate-700"
                    >
                      {copiedId === rewrite.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-cyan-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-white leading-relaxed font-mono text-[11px]">{chosenRewrite}</p>
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
