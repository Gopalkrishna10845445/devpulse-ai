'use client';

import React from 'react';
import { DeterministicMetrics } from '@/lib/types';

interface EngineeringHealthTabProps {
  deterministic: DeterministicMetrics;
}

export const EngineeringHealthTab: React.FC<EngineeringHealthTabProps> = ({ deterministic }) => {
  return (
    <div className="w-full flex flex-col space-y-6 stagger-fade-up">
      
      {/* Header */}
      <div>
        <h2 className="text-heading-lg text-text-primary">Text & metric heuristics</h2>
        <p className="text-body-sm text-text-muted mt-1">Deterministic parser audit — resume text structure, quantification density, and verb quality</p>
      </div>

      {/* Top Scores */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { label: 'Contact structure', value: deterministic.atsComplianceScore },
          { label: 'Quantification', value: deterministic.quantificationScore },
          { label: 'Action verbs', value: deterministic.actionVerbScore },
          { label: 'Section health', value: deterministic.sectionHealthScore },
        ].map((item, idx) => (
          <div key={idx} className="p-4 bg-surface border border-border rounded-md">
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{item.label}</p>
            <p className="text-xl font-mono font-semibold text-text-primary mt-1">{item.value}/100</p>
          </div>
        ))}
      </div>

      {/* Contact Profile Validation */}
      <div className="bg-surface border border-border rounded-md p-5 space-y-3">
        <h4 className="text-[11px] font-mono text-text-muted uppercase tracking-wider">Contact info & profile links</h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-caption">
          {[
            { label: 'Email', detected: deterministic.hasEmail },
            { label: 'Phone', detected: deterministic.hasPhone },
            { label: 'LinkedIn', detected: deterministic.hasLinkedIn },
            { label: 'GitHub', detected: deterministic.hasGitHub },
          ].map((field, idx) => (
            <div key={idx} className={`p-3 rounded-md flex items-center justify-between border ${
              field.detected ? 'bg-green-50 border-green-200 text-semantic-green' : 'bg-red-50 border-red-200 text-semantic-red'
            }`}>
              <span>{field.label}</span>
              <span className="font-medium">{field.detected ? 'Detected' : 'Missing'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Extracted Metrics */}
      <div className="bg-surface border border-border rounded-md p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
            Extracted impact metrics ({deterministic.metricCount})
          </h4>
          <span className="text-[10px] font-mono text-text-muted">Regex: %, $, Latency ms, Scale</span>
        </div>

        {deterministic.extractedMetrics.length === 0 ? (
          <p className="text-caption text-semantic-amber italic">No quantifiable metrics detected in resume text.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {deterministic.extractedMetrics.map((m, idx) => (
              <div key={idx} className="p-3 rounded-md bg-surface-alt border border-border flex items-start gap-3">
                <span className="px-2 py-0.5 rounded-sm bg-surface border border-border font-mono font-medium text-[11px] text-text-primary">
                  {m.raw}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-text-muted uppercase">{m.type}</p>
                  <p className="text-caption text-text-secondary truncate">{m.contextSnippet}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Power Action Verbs */}
      <div className="bg-surface border border-border rounded-md p-5 space-y-3">
        <h4 className="text-[11px] font-mono text-text-muted uppercase tracking-wider">Power action verb categorization</h4>

        <div className="flex flex-wrap gap-2">
          {deterministic.powerVerbs.map((verb, idx) => {
            const isWeak = verb.category === 'WeakPassive';
            return (
              <span
                key={idx}
                className={`px-3 py-1 rounded-md border flex items-center gap-1.5 font-medium text-[11px] ${
                  isWeak
                    ? 'bg-red-50 border-red-200 text-semantic-red'
                    : 'bg-green-50 border-green-200 text-semantic-green'
                }`}
              >
                <span>{verb.word}</span>
                <span className="text-[9px] opacity-70 uppercase">({verb.category})</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Warnings */}
      {deterministic.warnings.length > 0 && (
        <div className="bg-surface border border-semantic-amber rounded-md p-5 space-y-2">
          <h4 className="text-[11px] font-mono text-semantic-amber uppercase tracking-wider">Improvement directives</h4>
          <ul className="space-y-1 text-caption text-text-secondary">
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
