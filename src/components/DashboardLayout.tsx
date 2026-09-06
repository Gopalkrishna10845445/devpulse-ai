'use client';

import React, { useState } from 'react';
import { Sidebar, NavSection } from './Sidebar';
import { TopBar } from './TopBar';
import { CANDIDATE_PRESETS } from '@/lib/mockData';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  activePresetId?: string;
  onSelectPreset: (presetId: string) => void;
  candidateName?: string;
  targetRole?: string;
  onExportPDF: () => void;
  onResetScan: () => void;
  isEvaluating?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeSection,
  onSelectSection,
  activePresetId,
  onSelectPreset,
  candidateName = 'Alex Rivera',
  targetRole = 'Software Engineer',
  onExportPDF,
  onResetScan,
  isEvaluating = false,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#000000] text-[#e5e1e4] flex flex-col font-sans selection:bg-white/20 selection:text-white">
      
      {/* Left Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        activePresetId={activePresetId}
        onSelectPreset={onSelectPreset}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Top Navigation Bar */}
      <TopBar
        activeSection={activeSection}
        candidateName={candidateName}
        targetRole={targetRole}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onExportPDF={onExportPDF}
        onResetScan={onResetScan}
        isEvaluating={isEvaluating}
      />

      {/* Main Dashboard Content Area */}
      <main className="flex-1 lg:pl-64 pt-16 pb-12 min-h-screen bg-[#000000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Search / Lookup Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#131315] rounded-xl border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-headline font-semibold text-sm text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">search</span>
                <span>Candidate & GitHub Lookup</span>
              </h3>
              <button onClick={() => setIsSearchOpen(false)} className="text-[#8e9192] hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-[#c4c7c8]">
              Switch candidates or inspect candidate profiles instantly:
            </p>

            <div className="space-y-2">
              {CANDIDATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPreset(p.id);
                    setIsSearchOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-[#0e0e10] border border-white/10 hover:border-white/30 text-left transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1c1b1d] border border-white/10 flex items-center justify-center text-white font-bold text-xs">
                      {p.name[0]}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{p.name}</div>
                      <div className="text-[11px] text-[#8e9192]">{p.roleTitle} • @{p.githubUsername}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#1c1b1d] text-cyan-300 border border-white/10">
                    {p.experienceLevel}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsSearchOpen(false)}
              className="w-full py-2 rounded-lg bg-[#1c1b1d] text-white text-xs font-semibold hover:bg-white/10 border border-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
