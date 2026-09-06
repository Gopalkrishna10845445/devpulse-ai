'use client';

import React from 'react';
import { DeterministicMetrics } from '@/lib/types';

interface ATSBreakdownTabProps {
  deterministic: DeterministicMetrics;
}

export const ATSBreakdownTab: React.FC<ATSBreakdownTabProps> = ({ deterministic }) => {
  return (
    <div className="w-full flex flex-col space-y-4 stagger-fade-up">
      
      {/* Top Title */}
      <div className="pt-2 pb-2">
        <h2 className="font-headline text-2xl font-semibold text-on-surface mb-1">ATS & Metric Heuristics</h2>
        <p className="text-xs text-on-surface-variant">Deterministic Parser Audit & Quantification Density</p>
      </div>

      {/* Top ATS Heuristic Scores */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        
        <div className="p-4 rounded-xl bg-surface border border-border-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-on-surface-variant">ATS Structure</p>
            <p className="text-xl font-headline font-bold text-on-surface">{deterministic.atsComplianceScore}/100</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-on-surface-variant">assignment_turned_in</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-on-surface-variant">Quantification</p>
            <p className="text-xl font-headline font-bold text-on-surface">{deterministic.quantificationScore}/100</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-on-surface-variant">analytics</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-on-surface-variant">Action Verb Score</p>
            <p className="text-xl font-headline font-bold text-on-surface">{deterministic.actionVerbScore}/100</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-on-surface-variant">bolt</span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-on-surface-variant">Section Health</p>
            <p className="text-xl font-headline font-bold text-on-surface">{deterministic.sectionHealthScore}/100</p>
          </div>
          <span className="material-symbols-outlined text-[24px] text-on-surface-variant">health_and_safety</span>
        </div>

      </div>

      {/* Contact Profile Validation */}
      <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-semantic-emerald">contact_page</span>
          <span>Contact Info & Profile Validation</span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className={`p-3 rounded-lg flex items-center justify-between border ${deterministic.hasEmail ? 'bg-semantic-emerald/10 border-semantic-emerald/30 text-emerald-400' : 'bg-semantic-red/10 border-semantic-red/30 text-red-400'}`}>
            <span>Email</span>
            <span className="font-semibold">{deterministic.hasEmail ? 'Detected' : 'Missing'}</span>
          </div>

          <div className={`p-3 rounded-lg flex items-center justify-between border ${deterministic.hasPhone ? 'bg-semantic-emerald/10 border-semantic-emerald/30 text-emerald-400' : 'bg-semantic-red/10 border-semantic-red/30 text-red-400'}`}>
            <span>Phone</span>
            <span className="font-semibold">{deterministic.hasPhone ? 'Detected' : 'Missing'}</span>
          </div>

          <div className={`p-3 rounded-lg flex items-center justify-between border ${deterministic.hasLinkedIn ? 'bg-semantic-emerald/10 border-semantic-emerald/30 text-emerald-400' : 'bg-semantic-amber/10 border-semantic-amber/30 text-amber-400'}`}>
            <span>LinkedIn</span>
            <span className="font-semibold">{deterministic.hasLinkedIn ? 'Detected' : 'Missing'}</span>
          </div>

          <div className={`p-3 rounded-lg flex items-center justify-between border ${deterministic.hasGitHub ? 'bg-semantic-emerald/10 border-semantic-emerald/30 text-emerald-400' : 'bg-semantic-red/10 border-semantic-red/30 text-red-400'}`}>
            <span>GitHub</span>
            <span className="font-semibold">{deterministic.hasGitHub ? 'Detected' : 'Missing'}</span>
          </div>
        </div>
      </div>

      {/* Extracted Metrics */}
      <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">data_thresholding</span>
            <span>Extracted Impact Metrics ({deterministic.metricCount})</span>
          </h4>
          <span className="text-[11px] text-on-surface-variant">Regex: %, $, Latency ms, Scale</span>
        </div>

        {deterministic.extractedMetrics.length === 0 ? (
          <p className="text-xs text-semantic-amber italic">No quantifiable metrics detected in resume text.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {deterministic.extractedMetrics.map((m, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-surface-container-lowest border border-border-subtle flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-surface-container-high border border-border-subtle font-mono font-bold text-[11px] text-primary">
                  {m.raw}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-on-surface-variant font-semibold uppercase">{m.type}</p>
                  <p className="text-on-surface truncate text-[11px]">{m.contextSnippet}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Power Action Verbs */}
      <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-semantic-emerald">electric_bolt</span>
          <span>Power Action Verb Categorization</span>
        </h4>

        <div className="flex flex-wrap gap-2 text-xs">
          {deterministic.powerVerbs.map((verb, idx) => {
            const isWeak = verb.category === 'WeakPassive';
            return (
              <span
                key={idx}
                className={`px-3 py-1 rounded-full border flex items-center gap-1.5 font-medium text-[11px] ${
                  isWeak
                    ? 'bg-semantic-red/10 border-semantic-red/30 text-red-400'
                    : 'bg-semantic-emerald/10 border-semantic-emerald/30 text-emerald-400'
                }`}
              >
                <span>{verb.word}</span>
                <span className="text-[9px] opacity-70 uppercase">({verb.category})</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Directives & Warnings */}
      {deterministic.warnings.length > 0 && (
        <div className="p-5 rounded-xl bg-surface border border-semantic-amber/30 text-on-surface space-y-2">
          <h4 className="text-xs font-semibold text-semantic-amber uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            <span>ATS Directives & Improvement Steps</span>
          </h4>
          <ul className="space-y-1 text-xs text-on-surface-variant">
            {deterministic.warnings.map((w, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-semantic-amber">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
};
