'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
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
import { FileCheck, Github, CheckCircle2, Zap, ShieldQuestion } from 'lucide-react';

export default function Home() {
  const [activePresetId, setActivePresetId] = useState<string>('alex-rivera');
  const [report, setReport] = useState<FullEvaluationReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ats' | 'github' | 'skills' | 'rewriter' | 'questions'>('ats');
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

  const handleReset = () => {
    setActivePresetId('alex-rivera');
    runEvaluation('alex-rivera');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-300">
      
      {/* Top Navbar */}
      <Navbar
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        onReset={handleReset}
        onExport={() => setIsExportOpen(true)}
        isEvaluating={isEvaluating}
      />

      {/* Hero Header */}
      <HeroSection onStartPreset={handleSelectPreset} />

      {/* Input / Presets Switcher */}
      <InputSection
        onAnalyze={handleCustomAnalyze}
        onSelectPreset={handleSelectPreset}
        isEvaluating={isEvaluating}
        activePresetId={activePresetId}
      />

      {/* Main Analysis Results */}
      {isEvaluating ? (
        <div className="max-w-5xl mx-auto my-16 p-12 glass-panel rounded-2xl border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-lg font-bold text-white tracking-tight">Analyzing Multi-Signal Candidate Telemetry...</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Parsing ATS contact info, extracting quantifiable regex metrics, querying GitHub commit history & language distribution, and calculating skill congruence...
          </p>
        </div>
      ) : report ? (
        <div className="flex-1 pb-16">
          
          {/* Overall Score Banner */}
          <ScoreOverview report={report} onExport={() => setIsExportOpen(true)} />

          {/* 4-Quadrant Competency Matrix */}
          <RadarScoreMatrix quadrants={report.quadrants} />

          {/* Detailed Diagnostic Tabs */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="glass-panel rounded-2xl border border-slate-800 p-6 sm:p-8">
              
              {/* Tab Navigation */}
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-4 mb-6 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('ats')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 whitespace-nowrap ${
                    activeTab === 'ats'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                  <span>ATS & Metric Heuristics</span>
                </button>

                <button
                  onClick={() => setActiveTab('github')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 whitespace-nowrap ${
                    activeTab === 'github'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Github className="w-4 h-4 text-purple-400" />
                  <span>Deep GitHub Portfolio Audit</span>
                </button>

                <button
                  onClick={() => setActiveTab('skills')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 whitespace-nowrap ${
                    activeTab === 'skills'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Skill Proof Matrix</span>
                </button>

                <button
                  onClick={() => setActiveTab('rewriter')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 whitespace-nowrap ${
                    activeTab === 'rewriter'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>AI Bullet Point Optimizer</span>
                </button>

                <button
                  onClick={() => setActiveTab('questions')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 whitespace-nowrap ${
                    activeTab === 'questions'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldQuestion className="w-4 h-4 text-indigo-400" />
                  <span>Recruiter Interview Questions</span>
                </button>
              </div>

              {/* Tab Contents */}
              {activeTab === 'ats' && <ATSBreakdownTab deterministic={report.deterministic} />}
              {activeTab === 'github' && <GitHubAuditTab github={report.github} />}
              {activeTab === 'skills' && <SkillCongruenceTab skillMatrix={report.skillMatrix} />}
              {activeTab === 'rewriter' && <BulletPointEnhancerTab bulletRewrites={report.bulletRewrites} />}
              {activeTab === 'questions' && <RecruiterQuestionsTab questions={report.recruiterQuestions} />}

            </div>
          </div>

          {/* PDF & JSON Export Modal */}
          <ExportReportModal
            report={report}
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
          />

        </div>
      ) : null}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DevPulse AI © 2026 — Comprehensive Multi-Signal Engineering Assessment Platform</span>
          <span className="text-[11px] font-mono text-cyan-400">Production App | Port 3005</span>
        </div>
      </footer>

    </div>
  );
}
