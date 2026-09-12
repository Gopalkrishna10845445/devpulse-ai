'use client';

import React, { useState } from 'react';
import { Sidebar, NavSection } from './Sidebar';
import { TopBar } from './TopBar';

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
  candidateName = 'No profile',
  targetRole = 'Not set',
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
                <span>GitHub Lookup</span>
              </h3>
              <button onClick={() => setIsSearchOpen(false)} className="text-[#8e9192] hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-[#c4c7c8]">
              Hard-coded demo people are not listed here. Open Settings to analyze a GitHub handle or load a labeled demo fixture.
            </p>

            <button
              onClick={() => {
                onSelectSection('settings');
                setIsSearchOpen(false);
              }}
              className="w-full py-2 rounded-lg bg-white text-black text-xs font-semibold"
            >
              Open Settings
            </button>

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
