'use client';

import React from 'react';

interface BottomNavProps {
  activeTab: 'overview' | 'github' | 'skills' | 'rewriter' | 'ats' | 'questions';
  onSelectTab: (tab: 'overview' | 'github' | 'skills' | 'rewriter' | 'ats' | 'questions') => void;
  onOpenSettings?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab, onOpenSettings }) => {
  return (
    <nav className="fixed bottom-0 w-full z-50 bg-background/80 backdrop-blur-xl pb-safe border-t border-border-subtle">
      <div className="h-16 flex items-center justify-around px-4">
        
        {/* Home / Overview */}
        <button
          onClick={() => onSelectTab('overview')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'overview' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">dashboard</span>
          <span className="text-[11px] font-medium tracking-wider uppercase">Home</span>
        </button>

        {/* Activity / ATS Analysis */}
        <button
          onClick={() => onSelectTab('ats')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'ats' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">bolt</span>
          <span className="text-[11px] font-medium tracking-wider uppercase">Activity</span>
        </button>

        {/* Insights / Skills Matrix */}
        <button
          onClick={() => onSelectTab('skills')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'skills' || activeTab === 'github' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">query_stats</span>
          <span className="text-[11px] font-medium tracking-wider uppercase">Insights</span>
        </button>

        {/* Settings / Presets */}
        <button
          onClick={() => {
            if (onOpenSettings) onOpenSettings();
            else onSelectTab('questions');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'questions' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
          <span className="text-[11px] font-medium tracking-wider uppercase">Settings</span>
        </button>

      </div>
    </nav>
  );
};
