'use client';

import React, { useState } from 'react';
import { CANDIDATE_PRESETS } from '@/lib/mockData';

interface NavbarProps {
  activeTab: 'overview' | 'github' | 'skills' | 'rewriter' | 'ats' | 'questions';
  onSelectTab: (tab: 'overview' | 'github' | 'skills' | 'rewriter' | 'ats' | 'questions') => void;
  activePresetId?: string;
  onSelectPreset: (presetId: string) => void;
  onReset: () => void;
  onExport: () => void;
  isEvaluating?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  activePresetId,
  onSelectPreset,
  onReset,
  onExport,
  isEvaluating = false,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl pt-safe">
        {/* Upper Header Row */}
        <div className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-border-subtle">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={onReset}>
            <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center font-bold text-on-primary text-xs">
              D
            </div>
            <span className="font-headline text-lg font-semibold tracking-tighter text-on-surface">DevPulse</span>
            <span className="ml-2 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-surface-container-high border border-border-subtle text-on-surface-variant">
              v2.0 AI
            </span>
          </div>

          {/* Action Icons: Search & Profile Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high border border-border-subtle flex items-center justify-center transition-colors text-on-surface-variant hover:text-on-surface"
              title="Search Candidate / Look Up GitHub Profile"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>

            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              title="Switch Candidate Presets"
            >
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </button>

            <button
              onClick={onExport}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high border border-border-subtle text-xs font-medium text-on-surface hover:border-white/20 transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-semantic-emerald">download</span>
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Top Horizontal Scrollable Tab Navigation */}
        <div className="flex items-center gap-2 px-4 sm:px-8 h-12 overflow-x-auto no-scrollbar border-b border-border-subtle bg-background/60">
          <button
            onClick={() => onSelectTab('overview')}
            className={`px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-white/10 text-primary font-semibold border border-white/20'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => onSelectTab('skills')}
            className={`px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
              activeTab === 'skills'
                ? 'bg-white/10 text-primary font-semibold border border-white/20'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Skills Congruence
          </button>

          <button
            onClick={() => onSelectTab('github')}
            className={`px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
              activeTab === 'github'
                ? 'bg-white/10 text-primary font-semibold border border-white/20'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            GitHub Portfolio
          </button>

          <button
            onClick={() => onSelectTab('rewriter')}
            className={`px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
              activeTab === 'rewriter'
                ? 'bg-white/10 text-primary font-semibold border border-white/20'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            AI Rewrite
          </button>

          <button
            onClick={() => onSelectTab('ats')}
            className={`px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
              activeTab === 'ats'
                ? 'bg-white/10 text-primary font-semibold border border-white/20'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            ATS Breakdown
          </button>

          <button
            onClick={() => onSelectTab('questions')}
            className={`px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
              activeTab === 'questions'
                ? 'bg-white/10 text-primary font-semibold border border-white/20'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Interview Q&A
          </button>
        </div>
      </header>

      {/* Preset Switcher Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface-container rounded-2xl border border-border-subtle p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-headline font-semibold text-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-semantic-amber">person_search</span>
                <span>Select Candidate Preset</span>
              </h3>
              <button
                onClick={() => setIsProfileOpen(false)}
                className="text-on-surface-variant hover:text-on-surface text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {CANDIDATE_PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset.id);
                      setIsProfileOpen(false);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-white/10 border-primary text-primary'
                        : 'bg-surface-container-low border-border-subtle hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-on-surface">{preset.name}</div>
                      <div className="text-xs text-on-surface-variant">{preset.roleTitle} • GitHub: @{preset.githubUsername}</div>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface border border-border-subtle">
                      {preset.experienceLevel}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setIsProfileOpen(false)}
              className="w-full py-2.5 rounded-xl bg-surface-bright text-on-surface text-xs font-semibold hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-surface-container rounded-2xl border border-border-subtle p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-headline font-semibold text-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined">search</span>
                <span>GitHub & Candidate Lookup</span>
              </h3>
              <button onClick={() => setIsSearchOpen(false)} className="text-on-surface-variant hover:text-on-surface">✕</button>
            </div>

            <p className="text-xs text-on-surface-variant">
              Quickly jump to any candidate profile preset or inspect live GitHub handles:
            </p>

            <div className="grid grid-cols-1 gap-2">
              {CANDIDATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPreset(p.id);
                    setIsSearchOpen(false);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-border-subtle hover:border-white/20 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
                    <div>
                      <div className="text-xs font-semibold text-on-surface">{p.name}</div>
                      <div className="text-[11px] text-on-surface-variant">{p.roleTitle}</div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-xs text-on-surface-variant">arrow_forward</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsSearchOpen(false)}
              className="w-full py-2.5 rounded-xl bg-surface-bright text-on-surface text-xs font-semibold hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};
