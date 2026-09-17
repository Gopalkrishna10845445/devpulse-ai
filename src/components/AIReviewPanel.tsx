'use client';

import React, { useState } from 'react';
import { BulletRewrite } from '@/lib/types';
import { Copy, Check, TrendingUp } from 'lucide-react';

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
    <div className="bg-surface border border-border rounded-md p-5 space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-heading-sm text-text-primary">AI code & bullet review</h3>
          <p className="text-caption text-text-muted mt-0.5">Architectural rewrites, impact metric extraction & flaw analysis</p>
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-md bg-surface-alt border border-border">
          {[
            { id: 'metric' as const, label: 'Metric' },
            { id: 'star' as const, label: 'STAR' },
            { id: 'executive' as const, label: 'Executive' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFocus(f.id)}
              className={`px-3 py-1 rounded-sm text-[11px] transition-colors ${
                selectedFocus === f.id
                  ? 'bg-surface text-text-primary font-medium border border-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {bulletRewrites.length === 0 ? (
        <p className="text-body-sm text-text-muted">
          AI rewrite unavailable. Fabricated achievements and impact deltas are no longer generated.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 p-4 rounded-md bg-surface-alt border border-border text-caption">
            <div className="flex items-center gap-3">
              <div>
                <div className="font-mono font-medium text-text-primary">{totalFlaws} issues</div>
                <div className="text-[10px] text-text-muted">Flaws detected</div>
              </div>
            </div>
            <div className="flex items-center gap-3 border-l border-border pl-4">
              <div>
                <div className="font-mono font-medium text-text-muted">Delta unavailable</div>
                <div className="text-[10px] text-text-muted">Average delta</div>
              </div>
            </div>
            <div className="flex items-center gap-3 border-l border-border pl-4">
              <div>
                <div className="font-mono font-medium text-text-primary">{bulletRewrites.length} rewrites</div>
                <div className="text-[10px] text-text-muted">Ready to apply</div>
              </div>
            </div>
          </div>

          {/* Rewrites */}
          <div className="space-y-3">
            {bulletRewrites.map((rewrite, idx) => {
              let chosenText = rewrite.metricFocusText;
              if (selectedFocus === 'star') chosenText = rewrite.starArchitecturalText;
              if (selectedFocus === 'executive') chosenText = rewrite.executiveFocusText;

              return (
                <div key={rewrite.id || idx} className="p-4 rounded-md bg-surface-alt border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-caption font-medium text-text-primary">Item #{idx + 1}</span>
                      {rewrite.detectedFlaws?.map((flaw, fIdx) => (
                        <span key={fIdx} className="px-2 py-0.5 rounded-sm bg-red-50 text-semantic-red font-mono text-[9px] border border-red-200">
                          {flaw}
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-caption text-semantic-green font-medium flex items-center gap-1">
                      <TrendingUp size={12} />
                      +{rewrite.improvementDelta}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-caption">
                    <div className="p-3 rounded-md bg-surface border border-border space-y-1">
                      <span className="text-[9px] font-mono text-semantic-red uppercase tracking-wider block">− Original</span>
                      <p className="font-mono text-caption text-text-muted leading-relaxed">{rewrite.originalText}</p>
                    </div>
                    <div className="p-3 rounded-md bg-surface border border-border space-y-1.5 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-semantic-green uppercase tracking-wider block">+ Optimized</span>
                        <button
                          onClick={() => handleCopy(chosenText, rewrite.id)}
                          className="px-2 py-0.5 rounded-sm bg-surface-alt border border-border text-[10px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 font-mono"
                        >
                          {copiedId === rewrite.id ? <Check size={10} /> : <Copy size={10} />}
                          {copiedId === rewrite.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="font-mono text-caption text-text-primary leading-relaxed">{chosenText}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
