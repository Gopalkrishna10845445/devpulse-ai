'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NavSection } from '@/components/Sidebar';
import { OverviewTab } from '@/components/OverviewTab';
import { SettingsTab } from '@/components/SettingsTab';
import { AgentTab } from '@/components/AgentTab';
import { CodebaseIntelligenceTab } from '@/components/CodebaseIntelligenceTab';
import { CodebaseQATab } from '@/components/CodebaseQATab';
import { EngineeringIntelligenceTab } from '@/components/EngineeringIntelligenceTab';
import { SecurityIntelligenceTab } from '@/components/SecurityIntelligenceTab';
import { PullRequestReviewTab } from '@/components/PullRequestReviewTab';
import { RepositoryEventsTab } from '@/components/RepositoryEventsTab';
import { RepositoryIngestionTab } from '@/components/RepositoryIngestionTab';

export default function Home() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [currentRepo, setCurrentRepo] = useState<string>('Gopalkrishna10845445/devpulse-ai');

  const handleSelectRepo = (repoFullName: string) => {
    setCurrentRepo(repoFullName);
  };

  return (
    <DashboardLayout
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      currentRepo={currentRepo}
      onSelectRepo={handleSelectRepo}
    >
      {activeSection === 'overview' && (
        <div className="stagger-fade-up">
          <OverviewTab
            onNavigateSection={setActiveSection}
            currentRepo={currentRepo}
            onSelectRepo={handleSelectRepo}
          />
        </div>
      )}

      {activeSection === 'agent' && (
        <div className="stagger-fade-up">
          <AgentTab initialRepoFullName={currentRepo} />
        </div>
      )}

      {activeSection === 'ingestion' && (
        <div className="stagger-fade-up">
          <RepositoryIngestionTab initialRepoFullName={currentRepo} />
        </div>
      )}

      {(activeSection === 'codebase' || activeSection === 'intelligence') && (
        <div className="stagger-fade-up">
          <CodebaseIntelligenceTab initialRepoFullName={currentRepo} />
        </div>
      )}

      {(activeSection === 'qa' || activeSection === 'rag') && (
        <div className="stagger-fade-up">
          <CodebaseQATab initialRepoFullName={currentRepo} />
        </div>
      )}

      {(activeSection === 'engineering' ||
        activeSection === 'github' ||
        activeSection === 'skills' ||
        activeSection === 'aireview' ||
        activeSection === 'activity' ||
        activeSection === 'insights') && (
        <div className="stagger-fade-up">
          <EngineeringIntelligenceTab initialRepoFullName={currentRepo} />
        </div>
      )}

      {activeSection === 'security' && (
        <div className="stagger-fade-up">
          <SecurityIntelligenceTab initialRepoFullName={currentRepo} />
        </div>
      )}

      {activeSection === 'pullrequests' && (
        <div className="stagger-fade-up">
          <PullRequestReviewTab initialRepoFullName={currentRepo} />
        </div>
      )}

      {activeSection === 'events' && (
        <div className="stagger-fade-up">
          <RepositoryEventsTab />
        </div>
      )}

      {activeSection === 'settings' && (
        <div className="stagger-fade-up">
          <SettingsTab />
        </div>
      )}
    </DashboardLayout>
  );
}
