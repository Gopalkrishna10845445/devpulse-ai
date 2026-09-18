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
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleSelectRepo = (repoFullName: string) => {
    setCurrentRepo(repoFullName);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <DashboardLayout
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      currentRepo={currentRepo}
      onSelectRepo={handleSelectRepo}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      {activeSection === 'overview' && (
        <div className="stagger-fade-up" key={`overview-${currentRepo}-${refreshKey}`}>
          <OverviewTab
            onNavigateSection={setActiveSection}
            currentRepo={currentRepo}
            onSelectRepo={handleSelectRepo}
          />
        </div>
      )}

      {activeSection === 'agent' && (
        <div className="stagger-fade-up" key={`agent-${currentRepo}-${refreshKey}`}>
          <AgentTab initialRepoFullName={currentRepo} />
        </div>
      )}

      {activeSection === 'ingestion' && (
        <div className="stagger-fade-up" key={`ingestion-${currentRepo}-${refreshKey}`}>
          <RepositoryIngestionTab initialRepoFullName={currentRepo} />
        </div>
      )}

      {(activeSection === 'codebase' || activeSection === 'intelligence') && (
        <div className="stagger-fade-up" key={`codebase-${currentRepo}-${refreshKey}`}>
          <CodebaseIntelligenceTab initialRepoFullName={currentRepo} />
        </div>
      )}

      {(activeSection === 'qa' || activeSection === 'rag') && (
        <div className="stagger-fade-up" key={`qa-${currentRepo}-${refreshKey}`}>
          <CodebaseQATab initialRepoFullName={currentRepo} />
        </div>
      )}

      {(activeSection === 'engineering' ||
        activeSection === 'github' ||
        activeSection === 'skills' ||
        activeSection === 'aireview' ||
        activeSection === 'activity' ||
        activeSection === 'insights') && (
        <div className="stagger-fade-up" key={`engineering-${currentRepo}-${refreshKey}`}>
          <EngineeringIntelligenceTab initialRepoFullName={currentRepo} />
        </div>
      )}

      {activeSection === 'security' && (
        <div className="stagger-fade-up" key={`security-${currentRepo}-${refreshKey}`}>
          <SecurityIntelligenceTab initialRepoFullName={currentRepo} />
        </div>
      )}

      {activeSection === 'pullrequests' && (
        <div className="stagger-fade-up" key={`pullrequests-${currentRepo}-${refreshKey}`}>
          <PullRequestReviewTab initialRepoFullName={currentRepo} />
        </div>
      )}

      {activeSection === 'events' && (
        <div className="stagger-fade-up" key={`events-${refreshKey}`}>
          <RepositoryEventsTab />
        </div>
      )}

      {activeSection === 'settings' && (
        <div className="stagger-fade-up" key={`settings-${refreshKey}`}>
          <SettingsTab />
        </div>
      )}
    </DashboardLayout>
  );
}
