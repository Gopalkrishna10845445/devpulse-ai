'use client';

import React, { useState } from 'react';
import { BulletRewrite } from '@/lib/types';
import { Copy, Check, TrendingUp, AlertTriangle } from 'lucide-react';

interface BulletPointEnhancerTabProps {
  bulletRewrites: BulletRewrite[];
}

export const BulletPointEnhancerTab: React.FC<BulletPointEnhancerTabProps> = ({ bulletRewrites }) => {
  const [selectedFocus, setSelectedFocus] = useState<'metric' | 'star' | 'executive'>('metric');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [customRewrites, setCustomRewrites] = useState<BulletRewrite[]>([]);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [isRewritingCustom, setIsRewritingCustom] = useState<boolean>(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCustomRewriteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput || customInput.trim().length < 10) return;
    setIsRewritingCustom(true);
    setRewriteError(null);

    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulletPoint: customInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCustomRewrites([data, ...customRewrites]);
        setCustomInput('');
      } else {
        setRewriteError(data.error || 'AI rewrite unavailable');
      }
    } catch (err) {
      setRewriteError('AI rewrite unavailable');
      console.error('Failed to rewrite bullet point:', err);
    } finally {
      setIsRewritingCustom(false);
    }
  };

  const allRewrites = [...customRewrites, ...bulletRewrites];

  return (
    <div className="w-full flex flex-col space-y-6 stagger-fade-up">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-lg text-text-primary">AI bullet point optimizer</h2>
          <p className="text-body-sm text-text-muted mt-1">Transform passive bullets into high-impact engineering metrics</p>
        </div>

        {/* Focus Selector */}
        <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
          {[
            { id: 'metric' as const, label: 'Metric' },
            { id: 'star' as const, label: 'STAR' },
            { id: 'executive' as const, label: 'Executive' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFocus(f.id)}
              className={`px-3 py-1 rounded-sm text-caption font-medium transition-colors ${
                selectedFocus === f.id
                  ? 'bg-text-primary text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Input */}
      <div className="bg-surface border border-border rounded-md p-4">
        <form onSubmit={handleCustomRewriteSubmit} className="flex flex-col sm:flex-row gap-2 items-center">
          <input
            type="text"
            placeholder="Paste a bullet point to rewrite..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="flex-1 w-full px-3 py-2 rounded-md bg-surface-alt border border-border text-body-sm text-text-primary font-mono focus:outline-none focus:border-border-strong"
          />
          <button
            type="submit"
            disabled={isRewritingCustom || customInput.trim().length < 10}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-text-primary text-white font-medium text-body-sm transition-colors hover:bg-text-secondary disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            Rewrite
          </button>
        </form>
        {rewriteError && <p className="text-caption text-semantic-amber mt-2">{rewriteError}</p>}
      </div>

      {allRewrites.length === 0 && !rewriteError && (
        <p className="text-body-sm text-text-muted">AI rewrite unavailable. Fabricated achievements are not generated.</p>
      )}

      {/* Rewrites List */}
      <div className="space-y-3">
        {allRewrites.map((rewrite, idx) => {
          let chosenRewrite = rewrite.metricFocusText;
          let focusTitle = 'Metric-driven';

          if (selectedFocus === 'star') {
            chosenRewrite = rewrite.starArchitecturalText;
            focusTitle = 'STAR architectural';
          } else if (selectedFocus === 'executive') {
            chosenRewrite = rewrite.executiveFocusText;
            focusTitle = 'Executive';
          }

          return (
            <div key={rewrite.id || idx} className="bg-surface border border-border rounded-md p-4 space-y-3">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-caption font-mono font-medium text-text-primary">#{idx + 1}</span>
                  <span className="px-2 py-0.5 rounded-sm bg-surface-alt border border-border text-[10px] text-text-muted font-mono">
                    {focusTitle}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-caption font-mono text-semantic-green">
                  <TrendingUp size={12} />
                  +{rewrite.improvementDelta}
                </span>
              </div>

              {/* Flaws */}
              {rewrite.detectedFlaws && rewrite.detectedFlaws.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rewrite.detectedFlaws.map((flaw, fIdx) => (
                    <span key={fIdx} className="px-2 py-0.5 rounded-sm bg-red-50 text-semantic-red border border-red-200 text-[10px] flex items-center gap-1">
                      <AlertTriangle size={10} />
                      {flaw}
                    </span>
                  ))}
                </div>
              )}

              {/* Before / After */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-md bg-surface-alt border border-border space-y-1">
                  <span className="text-[10px] font-mono text-semantic-red uppercase tracking-wider block">− Before</span>
                  <p className="text-caption font-mono text-text-muted leading-relaxed">{rewrite.originalText}</p>
                </div>

                <div className="p-3 rounded-md bg-surface-alt border border-border space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-semantic-green uppercase tracking-wider block">+ After</span>
                    <button
                      onClick={() => handleCopy(chosenRewrite, rewrite.id)}
                      className="px-2 py-0.5 rounded-sm bg-surface border border-border text-[10px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 font-mono"
                    >
                      {copiedId === rewrite.id ? <Check size={10} /> : <Copy size={10} />}
                      {copiedId === rewrite.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-caption font-mono text-text-primary leading-relaxed">{chosenRewrite}</p>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
