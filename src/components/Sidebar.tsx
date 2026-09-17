'use client';

import React from 'react';
import {
  LayoutDashboard,
  Code2,
  MessageSquare,
  BarChart3,
  Shield,
  GitPullRequest,
  Settings,
  ChevronRight,
} from 'lucide-react';

export type NavSection =
  | 'overview'
  | 'codebase'
  | 'qa'
  | 'engineering'
  | 'security'
  | 'pullrequests'
  | 'settings'
  // Legacy section IDs — kept for backward compat during transition
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
  disabled?: boolean;
  disabledLabel?: string;
}

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  activePresetId?: string;
  onSelectPreset: (presetId: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'codebase', label: 'Codebase', icon: <Code2 size={16} /> },
  { id: 'qa', label: 'Q&A', icon: <MessageSquare size={16} /> },
  { id: 'engineering', label: 'Engineering', icon: <BarChart3 size={16} /> },
  { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  { id: 'pullrequests', label: 'Pull Requests', icon: <GitPullRequest size={16} />, disabled: true, disabledLabel: 'Coming soon' },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isOpenMobile,
  onCloseMobile,
}) => {
  const resolvedSection = resolveSection(activeSection);

  const content = (
    <div className="flex flex-col h-full bg-surface border-r border-border select-none">

      {/* Brand */}
      <div className="h-[48px] px-4 flex items-center gap-2.5 border-b border-border">
        <div className="w-6 h-6 bg-text-primary rounded flex items-center justify-center text-white text-xs font-bold">
          D
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-heading-sm text-text-primary leading-none tracking-tight">DevPilot</span>
          <span className="text-[10px] font-mono text-text-muted tracking-wide mt-0.5">Repository Intelligence</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto no-scrollbar" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = resolvedSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (!item.disabled) {
                  onSelectSection(item.id);
                  onCloseMobile();
                }
              }}
              disabled={item.disabled}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-body-sm transition-colors ${
                item.disabled
                  ? 'text-text-muted cursor-not-allowed opacity-50'
                  : isActive
                    ? 'bg-surface-alt text-text-primary font-medium border-l-2 border-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-text-primary' : 'text-text-muted'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.disabled && item.disabledLabel && (
                <span className="text-[10px] font-mono text-text-muted">{item.disabledLabel}</span>
              )}
              {isActive && <ChevronRight size={14} className="text-text-muted" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between text-caption text-text-muted">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-semantic-green" />
          <span className="font-mono text-[10px]">Online</span>
        </div>
        <span className="font-mono text-[10px]">:3005</span>
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
