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
        <div className="w-full my-16 p-12 rounded-xl bg-[#131315] border border-white/10 text-center space-y-4 shadow-2xl">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="font-headline font-semibold text-base text-white tracking-tight">
            Fetching live GitHub signals...
          </h3>
          <p className="text-xs text-[#8e9192] max-w-md mx-auto">
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

          {activeSection === 'intelligence' && (
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

          {activeSection === 'github' && (
            <div className="stagger-fade-up">
              <GitHubAuditTab github={report.github} />
            </div>
          )}

          {activeSection === 'skills' && (
            <div className="stagger-fade-up p-5 rounded-xl bg-[#131315] border border-white/10">
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

          {activeSection === 'settings' && (
            <div className="stagger-fade-up space-y-6">
              <div className="p-5 rounded-xl bg-[#131315] border border-white/10">
                <h2 className="font-headline text-lg font-semibold text-white mb-1">Analyze Profile</h2>
                <p className="text-xs text-[#8e9192] mb-4">
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
        ) : activeSection === 'intelligence' ? (
          <div className="stagger-fade-up">
            <CodebaseIntelligenceTab initialRepoFullName="Gopalkrishna10845445/devpulse-ai" />
          </div>
        ) : (
          <div className="stagger-fade-up space-y-6">
            <div className="p-5 rounded-xl bg-[#131315] border border-white/10">
              <h2 className="font-headline text-lg font-semibold text-white mb-1">No profile loaded</h2>
              <p className="text-xs text-[#8e9192] mb-4">
                Engineering data unavailable until you provide resume text and an optional GitHub username, or explicitly load a demo fixture.
              </p>
              {evaluationError && (
                <p className="text-xs text-red-400 mb-4">{evaluationError}</p>
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
