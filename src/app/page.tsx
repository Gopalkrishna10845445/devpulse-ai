'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NavSection } from '@/components/Sidebar';
import { OverviewDashboard } from '@/components/OverviewDashboard';
import { GitHubAuditTab } from '@/components/GitHubAuditTab';
import { TechnologyIntelligenceTab } from '@/components/TechnologyIntelligenceTab';
import { BulletPointEnhancerTab } from '@/components/BulletPointEnhancerTab';
import { EngineeringHealthTab } from '@/components/EngineeringHealthTab';
import { InvestigationTab } from '@/components/InvestigationTab';
import { InputSection } from '@/components/InputSection';
import { ExportReportModal } from '@/components/ExportReportModal';
import { RepositoryIngestionTab } from '@/components/RepositoryIngestionTab';
import { CodebaseIntelligenceTab } from '@/components/CodebaseIntelligenceTab';
import { CodebaseQATab } from '@/components/CodebaseQATab';
import { EngineeringIntelligenceTab } from '@/components/EngineeringIntelligenceTab';
import { SecurityIntelligenceTab } from '@/components/SecurityIntelligenceTab';
import { PullRequestReviewTab } from '@/components/PullRequestReviewTab';
import { FullEvaluationReport } from '@/lib/types';

export default function Home() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [activePresetId, setActivePresetId] = useState<string>('');
  const [report, setReport] = useState<FullEvaluationReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const runEvaluation = async (presetId?: string, resumeText?: string, githubUsername?: string, roleTitle?: string) => {
    setIsEvaluating(true);
    setEvaluationError(null);
    try {
      const payload: Record<string, string | undefined> = {};
      if (presetId) {
        payload.presetId = presetId;
      } else {
        payload.resumeText = resumeText;
        payload.githubUsername = githubUsername;
        payload.targetRoleTitle = roleTitle;
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setReport(data);
        setActiveSection('overview');
      } else {
        const errBody = await res.json().catch(() => ({}));
        setEvaluationError(errBody.error || 'Evaluation failed');
        console.error('Failed to run evaluation');
      }
    } catch (err) {
      setEvaluationError('Evaluation API error');
      console.error('Evaluation API error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setActivePresetId(presetId);
    runEvaluation(presetId);
  };

  const handleCustomAnalyze = (resumeText: string, githubUsername: string, roleTitle: string) => {
    setActivePresetId('');
    runEvaluation(undefined, resumeText, githubUsername, roleTitle);
  };

  const handleResetScan = () => {
    setActivePresetId('');
    setReport(null);
    setEvaluationError(null);
    setActiveSection('settings');
  };

  return (
    <DashboardLayout
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      activePresetId={activePresetId}
      onSelectPreset={handleSelectPreset}
      candidateName={report?.profileName || 'No profile'}
      targetRole={report?.targetRole || 'Not set'}
      onExportPDF={() => setIsExportOpen(true)}
      onResetScan={handleResetScan}
      isEvaluating={isEvaluating}
    >
      {isEvaluating ? (
        <div className="w-full my-12 p-8 rounded-md bg-surface border border-border text-center space-y-4">
          <div className="w-6 h-6 border-2 border-text-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-heading-sm text-text-primary">
            Fetching live GitHub signals...
          </h3>
          <p className="text-body-sm text-text-muted max-w-md mx-auto">
            Running resume heuristics and requesting real GitHub data. This may take 5–15 seconds depending on repository count. No invented metrics are used.
          </p>
        </div>
      ) : report ? (
        <>
          {activeSection === 'overview' && (
            <OverviewDashboard
              report={report}
              onExportPDF={() => setIsExportOpen(true)}
              onNavigateSection={setActiveSection}
            />
          )}

          {activeSection === 'ingestion' && (
            <div className="stagger-fade-up">
              <RepositoryIngestionTab
                initialRepoFullName={
                  report?.github?.topRepositories?.[0]?.name && report?.github?.username
                    ? `${report.github.username}/${report.github.topRepositories[0].name}`
                    : 'Gopalkrishna10845445/devpulse-ai'
                }
              />
            </div>
          )}

          {(activeSection === 'codebase' || activeSection === 'intelligence') && (
            <div className="stagger-fade-up">
              <CodebaseIntelligenceTab
                initialRepoFullName={
                  report?.github?.topRepositories?.[0]?.name && report?.github?.username
                    ? `${report.github.username}/${report.github.topRepositories[0].name}`
                    : 'Gopalkrishna10845445/devpulse-ai'
                }
              />
            </div>
          )}

          {(activeSection === 'qa' || activeSection === 'rag') && (
            <div className="stagger-fade-up">
              <CodebaseQATab
                initialRepoFullName={
                  report?.github?.topRepositories?.[0]?.name && report?.github?.username
                    ? `${report.github.username}/${report.github.topRepositories[0].name}`
                    : 'Gopalkrishna10845445/devpulse-ai'
                }
              />
            </div>
          )}

          {activeSection === 'engineering' && (
            <div className="stagger-fade-up">
              <EngineeringIntelligenceTab
                initialRepoFullName={
                  report?.github?.topRepositories?.[0]?.name && report?.github?.username
                    ? `${report.github.username}/${report.github.topRepositories[0].name}`
                    : 'Gopalkrishna10845445/devpulse-ai'
                }
                preloadedGithub={report?.github}
              />
            </div>
          )}

          {activeSection === 'github' && (
            <div className="stagger-fade-up">
              <GitHubAuditTab github={report.github} />
            </div>
          )}

          {activeSection === 'skills' && (
            <div className="stagger-fade-up p-5 rounded-md bg-surface border border-border">
              <TechnologyIntelligenceTab
                skillMatrix={report.skillMatrix}
                profileName={report.profileName}
              />
            </div>
          )}

          {activeSection === 'aireview' && (
            <div className="stagger-fade-up">
              <BulletPointEnhancerTab bulletRewrites={report.bulletRewrites} />
            </div>
          )}

          {activeSection === 'activity' && (
            <div className="stagger-fade-up">
              <EngineeringHealthTab deterministic={report.deterministic} />
            </div>
          )}

          {activeSection === 'insights' && (
            <div className="stagger-fade-up">
              <InvestigationTab questions={report.investigationQuestions} />
            </div>
          )}

          {activeSection === 'security' && (
            <div className="stagger-fade-up">
              <SecurityIntelligenceTab
                initialRepoFullName={report.github?.username ? `${report.github.username}/repository` : 'Gopalkrishna10845445/devpulse-ai'}
              />
            </div>
          )}

          {activeSection === 'pullrequests' && (
            <div className="stagger-fade-up">
              <PullRequestReviewTab
                initialRepoFullName={
                  report?.github?.topRepositories?.[0]?.name && report?.github?.username
                    ? `${report.github.username}/${report.github.topRepositories[0].name}`
                    : 'Gopalkrishna10845445/devpulse-ai'
                }
              />
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="stagger-fade-up space-y-6">
              <div className="p-5 rounded-md bg-surface border border-border">
                <h2 className="text-heading-md text-text-primary mb-1">Analyze Profile</h2>
                <p className="text-body-sm text-text-muted mb-4">
                  Paste resume text and an optional GitHub username. Demo fixtures are labeled and are not live telemetry.
                </p>
                <InputSection
                  onAnalyze={handleCustomAnalyze}
                  onSelectPreset={handleSelectPreset}
                  isEvaluating={isEvaluating}
                  activePresetId={activePresetId}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        activeSection === 'ingestion' ? (
          <div className="stagger-fade-up">
            <RepositoryIngestionTab initialRepoFullName="Gopalkrishna10845445/devpulse-ai" />
          </div>
        ) : (activeSection === 'codebase' || activeSection === 'intelligence') ? (
          <div className="stagger-fade-up">
            <CodebaseIntelligenceTab initialRepoFullName="Gopalkrishna10845445/devpulse-ai" />
          </div>
        ) : (activeSection === 'qa' || activeSection === 'rag') ? (
          <div className="stagger-fade-up">
            <CodebaseQATab initialRepoFullName="Gopalkrishna10845445/devpulse-ai" />
          </div>
        ) : activeSection === 'engineering' ? (
          <div className="stagger-fade-up">
            <EngineeringIntelligenceTab initialRepoFullName="Gopalkrishna10845445/devpulse-ai" />
          </div>
        ) : activeSection === 'security' ? (
          <div className="stagger-fade-up">
            <SecurityIntelligenceTab initialRepoFullName="Gopalkrishna10845445/devpulse-ai" />
          </div>
        ) : activeSection === 'pullrequests' ? (
          <div className="stagger-fade-up">
            <PullRequestReviewTab initialRepoFullName="Gopalkrishna10845445/devpulse-ai" />
          </div>
        ) : (
          <div className="stagger-fade-up space-y-6">
            <div className="p-5 rounded-md bg-surface border border-border">
              <h2 className="text-heading-md text-text-primary mb-1">No profile loaded</h2>
              <p className="text-body-sm text-text-muted mb-4">
                Engineering data unavailable until you provide resume text and an optional GitHub username, or explicitly load a demo fixture.
              </p>
              {evaluationError && (
                <p className="text-caption text-red-600 mb-4">{evaluationError}</p>
              )}
              <InputSection
                onAnalyze={handleCustomAnalyze}
                onSelectPreset={handleSelectPreset}
                isEvaluating={isEvaluating}
                activePresetId={activePresetId}
              />
            </div>
          </div>
        )
      )}

      {report && (
        <ExportReportModal
          report={report}
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </DashboardLayout>
  );
}
