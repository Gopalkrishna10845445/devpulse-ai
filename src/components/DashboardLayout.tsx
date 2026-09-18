'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavSection } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  activePresetId?: string;
  onSelectPreset?: (presetId: string) => void;
  candidateName?: string;
  targetRole?: string;
  onExportPDF?: () => void;
  onResetScan?: () => void;
  isEvaluating?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeSection,
  onSelectSection,
  activePresetId,
  onSelectPreset = () => {},
  candidateName,
  targetRole,
  onExportPDF = () => {},
  onResetScan = () => {},
  isEvaluating = false,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Global keyboard shortcut: ⌘K / Ctrl+K
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsCommandOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col font-sans">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        activePresetId={activePresetId}
        onSelectPreset={onSelectPreset}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Top Bar */}
      <TopBar
        activeSection={activeSection}
        candidateName={candidateName}
        targetRole={targetRole}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenSearch={() => setIsCommandOpen(true)}
        onExportPDF={onExportPDF}
        onResetScan={onResetScan}
        isEvaluating={isEvaluating}
      />

      {/* Main Content */}
      <main className="flex-1 lg:pl-sidebar-w pt-topbar-h pb-12 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onNavigate={(section) => onSelectSection(section as NavSection)}
      />
    </div>
  );
};
