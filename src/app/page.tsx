'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NavSection } from '@/components/Sidebar';
import { OverviewDashboard } from '@/components/OverviewDashboard';
import { GitHubAuditTab } from '@/components/GitHubAuditTab';
import { SkillCongruenceTab } from '@/components/SkillCongruenceTab';
import { BulletPointEnhancerTab } from '@/components/BulletPointEnhancerTab';
import { ATSBreakdownTab } from '@/components/ATSBreakdownTab';
import { RecruiterQuestionsTab } from '@/components/RecruiterQuestionsTab';
import { InputSection } from '@/components/InputSection';
import { ExportReportModal } from '@/components/ExportReportModal';
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
      candidateName={report?.candidateName || 'No profile'}
      targetRole={report?.targetRole || 'Not set'}
      onExportPDF={() => setIsExportOpen(true)}
      onResetScan={handleResetScan}
      isEvaluating={isEvaluating}
    >
      {isEvaluating ? (
        <div className="w-full my-16 p-12 rounded-xl bg-[#131315] border border-white/10 text-center space-y-4 shadow-2xl">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="font-headline font-semibold text-base text-white tracking-tight">
            Loading available signals...
          </h3>
          <p className="text-xs text-[#8e9192] max-w-md mx-auto">
            Running resume heuristics and requesting live GitHub profile data. Invented GitHub metrics are not used.
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

          {activeSection === 'github' && (
            <div className="stagger-fade-up">
              <GitHubAuditTab github={report.github} />
            </div>
          )}

          {activeSection === 'skills' && (
            <div className="stagger-fade-up p-5 rounded-xl bg-[#131315] border border-white/10">
              <SkillCongruenceTab
                skillMatrix={report.skillMatrix}
                candidateName={report.candidateName}
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
              <ATSBreakdownTab deterministic={report.deterministic} />
            </div>
          )}

          {activeSection === 'insights' && (
            <div className="stagger-fade-up">
              <RecruiterQuestionsTab questions={report.recruiterQuestions} />
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="stagger-fade-up space-y-6">
              <div className="p-5 rounded-xl bg-[#131315] border border-white/10">
                <h2 className="font-headline text-lg font-semibold text-white mb-1">Analyze Resume Text & GitHub Handle</h2>
                <p className="text-xs text-[#8e9192] mb-4">
                  Paste source text and an optional GitHub username. Demo fixtures are labeled and are not live telemetry.
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
        <div className="stagger-fade-up space-y-6">
          <div className="p-5 rounded-xl bg-[#131315] border border-white/10">
            <h2 className="font-headline text-lg font-semibold text-white mb-1">No evaluation loaded</h2>
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
