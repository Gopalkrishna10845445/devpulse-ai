'use client';

import React, { useState, useEffect } from 'react';
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
import { CANDIDATE_PRESETS } from '@/lib/mockData';

export default function Home() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [activePresetId, setActivePresetId] = useState<string>('alex-rivera');
  const [report, setReport] = useState<FullEvaluationReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const runEvaluation = async (presetId?: string, resumeText?: string, githubUsername?: string, roleTitle?: string) => {
    setIsEvaluating(true);
    try {
      const payload: any = {};
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
        console.error('Failed to run candidate evaluation');
      }
    } catch (err) {
      console.error('Evaluation API error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Initial load preset evaluation
  useEffect(() => {
    runEvaluation('alex-rivera');
  }, []);

  const handleSelectPreset = (presetId: string) => {
    setActivePresetId(presetId);
    runEvaluation(presetId);
  };

  const handleCustomAnalyze = (resumeText: string, githubUsername: string, roleTitle: string) => {
    setActivePresetId('');
    runEvaluation(undefined, resumeText, githubUsername, roleTitle);
  };

  const handleResetScan = () => {
    setActivePresetId('alex-rivera');
    runEvaluation('alex-rivera');
  };

  return (
    <DashboardLayout
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      activePresetId={activePresetId}
      onSelectPreset={handleSelectPreset}
      candidateName={report?.candidateName || 'Alex Rivera'}
      targetRole={report?.targetRole || 'Full-Stack Software Engineer'}
      onExportPDF={() => setIsExportOpen(true)}
      onResetScan={handleResetScan}
      isEvaluating={isEvaluating}
    >
      {/* Loading State */}
      {isEvaluating ? (
        <div className="w-full my-16 p-12 rounded-xl bg-[#131315] border border-white/10 text-center space-y-4 shadow-2xl">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="font-headline font-semibold text-base text-white tracking-tight">
            Analyzing Multi-Signal Engineering Telemetry...
          </h3>
          <p className="text-xs text-[#8e9192] max-w-md mx-auto">
            Parsing ATS contact info, extracting quantifiable regex metrics, querying GitHub commit history & language distribution, and calculating skill congruence...
          </p>
        </div>
      ) : report ? (
        <>
          {/* Overview Dashboard Section */}
          {activeSection === 'overview' && (
            <OverviewDashboard
              report={report}
              onExportPDF={() => setIsExportOpen(true)}
              onNavigateSection={setActiveSection}
            />
          )}

          {/* GitHub Intelligence Section */}
          {activeSection === 'github' && (
            <div className="stagger-fade-up">
              <GitHubAuditTab github={report.github} />
            </div>
          )}

          {/* Skills Analysis Section */}
          {activeSection === 'skills' && (
            <div className="stagger-fade-up p-5 rounded-xl bg-[#131315] border border-white/10">
              <SkillCongruenceTab
                skillMatrix={report.skillMatrix}
                candidateName={report.candidateName}
              />
            </div>
          )}

          {/* AI Code Review Section */}
          {activeSection === 'aireview' && (
            <div className="stagger-fade-up">
              <BulletPointEnhancerTab bulletRewrites={report.bulletRewrites} />
            </div>
          )}

          {/* ATS Activity Section */}
          {activeSection === 'activity' && (
            <div className="stagger-fade-up">
              <ATSBreakdownTab deterministic={report.deterministic} />
            </div>
          )}

          {/* Technical Interview Q&A Section */}
          {activeSection === 'insights' && (
            <div className="stagger-fade-up">
              <RecruiterQuestionsTab questions={report.recruiterQuestions} />
            </div>
          )}

          {/* Settings & Candidate Presets Section */}
          {activeSection === 'settings' && (
            <div className="stagger-fade-up space-y-6">
              <div className="p-5 rounded-xl bg-[#131315] border border-white/10">
                <h2 className="font-headline text-lg font-semibold text-white mb-1">Custom Resume & GitHub Analyzer</h2>
                <p className="text-xs text-[#8e9192] mb-4">Paste any candidate resume text or enter a GitHub handle to analyze live</p>
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
      ) : null}

      {/* PDF & JSON Export Modal */}
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
