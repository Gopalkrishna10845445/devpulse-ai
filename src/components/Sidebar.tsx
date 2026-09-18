'use client';

import React from 'react';
import {
  LayoutDashboard,
  Code2,
  MessageSquare,
  BarChart3,
  Shield,
  GitPullRequest,
  Zap,
  Bot,
  Settings,
  ChevronRight,
  GitBranch,
} from 'lucide-react';

export type NavSection =
  | 'overview'
  | 'agent'
  | 'codebase'
  | 'qa'
  | 'engineering'
  | 'security'
  | 'pullrequests'
  | 'events'
  | 'settings'
  | 'ingestion'
  | 'intelligence'
  | 'rag'
  | 'github'
  | 'skills'
  | 'aireview'
  | 'activity'
  | 'insights';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  currentRepo?: string;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'agent', label: 'DevPilot Agent', icon: <Bot size={16} />, badge: 'AI' },
  { id: 'codebase', label: 'Codebase', icon: <Code2 size={16} /> },
  { id: 'qa', label: 'Q&A', icon: <MessageSquare size={16} /> },
  { id: 'engineering', label: 'Engineering', icon: <BarChart3 size={16} /> },
  { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  { id: 'pullrequests', label: 'Pull Requests', icon: <GitPullRequest size={16} /> },
  { id: 'events', label: 'Events & Hooks', icon: <Zap size={16} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  currentRepo = 'Gopalkrishna10845445/devpulse-ai',
  isOpenMobile,
  onCloseMobile,
}) => {
  const resolvedSection = resolveSection(activeSection);

  const content = (
    <div className="flex flex-col h-full bg-surface border-r border-border select-none">
      {/* Brand Header */}
      <div className="h-[52px] px-4 flex items-center justify-between border-b border-border bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-text-primary rounded flex items-center justify-center text-white text-xs font-bold font-mono tracking-tight shadow-sm">
            DP
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-body-sm text-text-primary leading-none tracking-tight">
              DevPilot
            </span>
            <span className="text-[10px] font-mono text-text-muted tracking-wide mt-0.5">
              Developer Intelligence
            </span>
          </div>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-alt text-text-muted border border-border">
          v1.0
        </span>
      </div>

      {/* Navigation Links */}
      <nav
        className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto no-scrollbar"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="px-2 pb-1.5 pt-0.5 text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Platform
        </div>
        {navItems.map((item) => {
          const isActive = resolvedSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-body-sm transition-all duration-150 ${
                isActive
                  ? 'bg-surface-alt text-text-primary font-medium border-l-2 border-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-text-primary' : 'text-text-muted'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-surface border border-border text-text-muted">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight size={13} className="text-text-muted" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Section: Active Target Repository */}
      <div className="p-3 border-t border-border bg-surface-alt/40 space-y-2.5">
        <div className="p-2 rounded-md bg-surface border border-border space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1">
              <GitBranch size={11} className="text-text-muted" />
              Repository
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-semantic-green">
              <span className="w-1.5 h-1.5 rounded-full bg-semantic-green" />
              Live
            </span>
          </div>
          <p className="font-mono text-caption font-medium text-text-primary truncate" title={currentRepo}>
            {currentRepo}
          </p>
        </div>

        {/* User Identity Area */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-border flex-shrink-0 bg-surface-alt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-8NTCo-S2KSqMfteAY68iR3Z9mHkZkauLfx0l3WZSwDU7M6gh7r3pnoubnM2EeMd5Md4wuCJUJmOLB29Z3F3riQViMVu1icIaRVQo5jeShOMpG-Ustw7e1pQDlnVeLiI71q2DkbaSr4aCLZ1jn1LmTv0DpG0jGuiN5Dg6IvvNfdYkRtTgFLR7yejY8zBpD21y3oUhtk4uGCV6gdd24f4yh1fol4NvTldu2knwvQxpK0St7-yONKW8gg"
                alt="Gopal"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-caption font-medium text-text-primary truncate leading-tight">
                Gopal
              </span>
              <span className="text-[10px] text-text-muted truncate leading-tight">
                Developer
              </span>
            </div>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-semantic-green flex-shrink-0" title="Connected" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-sidebar-w fixed left-0 top-0 bottom-0 z-40">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative w-sidebar-w max-w-xs flex-1 h-full z-10 shadow-modal">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

/** Map legacy section IDs to new consolidated sections */
function resolveSection(section: NavSection): NavSection {
  switch (section) {
    case 'ingestion':
    case 'intelligence':
      return 'codebase';
    case 'rag':
      return 'qa';
    case 'github':
    case 'skills':
    case 'aireview':
    case 'activity':
    case 'insights':
      return 'engineering';
    default:
      return section;
  }
}
