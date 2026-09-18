'use client';

import React from 'react';
import { NavSection } from './Sidebar';
import {
  Menu,
  Search,
  Bell,
  GitBranch,
  RefreshCw,
} from 'lucide-react';

interface TopBarProps {
  activeSection: NavSection;
  currentRepo?: string;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
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
  currentRepo = 'Gopalkrishna10845445/devpulse-ai',
  onOpenMobileMenu,
  onOpenSearch,
  onRefresh = () => {},
  isRefreshing = false,
}) => {
  return (
    <header className="h-topbar-h fixed top-0 right-0 left-0 lg:left-sidebar-w z-30 bg-surface border-b border-border px-4 sm:px-5 flex items-center justify-between">
      {/* Left: Mobile menu trigger + Section Breadcrumb */}
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

      {/* Center/Right: Repository Switcher + Search + Notifications + User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Repo Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-alt border border-border text-caption font-mono max-w-[240px]">
          <span className="w-2 h-2 rounded-full bg-semantic-green flex-shrink-0" />
          <span className="text-text-primary truncate font-medium">{currentRepo}</span>
          <span className="text-text-muted flex-shrink-0">:main</span>
        </div>

        {/* Command Search Bar Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-surface text-body-sm text-text-muted hover:text-text-primary hover:border-border-strong transition-colors"
          aria-label="Open command search"
        >
          <Search size={14} />
          <span className="hidden sm:inline text-caption">Search code or ask a question...</span>
          <kbd className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded border border-border text-[10px] font-mono text-text-muted">
            ⌘K
          </kbd>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-md border border-border text-text-muted hover:text-text-primary hover:border-border-strong transition-colors"
          title="Refresh repository telemetry"
          aria-label="Refresh telemetry"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
        </button>

        {/* Notifications */}
        <button
          className="relative p-1.5 rounded-md border border-border text-text-muted hover:text-text-primary hover:border-border-strong transition-colors"
          aria-label="Notifications"
        >
          <Bell size={14} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-semantic-green" />
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden border border-border flex-shrink-0 bg-surface-alt">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-8NTCo-S2KSqMfteAY68iR3Z9mHkZkauLfx0l3WZSwDU7M6gh7r3pnoubnM2EeMd5Md4wuCJUJmOLB29Z3F3riQViMVu1icIaRVQo5jeShOMpG-Ustw7e1pQDlnVeLiI71q2DkbaSr4aCLZ1jn1LmTv0DpG0jGuiN5Dg6IvvNfdYkRtTgFLR7yejY8zBpD21y3oUhtk4uGCV6gdd24f4yh1fol4NvTldu2knwvQxpK0St7-yONKW8gg"
            alt="Gopal"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
};
