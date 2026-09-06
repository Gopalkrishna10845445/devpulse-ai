'use client';

import React, { useState } from 'react';
import { CANDIDATE_PRESETS } from '@/lib/mockData';

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
    <div className="w-full">
      <div className="p-5 rounded-xl bg-[#131315] border border-white/10 space-y-4">
        
        {/* Mode Selector */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preset')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'preset'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-[#8e9192] hover:text-white'
              }`}
            >
              1-Click Candidate Presets
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'custom'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-[#8e9192] hover:text-white'
              }`}
            >
              Custom Resume & GitHub
            </button>
          </div>

          <span className="text-[11px] font-mono text-[#8e9192] hidden sm:block">Zero Friction Testing</span>
        </div>

        {/* TAB 1: PRESETS */}
        {activeTab === 'preset' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CANDIDATE_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => onSelectPreset(preset.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[#1c1b1d] border-cyan-500/50 text-white shadow-sm'
                      : 'bg-[#0e0e10] border-white/10 hover:border-white/20 text-[#c4c7c8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-xs text-white">{preset.name}</div>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#131315] text-cyan-300 border border-white/10">
                      {preset.experienceLevel}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#8e9192] line-clamp-2 mb-2 leading-relaxed">
                    {preset.summary}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono text-[#8e9192]">
                    <span>@{preset.githubUsername}</span>
                    <span>{preset.roleTitle}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: CUSTOM FORM */}
        {activeTab === 'custom' && (
          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-[#8e9192] uppercase mb-1">
                  GitHub Profile URL or Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. torvalds or https://github.com/alexrivera-dev"
                  value={customGithubUsername}
                  onChange={(e) => setCustomGithubUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0e0e10] border border-white/10 text-xs text-white focus:outline-none focus:border-white/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8e9192] uppercase mb-1">
                  Target Engineering Role Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Full-Stack Engineer"
                  value={targetRoleTitle}
                  onChange={(e) => setTargetRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0e0e10] border border-white/10 text-xs text-white focus:outline-none focus:border-white/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#8e9192] uppercase mb-1">
                Resume Content (Plain Text or Markdown)
              </label>
              <textarea
                rows={5}
                placeholder="Paste full candidate resume text here..."
                value={customResumeText}
                onChange={(e) => setCustomResumeText(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-[#0e0e10] border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-white/40 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isEvaluating || customResumeText.trim().length < 40}
              className="w-full py-2.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">travel_explore</span>
              <span>Run Live Engineering Evaluation</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
