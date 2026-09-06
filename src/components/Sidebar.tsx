'use client';

import React from 'react';
import { CANDIDATE_PRESETS } from '@/lib/mockData';

export type NavSection = 'overview' | 'github' | 'skills' | 'aireview' | 'activity' | 'insights' | 'settings';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  activePresetId?: string;
  onSelectPreset: (presetId: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  activePresetId,
  onSelectPreset,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems: { id: NavSection; label: string; icon: string; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'github', label: 'GitHub Intelligence', icon: 'code_blocks' },
    { id: 'skills', label: 'Skills Analysis', icon: 'verified' },
    { id: 'aireview', label: 'AI Code Review', icon: 'auto_fix_high', badge: 'AI' },
    { id: 'activity', label: 'ATS Activity', icon: 'bolt' },
    { id: 'insights', label: 'Interview Q&A', icon: 'help_center' },
    { id: 'settings', label: 'Settings & Config', icon: 'settings' },
  ];

  const content = (
    <div className="flex flex-col h-full bg-[#0e0e10] border-r border-border-subtle text-on-surface select-none">
      
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center font-headline font-bold text-black text-xs shadow-sm">
            D
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-semibold text-sm tracking-tight text-primary leading-none">DevPulse AI</span>
            <span className="text-[10px] font-mono text-on-surface-variant/70 tracking-widest uppercase mt-0.5">Obsidian Pulse</span>
          </div>
        </div>
        <span className="font-label-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-container-low border border-border-subtle text-cyan-400">
          v2.0
        </span>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto no-scrollbar">
        <div className="px-2.5 pb-2 font-label-caps text-label-caps text-on-surface-variant/60 uppercase tracking-widest">
          Platform Engineering
        </div>
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-body-sm text-body-sm transition-all ${
                isActive
                  ? 'bg-surface-container-low text-primary border border-border-subtle font-medium shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-cyan-400' : 'text-on-surface-variant/70'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="font-label-caps text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Candidate Switcher Section */}
        <div className="pt-5 px-2.5 pb-2 font-label-caps text-label-caps text-on-surface-variant/60 uppercase tracking-widest border-t border-border-subtle mt-4">
          Candidate Profiles
        </div>
        <div className="space-y-1">
          {CANDIDATE_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  onSelectPreset(preset.id);
                  onCloseMobile();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-surface-container-low border border-cyan-500/30 text-cyan-300'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="truncate">
                  <div className="font-headline font-medium text-xs truncate text-on-surface">{preset.name}</div>
                  <div className="font-body-sm text-[11px] text-on-surface-variant/70 truncate">{preset.roleTitle}</div>
                </div>
                <span className="font-label-mono text-[9px] text-on-surface-variant px-1.5 py-0.5 rounded bg-surface border border-border-subtle">
                  {preset.experienceLevel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Status Footer */}
      <div className="p-3.5 border-t border-border-subtle bg-surface-container-lowest flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-semantic-emerald animate-pulse" />
          <span className="font-label-mono text-[10px] uppercase tracking-wider">Engine: Online</span>
        </div>
        <span className="font-label-mono text-[10px] text-cyan-400">3005</span>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 fixed left-0 top-0 bottom-0 z-40">
        {content}
      </aside>

      {/* Mobile Drawer Backdrop & Container */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative w-72 max-w-xs flex-1 h-full z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

