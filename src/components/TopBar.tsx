'use client';

import React from 'react';
import { NavSection } from './Sidebar';

interface TopBarProps {
  activeSection: NavSection;
  candidateName?: string;
  targetRole?: string;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onExportPDF: () => void;
  onResetScan: () => void;
  isEvaluating?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  candidateName = 'Alex Rivera',
  targetRole = 'Software Engineer',
  onOpenMobileMenu,
  onOpenSearch,
  onExportPDF,
  onResetScan,
  isEvaluating = false,
}) => {
  const sectionTitles: Record<NavSection, string> = {
    overview: 'Overview Dashboard',
    github: 'GitHub & Repository Intelligence',
    skills: 'Skills Convergence Matrix',
    aireview: 'AI Code Review & Bullet Optimizer',
    activity: 'ATS Activity & Metric Breakdown',
    insights: 'Technical Interview Q&A',
    settings: 'Platform Settings & Presets',
  };

  return (
    <header className="h-14 fixed top-0 right-0 left-0 lg:left-64 z-30 bg-[#0e0e10]/80 backdrop-blur-xl border-b border-border-subtle px-4 sm:px-6 flex items-center justify-between">
      
      {/* Left: Mobile Menu Toggle + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-white/[0.04] border border-border-subtle transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-label-mono text-on-surface-variant/70 hidden sm:inline">DevPulse</span>
          <span className="text-on-surface-variant/40 hidden sm:inline">/</span>
          <h1 className="font-headline font-semibold text-primary tracking-tight text-sm sm:text-base">
            {sectionTitles[activeSection]}
          </h1>
        </div>
      </div>

      {/* Right: Candidate Profile Badge & Platform Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        
        {/* Active Candidate Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low border border-border-subtle text-xs">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="font-headline font-semibold text-primary">{candidateName}</span>
          <span className="font-label-mono text-[10px] text-on-surface-variant/70">({targetRole})</span>
        </div>

        {/* Search Trigger Button */}
        <button
          onClick={onOpenSearch}
          className="p-1.5 sm:px-3 sm:py-1 rounded-lg bg-surface hover:bg-surface-container-low border border-border-subtle text-body-sm text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5"
          title="Search Candidate / GitHub Profiles"
        >
          <span className="material-symbols-outlined text-[16px] text-cyan-400">search</span>
          <span className="hidden sm:inline font-label-mono text-[11px]">Search</span>
        </button>

        {/* Export PDF Report Button */}
        <button
          onClick={onExportPDF}
          className="p-1.5 sm:px-3 sm:py-1 rounded-lg bg-surface hover:bg-surface-container-low border border-border-subtle text-body-sm text-primary transition-all flex items-center gap-1.5"
          title="Export PDF Report"
        >
          <span className="material-symbols-outlined text-[16px] text-semantic-emerald">download</span>
          <span className="hidden sm:inline font-label-mono text-[11px]">Export PDF</span>
        </button>

        {/* New Scan Trigger */}
        <button
          onClick={onResetScan}
          disabled={isEvaluating}
          className="px-3 py-1 rounded-lg bg-primary text-background font-headline font-semibold text-xs transition-all hover:bg-white/90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
        >
          <span className={`material-symbols-outlined text-[16px] ${isEvaluating ? 'animate-spin' : ''}`}>
            sync
          </span>
          <span className="hidden sm:inline font-label-mono text-[11px]">New Scan</span>
        </button>

      </div>

    </header>
  );
};

