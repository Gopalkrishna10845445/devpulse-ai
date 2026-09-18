'use client';

import React from 'react';
import { NavSection } from './Sidebar';
import { Menu, Search, Download, RefreshCw } from 'lucide-react';

interface TopBarProps {
  activeSection: NavSection;
  candidateName?: string;
  targetRole?: string;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onExportPDF?: () => void;
  onResetScan?: () => void;
  isEvaluating?: boolean;
}

const sectionTitles: Record<string, string> = {
  overview: 'Overview',
  agent: 'DevPilot Agent',
  codebase: 'Codebase',
  ingestion: 'Repository Ingestion',
  intelligence: 'Codebase Intelligence',
  qa: 'Q&A',
  rag: 'Q&A',
  engineering: 'Engineering',
  github: 'GitHub Intelligence',
  skills: 'Technology Intelligence',
  aireview: 'AI Code Review',
  activity: 'Text Heuristics',
  insights: 'Investigation Q&A',
  settings: 'Settings',
  security: 'Security',
  pullrequests: 'Pull Requests',
  events: 'Events & Hooks',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  onOpenMobileMenu,
  onOpenSearch,
  onExportPDF = () => {},
  onResetScan = () => {},
  isEvaluating = false,
}) => {
  return (
    <header className="h-topbar-h fixed top-0 right-0 left-0 lg:left-sidebar-w z-30 bg-surface border-b border-border px-4 sm:px-5 flex items-center justify-between">
      {/* Left: Mobile menu + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-1.5 text-body-sm">
          <span className="font-mono text-text-muted hidden sm:inline">DevPilot</span>
          <span className="text-text-muted hidden sm:inline">/</span>
          <h1 className="font-semibold text-text-primary">
            {sectionTitles[activeSection] || activeSection}
          </h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border text-body-sm text-text-muted hover:text-text-primary hover:border-border-strong transition-colors"
          aria-label="Open command palette"
        >
          <Search size={14} />
          <span className="hidden sm:inline text-caption">Search</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1 py-0.5 rounded border border-border text-[10px] font-mono text-text-muted ml-1">
            ⌘K
          </kbd>
        </button>

        {/* Export */}
        <button
          onClick={onExportPDF}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md border border-border text-text-muted hover:text-text-primary hover:border-border-strong transition-colors flex items-center gap-1.5"
          aria-label="Export report"
        >
          <Download size={14} />
          <span className="hidden sm:inline text-caption">Export</span>
        </button>

        {/* Refresh / Action */}
        <button
          onClick={onResetScan}
          disabled={isEvaluating}
          className="px-3 py-1.5 rounded-md bg-text-primary text-white text-body-sm font-medium hover:bg-text-secondary disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={isEvaluating ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};
