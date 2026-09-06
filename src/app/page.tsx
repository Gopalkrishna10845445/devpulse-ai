'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { HeroSection } from '@/components/HeroSection';
import { InputSection } from '@/components/InputSection';
import { ScoreOverview } from '@/components/ScoreOverview';
import { RadarScoreMatrix } from '@/components/RadarScoreMatrix';
import { ATSBreakdownTab } from '@/components/ATSBreakdownTab';
import { GitHubAuditTab } from '@/components/GitHubAuditTab';
import { SkillCongruenceTab } from '@/components/SkillCongruenceTab';
import { BulletPointEnhancerTab } from '@/components/BulletPointEnhancerTab';
import { RecruiterQuestionsTab } from '@/components/RecruiterQuestionsTab';
import { ExportReportModal } from '@/components/ExportReportModal';
import { FullEvaluationReport } from '@/lib/types';
import { CANDIDATE_PRESETS } from '@/lib/mockData';

export default function Home() {
  const [activePresetId, setActivePresetId] = useState<string>('alex-rivera');
  const [report, setReport] = useState<FullEvaluationReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'github' | 'skills' | 'rewriter' | 'ats' | 'questions'>('skills');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

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

  const handleReset = () => {
    setActivePresetId('alex-rivera');
    runEvaluation('alex-rivera');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col selection:bg-white/20 selection:text-white">
      
      {/* Fixed Top Header & Tab Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        onReset={handleReset}
        onExport={() => setIsExportOpen(true)}
        isEvaluating={isEvaluating}
      />

      {/* Main Content View Container */}
      <main className="flex-1 pt-28 pb-24 bg-background max-w-7xl w-full mx-auto px-4 sm:px-8">
        
        {/* Candidate & Analysis Controls Input (Collapsible/Hero section) */}
        {activeTab === 'overview' && (
          <div className="space-y-6 mb-8 stagger-fade-up">
            <HeroSection onStartPreset={handleSelectPreset} />
            <InputSection
              onAnalyze={handleCustomAnalyze}
              onSelectPreset={handleSelectPreset}
              isEvaluating={isEvaluating}
              activePresetId={activePresetId}
            />
          </div>
        )}

        {/* Loading Spinner State */}
        {isEvaluating ? (
          <div className="w-full my-16 p-12 rounded-2xl bg-surface border border-border-subtle text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-lg font-headline font-semibold text-on-surface tracking-tight">
              Analyzing Multi-Signal Candidate Telemetry...
            </h3>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto">
              Parsing ATS contact info, extracting quantifiable regex metrics, querying GitHub commit history & language distribution, and calculating skill congruence...
            </p>
          </div>
        ) : report ? (
          <div className="space-y-6">
            
            {/* Overview Banner Card (Shown on Overview & Tab views) */}
            {activeTab === 'overview' && (
              <>
                <ScoreOverview report={report} onExport={() => setIsExportOpen(true)} />
                <RadarScoreMatrix quadrants={report.quadrants} />
              </>
            )}

            {/* Tab Views */}
            {activeTab === 'skills' && (
              <SkillCongruenceTab
                skillMatrix={report.skillMatrix}
                candidateName={report.candidateName}
              />
            )}

            {activeTab === 'github' && (
              <div className="stagger-fade-up">
                <GitHubAuditTab github={report.github} />
              </div>
            )}

            {activeTab === 'rewriter' && (
              <div className="stagger-fade-up">
                <BulletPointEnhancerTab bulletRewrites={report.bulletRewrites} />
              </div>
            )}

            {activeTab === 'ats' && (
              <div className="stagger-fade-up">
                <ATSBreakdownTab deterministic={report.deterministic} />
              </div>
            )}

            {activeTab === 'questions' && (
              <div className="stagger-fade-up">
                <RecruiterQuestionsTab questions={report.recruiterQuestions} />
              </div>
            )}

          </div>
        ) : null}

      </main>

      {/* Fixed Bottom Nav Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* PDF & JSON Export Modal */}
      {report && (
        <ExportReportModal
          report={report}
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {/* Settings / Preset Selection Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface rounded-2xl border border-border-subtle p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-headline font-semibold text-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">settings</span>
                <span>Platform Settings & Presets</span>
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-on-surface-variant hover:text-on-surface">✕</button>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Candidate Profile Presets</div>
              {CANDIDATE_PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      handleSelectPreset(preset.id);
                      setIsSettingsOpen(false);
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-white/10 border-primary text-primary'
                        : 'bg-surface-container-low border-border-subtle hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-on-surface">{preset.name}</div>
                      <div className="text-[11px] text-on-surface-variant">{preset.roleTitle}</div>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface border border-border-subtle">
                      {preset.experienceLevel}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full py-2.5 rounded-xl bg-surface-bright text-on-surface text-xs font-semibold hover:bg-white/10"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
