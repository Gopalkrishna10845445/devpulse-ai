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
      <div className="bg-surface border border-border rounded-md p-4 space-y-4">
        
        {/* Mode Selector */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('preset')}
              className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
                activeTab === 'preset'
                  ? 'bg-surface-alt text-text-primary border border-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Demo fixtures
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
                activeTab === 'custom'
                  ? 'bg-surface-alt text-text-primary border border-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Custom resume & GitHub
            </button>
          </div>

          <span className="text-[10px] font-mono text-text-muted hidden sm:block">Demo data is labeled</span>
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
                  className={`p-4 rounded-md cursor-pointer transition-colors border ${
                    isSelected
                      ? 'bg-surface-alt border-border-strong text-text-primary'
                      : 'bg-surface border-border hover:border-border-strong text-text-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-body-sm text-text-primary">{preset.name}</div>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-sm bg-surface-alt border border-border text-text-muted">
                      {preset.experienceLevel}
                    </span>
                  </div>

                  <p className="text-caption text-text-muted line-clamp-2 mb-2 leading-relaxed">
                    {preset.summary}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-border text-[10px] font-mono text-text-muted">
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
                <label className="block text-[11px] font-mono text-text-muted uppercase mb-1">
                  GitHub Profile URL or Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. torvalds or https://github.com/username"
                  value={customGithubUsername}
                  onChange={(e) => setCustomGithubUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-surface-alt border border-border text-body-sm text-text-primary focus:outline-none focus:border-border-strong font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-text-muted uppercase mb-1">
                  Target Engineering Role Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Full-Stack Engineer"
                  value={targetRoleTitle}
                  onChange={(e) => setTargetRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-surface-alt border border-border text-body-sm text-text-primary focus:outline-none focus:border-border-strong"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-text-muted uppercase mb-1">
                Resume Content (Plain Text or Markdown)
              </label>
              <textarea
                rows={5}
                placeholder="Paste source text (resume or notes). Not treated as live GitHub telemetry."
                value={customResumeText}
                onChange={(e) => setCustomResumeText(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md bg-surface-alt border border-border text-body-sm font-mono text-text-primary focus:outline-none focus:border-border-strong leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isEvaluating || customResumeText.trim().length < 40}
              className="w-full py-2.5 rounded-md bg-text-primary text-white font-medium text-body-sm hover:bg-text-secondary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Run live engineering evaluation
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
