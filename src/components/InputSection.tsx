'use client';

import React, { useState } from 'react';
import { CANDIDATE_PRESETS } from '@/lib/mockData';
import { Github, FileText, Sparkles, ArrowRight, UserCheck, CheckCircle2, ShieldAlert } from 'lucide-react';

interface InputSectionProps {
  onAnalyze: (resumeText: string, githubUsername: string, roleTitle: string) => void;
  onSelectPreset: (presetId: string) => void;
  isEvaluating: boolean;
  activePresetId?: string;
}

export const InputSection: React.FC<InputSectionProps> = ({
  onAnalyze,
  onSelectPreset,
  isEvaluating,
  activePresetId,
}) => {
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');
  const [customResumeText, setCustomResumeText] = useState('');
  const [customGithubUsername, setCustomGithubUsername] = useState('');
  const [targetRoleTitle, setTargetRoleTitle] = useState('Full-Stack Software Engineer');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customResumeText || customResumeText.trim().length < 40) return;
    onAnalyze(customResumeText, customGithubUsername, targetRoleTitle);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-12">
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        
        {/* Input Mode Selector Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('preset')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-2 ${
                activeTab === 'preset'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>1-Click Recruiter Presets</span>
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-2 ${
                activeTab === 'custom'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Custom Resume & GitHub</span>
            </button>
          </div>

          <span className="text-xs text-slate-500 hidden sm:block">Zero friction recruiter testing</span>
        </div>

        {/* TAB 1: PRESET CANDIDATES */}
        {activeTab === 'preset' && (
          <div>
            <p className="text-xs text-slate-400 mb-4">
              Select a preset candidate profile to immediately test DevPulse AI multi-signal assessment engine:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CANDIDATE_PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => onSelectPreset(preset.id)}
                    className={`cursor-pointer rounded-xl p-5 transition-all duration-200 border relative ${
                      isSelected
                        ? 'bg-slate-900/90 border-cyan-400/80 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                        : 'glass-card hover:border-slate-700'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 text-cyan-400">
                        <CheckCircle2 className="w-5 h-5 fill-cyan-500/20 text-cyan-400" />
                      </div>
                    )}

                    <div className="flex items-center space-x-3 mb-3">
                      <img
                        src={preset.avatar}
                        alt={preset.name}
                        className="w-11 h-11 rounded-full object-cover border border-slate-700"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-white">{preset.name}</h3>
                        <p className="text-xs text-cyan-400 font-medium">{preset.roleTitle}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 mb-3 leading-relaxed">
                      {preset.summary}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Github className="w-3.5 h-3.5 text-slate-400" /> @{preset.githubUsername}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {preset.experienceLevel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOM RESUME & GITHUB */}
        {activeTab === 'custom' && (
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Github className="w-4 h-4 text-purple-400" /> GitHub Profile URL or Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. torvalds or https://github.com/alexrivera-dev"
                  value={customGithubUsername}
                  onChange={(e) => setCustomGithubUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-cyan-400" /> Target Engineering Role Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Architect / Distributed Systems Engineer"
                  value={targetRoleTitle}
                  onChange={(e) => setTargetRoleTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" /> Plain Text or Markdown Resume Content
              </label>
              <textarea
                rows={6}
                placeholder="Paste full candidate resume text here (including contact info, experience bullets, technical skills)..."
                value={customResumeText}
                onChange={(e) => setCustomResumeText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isEvaluating || customResumeText.trim().length < 40}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isEvaluating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating Candidate Signals...</span>
                </>
              ) : (
                <>
                  <span>Run Custom Portfolio & ATS Evaluation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
