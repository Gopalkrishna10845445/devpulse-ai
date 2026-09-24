'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NavSection } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
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
    <ErrorBoundary fallbackTitle="DevPilot Dashboard Exception">
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
            <ErrorBoundary fallbackTitle="Overview Tab Error">
              <OverviewTab
                onNavigateSection={setActiveSection}
                currentRepo={currentRepo}
                onSelectRepo={handleSelectRepo}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeSection === 'agent' && (
          <div className="stagger-fade-up" key={`agent-${currentRepo}-${refreshKey}`}>
            <ErrorBoundary fallbackTitle="Agent Workspace Error">
              <AgentTab initialRepoFullName={currentRepo} />
            </ErrorBoundary>
          </div>
        )}

        {activeSection === 'ingestion' && (
          <div className="stagger-fade-up" key={`ingestion-${currentRepo}-${refreshKey}`}>
            <ErrorBoundary fallbackTitle="Repository Ingestion Error">
              <RepositoryIngestionTab initialRepoFullName={currentRepo} />
            </ErrorBoundary>
          </div>
        )}

        {(activeSection === 'codebase' || activeSection === 'intelligence') && (
          <div className="stagger-fade-up" key={`codebase-${currentRepo}-${refreshKey}`}>
            <ErrorBoundary fallbackTitle="Codebase Intelligence Error">
              <CodebaseIntelligenceTab initialRepoFullName={currentRepo} />
            </ErrorBoundary>
          </div>
        )}

        {(activeSection === 'qa' || activeSection === 'rag') && (
          <div className="stagger-fade-up" key={`qa-${currentRepo}-${refreshKey}`}>
            <ErrorBoundary fallbackTitle="Q&A Workspace Error">
              <CodebaseQATab initialRepoFullName={currentRepo} />
            </ErrorBoundary>
          </div>
        )}

        {(activeSection === 'engineering' ||
          activeSection === 'github' ||
          activeSection === 'skills' ||
          activeSection === 'aireview' ||
          activeSection === 'activity' ||
          activeSection === 'insights') && (
          <div className="stagger-fade-up" key={`engineering-${currentRepo}-${refreshKey}`}>
            <ErrorBoundary fallbackTitle="Engineering Intelligence Error">
              <EngineeringIntelligenceTab initialRepoFullName={currentRepo} />
            </ErrorBoundary>
          </div>
        )}

        {activeSection === 'security' && (
          <div className="stagger-fade-up" key={`security-${currentRepo}-${refreshKey}`}>
            <ErrorBoundary fallbackTitle="Security Intelligence Error">
              <SecurityIntelligenceTab initialRepoFullName={currentRepo} />
            </ErrorBoundary>
          </div>
        )}

        {activeSection === 'pullrequests' && (
          <div className="stagger-fade-up" key={`pullrequests-${currentRepo}-${refreshKey}`}>
            <ErrorBoundary fallbackTitle="Pull Request Review Error">
              <PullRequestReviewTab initialRepoFullName={currentRepo} />
            </ErrorBoundary>
          </div>
        )}

        {activeSection === 'events' && (
          <div className="stagger-fade-up" key={`events-${refreshKey}`}>
            <ErrorBoundary fallbackTitle="Events Stream Error">
              <RepositoryEventsTab />
            </ErrorBoundary>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="stagger-fade-up" key={`settings-${refreshKey}`}>
            <ErrorBoundary fallbackTitle="Settings Error">
              <SettingsTab />
            </ErrorBoundary>
          </div>
        )}
      </DashboardLayout>
    </ErrorBoundary>
  );
}

