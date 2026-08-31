'use client';

import React from 'react';
import { Cpu, Network, GitBranch, Zap, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onStartPreset: (presetId: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onStartPreset }) => {
  return (
    <div className="relative overflow-hidden py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center font-mono">
      {/* Noise & Grid Background elements */}
      <div className="grain" />
      <div className="fixed inset-0 grid-bg z-[-1]" />

      {/* HUD System Pill Badge */}
      <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0e0e0e] border border-[#1f1f1f] text-cyan-400 text-xs font-semibold mb-6">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="tracking-widest uppercase text-[11px]">ENG_INTEL_SYSTEM // v2.0</span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white uppercase max-w-4xl mx-auto leading-tight">
        ENGINEERING INTELLIGENCE <br />
        <span className="cyber-gradient-text">Don't just read the resume. Verify the code.</span>
      </h1>

      {/* Subtitle */}
      <p className="mt-4 text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
        DevPulse AI connects resume claims, GitHub proof-of-work, commit velocity, and AST code quality to deliver deep engineering assessments.
      </p>

      {/* Interactive HUD Visual (Stitch Node Matrix) */}
      <div className="my-8 relative w-full aspect-video max-w-md mx-auto border border-[#1f1f1f] rounded-xl bg-[#0e0e0e]/80 backdrop-blur-sm p-4 overflow-hidden flex items-center justify-center">
        {/* Connection Lines */}
        <div className="absolute inset-0 opacity-20">
          <svg height="100%" width="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="50" y1="50" x2="20" y2="20" stroke="#06b6d4" strokeWidth="0.8" />
            <line x1="50" y1="50" x2="80" y2="20" stroke="#06b6d4" strokeWidth="0.8" />
            <line x1="50" y1="50" x2="20" y2="80" stroke="#06b6d4" strokeWidth="0.8" />
            <line x1="50" y1="50" x2="80" y2="80" stroke="#06b6d4" strokeWidth="0.8" />
          </svg>
        </div>

        {/* Central Engine Node */}
        <div className="flex flex-col items-center justify-center relative z-10 text-center">
          <span className="text-[10px] text-cyan-400 opacity-60 mb-1 font-mono">STITCH_AI_ENGINE</span>
          <div className="w-14 h-14 rounded-full border border-cyan-400 bg-cyan-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Cpu className="w-7 h-7 text-cyan-400 animate-pulse" />
          </div>
          <span className="text-[11px] text-white mt-2 tracking-widest uppercase font-bold">EVAL_ORCHESTRATOR</span>
        </div>

        {/* Satellite Nodes */}
        <div className="absolute top-4 left-4 text-[9px] text-slate-400 border border-[#1f1f1f] bg-[#080808] px-2 py-1 rounded">RESUME_ATS</div>
        <div className="absolute top-4 right-4 text-[9px] text-slate-400 border border-[#1f1f1f] bg-[#080808] px-2 py-1 rounded">SKILL_MATRIX</div>
        <div className="absolute bottom-4 left-4 text-[9px] text-slate-400 border border-[#1f1f1f] bg-[#080808] px-2 py-1 rounded">GITHUB_API</div>
        <div className="absolute bottom-4 right-4 text-[9px] text-slate-400 border border-[#1f1f1f] bg-[#080808] px-2 py-1 rounded">CODE_HYGIENE</div>
      </div>
    </div>
  );
};
