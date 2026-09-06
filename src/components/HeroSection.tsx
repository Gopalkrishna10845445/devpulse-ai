'use client';

import React from 'react';

interface HeroSectionProps {
  onStartPreset: (presetId: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onStartPreset }) => {
  return (
    <div className="p-6 rounded-xl bg-[#131315] border border-white/10 text-center relative overflow-hidden">
      <div className="max-w-3xl mx-auto space-y-3">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c1b1d] border border-white/10 text-xs font-mono text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Obsidian Pulse Engine Active</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-headline font-bold text-white tracking-tight leading-tight">
          Engineering Intelligence & Code Portfolio Audit
        </h1>

        <p className="text-xs sm:text-sm text-[#c4c7c8] leading-relaxed max-w-xl mx-auto">
          DevPulse AI connects resume claims, GitHub proof-of-work, commit velocity, and AST code quality to deliver deep engineering assessments.
        </p>

      </div>
    </div>
  );
};
