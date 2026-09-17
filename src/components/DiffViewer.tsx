'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  className?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diff);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const lines = diff.split('\n');

  return (
    <div className={`relative rounded-md border border-border bg-surface-alt font-mono text-[12px] overflow-hidden ${className}`}>
      {/* Diff Header / Actions */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface text-caption text-text-muted">
        <span className="font-semibold text-text-primary text-[11px]">UNIFIED DIFF</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] hover:text-text-primary transition-colors"
          title="Copy diff to clipboard"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-500" />
              <span className="text-emerald-500">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy diff</span>
            </>
          )}
        </button>
      </div>

      {/* Diff Lines */}
      <div className="p-3 overflow-x-auto max-h-80 space-y-0.5">
        {lines.map((line, idx) => {
          let lineStyle = 'text-text-muted';
          let bgStyle = '';

          if (line.startsWith('---') || line.startsWith('+++')) {
            lineStyle = 'font-semibold text-text-primary';
          } else if (line.startsWith('@@')) {
            lineStyle = 'text-blue-500/80 font-semibold';
            bgStyle = 'bg-blue-500/5';
          } else if (line.startsWith('+')) {
            lineStyle = 'text-emerald-600 dark:text-emerald-400';
            bgStyle = 'bg-emerald-500/10 -mx-3 px-3';
          } else if (line.startsWith('-')) {
            lineStyle = 'text-red-600 dark:text-red-400';
            bgStyle = 'bg-red-500/10 -mx-3 px-3';
          }

          return (
            <div key={idx} className={`whitespace-pre font-mono ${lineStyle} ${bgStyle}`}>
              {line || ' '}
            </div>
          );
        })}
      </div>
    </div>
  );
};
