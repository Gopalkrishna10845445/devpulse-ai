'use client';

import React from 'react';
import { DeterministicMetrics } from '@/lib/types';
import { ShieldCheck, Mail, Phone, Linkedin, Github, FileCheck, Zap, AlertCircle, TrendingUp } from 'lucide-react';

interface ATSBreakdownTabProps {
  deterministic: DeterministicMetrics;
}

export const ATSBreakdownTab: React.FC<ATSBreakdownTabProps> = ({ deterministic }) => {
  return (
    <div className="space-y-6">
      
      {/* Top ATS Heuristic Scores */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        <div className="glass-card p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">ATS Structure</p>
            <p className="text-xl font-extrabold text-cyan-400 font-mono">{deterministic.atsComplianceScore}/100</p>
          </div>
          <FileCheck className="w-6 h-6 text-cyan-400 opacity-80" />
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Quantification Score</p>
            <p className="text-xl font-extrabold text-purple-400 font-mono">{deterministic.quantificationScore}/100</p>
          </div>
          <Zap className="w-6 h-6 text-purple-400 opacity-80" />
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Action Verb Score</p>
            <p className="text-xl font-extrabold text-emerald-400 font-mono">{deterministic.actionVerbScore}/100</p>
          </div>
          <TrendingUp className="w-6 h-6 text-emerald-400 opacity-80" />
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Section Health</p>
            <p className="text-xl font-extrabold text-amber-400 font-mono">{deterministic.sectionHealthScore}/100</p>
          </div>
          <ShieldCheck className="w-6 h-6 text-amber-400 opacity-80" />
        </div>

      </div>

      {/* Contact & Structure Check */}
      <div className="glass-card p-6 rounded-xl border border-slate-800">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" /> ATS Contact & Profile Validation
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className={`p-3 rounded-lg flex items-center space-x-2 border ${deterministic.hasEmail ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
            <Mail className="w-4 h-4" />
            <span>Email: {deterministic.hasEmail ? 'Detected' : 'Missing'}</span>
          </div>

          <div className={`p-3 rounded-lg flex items-center space-x-2 border ${deterministic.hasPhone ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
            <Phone className="w-4 h-4" />
            <span>Phone: {deterministic.hasPhone ? 'Detected' : 'Missing'}</span>
          </div>

          <div className={`p-3 rounded-lg flex items-center space-x-2 border ${deterministic.hasLinkedIn ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-amber-950/20 border-amber-500/30 text-amber-300'}`}>
            <Linkedin className="w-4 h-4" />
            <span>LinkedIn: {deterministic.hasLinkedIn ? 'Detected' : 'Missing'}</span>
          </div>

          <div className={`p-3 rounded-lg flex items-center space-x-2 border ${deterministic.hasGitHub ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/20 border-rose-500/30 text-rose-300'}`}>
            <Github className="w-4 h-4" />
            <span>GitHub: {deterministic.hasGitHub ? 'Detected' : 'Missing'}</span>
          </div>
        </div>
      </div>

      {/* Extracted Metrics via Regex */}
      <div className="glass-card p-6 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" /> Extracted Quantifiable Metrics ({deterministic.metricCount})
          </h4>
          <span className="text-[11px] text-slate-400">Regex match: Percentages, $, Latency, Volume</span>
        </div>

        {deterministic.extractedMetrics.length === 0 ? (
          <p className="text-xs text-amber-400 italic">No quantifiable metrics detected in resume text.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {deterministic.extractedMetrics.map((m, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start space-x-3">
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold text-[11px]">
                  {m.raw}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">{m.type}</p>
                  <p className="text-slate-300 truncate text-[11px]">{m.contextSnippet}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Power Action Verb Breakdown */}
      <div className="glass-card p-6 rounded-xl border border-slate-800">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" /> Power Action Verb Categorization
        </h4>

        <div className="flex flex-wrap gap-2 text-xs">
          {deterministic.powerVerbs.map((verb, idx) => {
            const isWeak = verb.category === 'WeakPassive';
            return (
              <span
                key={idx}
                className={`px-3 py-1 rounded-full border flex items-center space-x-1.5 font-medium text-[11px] ${
                  isWeak
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                }`}
              >
                <span>{verb.word}</span>
                <span className="text-[9px] opacity-70 uppercase">({verb.category})</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Warnings & Suggestions */}
      {deterministic.warnings.length > 0 && (
        <div className="glass-card p-6 rounded-xl border border-amber-500/30 bg-amber-950/10">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> ATS Improvement Directives
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {deterministic.warnings.map((w, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                <span className="text-amber-400">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
};
