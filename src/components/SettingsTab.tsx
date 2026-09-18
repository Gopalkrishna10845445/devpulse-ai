'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Cpu,
  GitPullRequest,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Database,
  Lock,
  ExternalLink,
  Info,
} from 'lucide-react';

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  uptimeSeconds: number;
  environment: string;
  timestamp: string;
  dependencies: {
    githubApi: {
      configured: boolean;
      mode: string;
    };
    aiEngine: {
      configured: boolean;
      provider: string;
    };
    webhooks: {
      configured: boolean;
      signatureVerification: string;
    };
    vectorStore: {
      isLoaded: boolean;
      cachedRepositories: number;
    };
    jobManager: {
      activeJobs: number;
      totalCompletedJobs: number;
    };
  };
}

export const SettingsTab: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchHealthStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`Health endpoint returned status ${res.status}`);
      const data = (await res.json()) as HealthData;
      setHealth(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch live health metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
  }, []);

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h2 className="text-heading-md font-semibold text-text-primary">Settings & System Status</h2>
          <p className="text-body-sm text-text-muted mt-1">
            Authoritative status of GitHub integrations, AI providers, security guardrails, and indexing parameters.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-caption font-mono text-text-muted hidden sm:inline">
              Refreshed: {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchHealthStatus}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-md border border-border bg-surface text-body-sm font-medium text-text-primary hover:bg-surface-alt transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Check Status</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-body-sm text-red-600 flex items-start gap-2.5">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: GitHub API Integration */}
        <div className="p-5 rounded-md bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <Key size={16} className="text-text-primary" />
              <h3 className="text-body-sm font-semibold text-text-primary">GitHub REST API Integration</h3>
            </div>
            {health?.dependencies.githubApi.configured ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-green-500/10 text-semantic-green border border-green-500/20 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Authenticated</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-semantic-amber border border-amber-500/20 flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>Unauthenticated</span>
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-body-sm">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-secondary">Rate Limit Mode:</span>
              <span className="font-mono text-text-primary">
                {health?.dependencies.githubApi.mode || 'Detecting...'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-secondary">Token Scope:</span>
              <span className="font-mono text-text-primary">public_repo (Read-only)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-secondary">Environment Variable:</span>
              <span className="font-mono text-text-muted">GITHUB_TOKEN in .env.local</span>
            </div>
          </div>
        </div>

        {/* Card 2: AI Provider & Grounding */}
        <div className="p-5 rounded-md bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <Cpu size={16} className="text-text-primary" />
              <h3 className="text-body-sm font-semibold text-text-primary">AI Provider & Codebase Grounding</h3>
            </div>
            {health?.dependencies.aiEngine.configured ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-green-500/10 text-semantic-green border border-green-500/20 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Live Model</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-alt text-text-secondary border border-border flex items-center gap-1">
                <Info size={12} />
                <span>Deterministic Fallback</span>
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-body-sm">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-secondary">Active Engine:</span>
              <span className="font-mono text-text-primary uppercase">
                {health?.dependencies.aiEngine.provider || 'Deterministic Synthesizer'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-secondary">Grounding Enforcement:</span>
              <span className="font-mono text-semantic-green">100% Verified Citations</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-secondary">Supported Keys:</span>
              <span className="font-mono text-text-muted">GEMINI_API_KEY / OPENAI_API_KEY</span>
            </div>
          </div>
        </div>

        {/* Card 3: Webhook Verification & Background Jobs */}
        <div className="p-5 rounded-md bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <Zap size={16} className="text-text-primary" />
              <h3 className="text-body-sm font-semibold text-text-primary">GitHub Webhooks & Events</h3>
            </div>
            {health?.dependencies.webhooks.configured ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-green-500/10 text-semantic-green border border-green-500/20 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>HMAC-SHA256 Enforced</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-alt text-text-secondary border border-border flex items-center gap-1">
                <span>Secret Unconfigured</span>
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-body-sm">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-secondary">Replay Protection:</span>
              <span className="font-mono text-semantic-green">X-GitHub-Delivery Dedupe</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-secondary">Active / Queued Jobs:</span>
              <span className="font-mono text-text-primary">
                {health?.dependencies.jobManager.activeJobs ?? 0}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-secondary">Processed Deliveries:</span>
              <span className="font-mono text-text-primary">
                {health?.dependencies.jobManager.totalCompletedJobs ?? 0} completed
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Repository Ingestion & Vector Store */}
        <div className="p-5 rounded-md bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <Database size={16} className="text-text-primary" />
              <h3 className="text-body-sm font-semibold text-text-primary">Repository Ingestion & Indexing</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-green-500/10 text-semantic-green border border-green-500/20 flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>Ready</span>
            </span>
          </div>

          <div className="space-y-2.5 text-body-sm">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-secondary">Max File Traversal:</span>
              <span className="font-mono text-text-primary">2,000 files / repo</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-text-secondary">Max Single File Size:</span>
              <span className="font-mono text-text-primary">256 KB</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-text-secondary">Supported AST Parsers:</span>
              <span className="font-mono text-text-primary">TS, JS, Python, Go</span>
            </div>
          </div>
        </div>
      </div>

      {/* Safety & Guardrails Section */}
      <div className="p-5 rounded-md bg-surface border border-border space-y-5">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <Shield size={18} className="text-text-primary" />
          <div>
            <h3 className="text-heading-sm font-semibold text-text-primary">DevPilot Agent Safety Guardrails</h3>
            <p className="text-caption text-text-muted">Enforced at runtime across all ReAct planning loops and tool executions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-md bg-surface-alt border border-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-text-primary">Read-Only Default</span>
              <Lock size={13} className="text-semantic-green" />
            </div>
            <p className="text-caption text-text-muted">Write operations require explicit human approval gates.</p>
          </div>

          <div className="p-3.5 rounded-md bg-surface-alt border border-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-text-primary">Execution Bounds</span>
              <Terminal size={13} className="text-text-secondary" />
            </div>
            <p className="text-caption text-text-muted">Max 8 steps, 10 tool calls, and 30s timeout per session.</p>
          </div>

          <div className="p-3.5 rounded-md bg-surface-alt border border-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-text-primary">Stale SHA Protection</span>
              <GitPullRequest size={13} className="text-text-secondary" />
            </div>
            <p className="text-caption text-text-muted">Invalidates pending proposals if base commit SHA advances.</p>
          </div>

          <div className="p-3.5 rounded-md bg-surface-alt border border-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-text-primary">Secret Redaction</span>
              <Lock size={13} className="text-semantic-green" />
            </div>
            <p className="text-caption text-text-muted">Zero-leak masking ([REDACTED_SECRET]) across all logs and prompts.</p>
          </div>

          <div className="p-3.5 rounded-md bg-surface-alt border border-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-text-primary">Prompt Injection Defense</span>
              <Shield size={13} className="text-semantic-green" />
            </div>
            <p className="text-caption text-text-muted">Strict XML boundary framing and regex attack screening.</p>
          </div>

          <div className="p-3.5 rounded-md bg-surface-alt border border-border space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-text-primary">Command Allowlist</span>
              <Terminal size={13} className="text-text-secondary" />
            </div>
            <p className="text-caption text-text-muted">Restricted strictly to safe validation commands (tsc, vitest, lint).</p>
          </div>
        </div>
      </div>

      {/* Application Metadata & System Info */}
      <div className="p-5 rounded-md bg-surface border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-body-sm">
        <div className="space-y-1">
          <span className="font-semibold text-text-primary">DevPilot Platform</span>
          <span className="text-text-muted block text-caption">
            AI-powered Developer & Codebase Intelligence Platform • v1.0.0 (Production)
          </span>
        </div>
        <div className="flex items-center gap-4 text-caption font-mono text-text-muted">
          <span>Uptime: {health ? formatUptime(health.uptimeSeconds) : '—'}</span>
          <span>•</span>
          <span>Node.js: v20+</span>
          <span>•</span>
          <span>Port: :3005</span>
        </div>
      </div>
    </div>
  );
};
