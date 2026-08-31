'use client';

import React from 'react';
import { Cpu, Github, Sparkles, RefreshCw, FileDown, ShieldCheck } from 'lucide-react';
import { CANDIDATE_PRESETS } from '@/lib/mockData';

interface NavbarProps {
  activePresetId?: string;
  onSelectPreset: (presetId: string) => void;
  onReset: () => void;
  onExport: () => void;
  isEvaluating?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePresetId,
  onSelectPreset,
  onReset,
  onExport,
  isEvaluating = false,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onReset}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">DevPulse</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                AI v2.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">GitHub Portfolio & Deep ATS Evaluator</p>
          </div>
        </div>

        {/* Candidate Presets Quick Switcher */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <span className="text-xs font-medium text-slate-400 px-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Presets:
          </span>
          {CANDIDATE_PRESETS.map(preset => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset.id)}
                disabled={isEvaluating}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{preset.name.split(' ')[0]}</span>
                <span className="text-[10px] opacity-60">({preset.experienceLevel})</span>
              </button>
            );
          })}
        </div>

        {/* Right Actions & Status */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GitHub API Active</span>
          </div>

          <button
            onClick={onExport}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-all flex items-center space-x-1.5 border border-slate-700"
          >
            <FileDown className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export Report</span>
          </button>

          <button
            onClick={onReset}
            disabled={isEvaluating}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span>New Scan</span>
          </button>
        </div>

      </div>
    </header>
  );
};
