'use client';

import React, { useState } from 'react';
import { NavSection } from './Sidebar';
import {
  Bot,
  Code2,
  MessageSquare,
  BarChart3,
  Shield,
  GitPullRequest,
  Zap,
  ArrowRight,
  Search,
  CheckCircle2,
  Terminal,
  Cpu,
  Layers,
} from 'lucide-react';

interface OverviewTabProps {
  onNavigateSection: (section: NavSection) => void;
  currentRepo: string;
  onSelectRepo: (repo: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  onNavigateSection,
  currentRepo,
  onSelectRepo,
}) => {
  const [repoInput, setRepoInput] = useState(currentRepo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoInput.trim()) {
      onSelectRepo(repoInput.trim());
    }
  };

  const capabilities = [
    {
      id: 'agent' as NavSection,
      title: 'DevPilot Agent',
      icon: <Bot size={20} className="text-text-primary" />,
      tag: 'Autonomous',
      description: 'ReAct Plan-and-Solve developer agent for deep codebase exploration, automated patch generation, and review validation.',
      badge: 'Human-in-the-Loop',
    },
    {
      id: 'codebase' as NavSection,
      title: 'Codebase Intelligence',
      icon: <Code2 size={20} className="text-text-primary" />,
      tag: 'AST Parser',
      description: 'Multi-language AST symbol extraction (TS, JS, Python, Go), cross-file import graphs, and architecture topology classification.',
      badge: 'Deterministic',
    },
    {
      id: 'qa' as NavSection,
      title: 'Grounded Q&A (RAG)',
      icon: <MessageSquare size={20} className="text-text-primary" />,
      tag: 'Semantic Search',
      description: 'Commit-aware vector chunk retrieval with strict verification and line-level file citations (file:start-end).',
      badge: 'Zero Hallucination',
    },
    {
      id: 'engineering' as NavSection,
      title: 'Engineering Intelligence',
      icon: <BarChart3 size={20} className="text-text-primary" />,
      tag: 'Architecture',
      description: 'Circular dependency cycle detection (Tarjan SCC), architectural layer boundaries, god-file hotspots, and maintainability scores.',
      badge: 'Rule Engine',
    },
    {
      id: 'security' as NavSection,
      title: 'Security Intelligence',
      icon: <Shield size={20} className="text-text-primary" />,
      tag: 'Vulnerability Scan',
      description: '6-layer deterministic secret and vulnerability scanner covering high-entropy cloud keys, SQLi, SSRF, and insecure configurations.',
      badge: 'Zero Leakage',
    },
    {
      id: 'pullrequests' as NavSection,
      title: 'Pull Request Review',
      icon: <GitPullRequest size={20} className="text-text-primary" />,
      tag: 'Diff Impact',
      description: 'Automated unified diff parsing, modified symbol mapping, downstream caller blast radius, and review findings.',
      badge: 'SHA Aware',
    },
    {
      id: 'events' as NavSection,
      title: 'Events & Webhooks',
      icon: <Zap size={20} className="text-text-primary" />,
      tag: 'Real-time',
      description: 'HMAC-SHA256 signature verification (X-Hub-Signature-256), delivery replay protection, and background event queueing.',
      badge: 'Cryptographic',
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Target Repository Hero */}
      <div className="p-6 rounded-md bg-surface border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-heading-md font-semibold text-text-primary">Repository Intelligence Hub</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/10 text-semantic-green border border-green-500/20">
                Active
              </span>
            </div>
            <p className="text-body-sm text-text-muted mt-1">
              Select or enter any target GitHub repository to run structural indexing, security audits, and agent workflows.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="owner/repository (e.g. Gopalkrishna10845445/devpulse-ai)"
              className="w-full pl-9 pr-3 py-2 rounded-md bg-surface-alt border border-border text-body-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-text-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-text-primary text-white text-body-sm font-medium hover:bg-text-secondary transition-colors"
          >
            Set Target
          </button>
        </form>

        <div className="flex items-center gap-2 pt-1 text-caption text-text-muted font-mono">
          <span>Active Target:</span>
          <span className="text-text-primary font-semibold">{currentRepo}</span>
        </div>
      </div>

      {/* Core Capabilities Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-body-sm font-semibold text-text-primary uppercase tracking-wider font-mono">
            Intelligence Modules
          </h3>
          <span className="text-caption font-mono text-text-muted">7 Active Subsystems</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {capabilities.map((cap) => (
            <div
              key={cap.id}
              onClick={() => onNavigateSection(cap.id)}
              className="p-5 rounded-md bg-surface border border-border hover:border-border-strong transition-all cursor-pointer group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {cap.icon}
                    <h4 className="text-body-sm font-semibold text-text-primary group-hover:underline">
                      {cap.title}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-alt text-text-secondary border border-border">
                    {cap.badge}
                  </span>
                </div>
                <p className="text-body-sm text-text-secondary line-clamp-2">
                  {cap.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-caption text-text-muted">
                <span className="font-mono">{cap.tag}</span>
                <div className="flex items-center gap-1 text-text-primary font-medium group-hover:translate-x-0.5 transition-transform">
                  <span>Open Module</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architectural Guarantees */}
      <div className="p-5 rounded-md bg-surface border border-border space-y-4">
        <h3 className="text-body-sm font-semibold text-text-primary font-mono uppercase tracking-wider">
          Platform Guarantees
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-body-sm">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-semantic-green mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-text-primary block">Deterministic First</span>
              <span className="text-caption text-text-muted">AST graphs, circular cycles, and secret scans are 100% deterministic without LLM hallucination.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-semantic-green mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-text-primary block">Bounded Agent Safety</span>
              <span className="text-caption text-text-muted">Read-only default with human-in-the-loop write gates, 8-step limits, and stale SHA rejection.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-semantic-green mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-text-primary block">Zero-Leak Redaction</span>
              <span className="text-caption text-text-muted">Automatic masking of all credentials across vector embeddings, prompts, logs, and UI viewers.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
