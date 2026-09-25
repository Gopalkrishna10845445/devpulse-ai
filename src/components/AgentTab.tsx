/**
 * Phase 10 — DevPilot Autonomous Developer Agent Interface
 *
 * Provides a controlled, observable developer agent interface with:
 * - Activity timeline showing bounded state transitions
 * - Grounded multi-section response viewer (FACT / INFERENCE / RECOMMENDATION / ACTION)
 * - Interactive citations and evidence inspector
 * - Human-in-the-loop patch approval and diff review modal
 */

'use client';

import React, { useState } from 'react';
import {
  AgentActivityStep,
  AgentMode,
  AgentProposedAction,
  AgentResponse,
  ResponseTrustLevel,
} from '@/lib/agent/types';
import { normalizeErrorMessage } from '@/lib/errorUtils';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Cpu,
  FileCode2,
  FolderGit2,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Layers,
  Lock,
  Play,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from 'lucide-react';

interface AgentTabProps {
  initialRepoFullName?: string;
}

const PRESET_WORKFLOWS = [
  {
    mode: 'EXPLAIN' as AgentMode,
    label: 'Explain Architecture',
    prompt: 'Explain the architecture and module boundaries of this repository.',
    icon: <Layers size={14} />,
  },
  {
    mode: 'SECURITY' as AgentMode,
    label: 'Audit Security',
    prompt: 'Audit the repository for hardcoded secrets, unsafe code patterns, and CVEs.',
    icon: <Shield size={14} />,
  },
  {
    mode: 'ENGINEERING' as AgentMode,
    label: 'Engineering Risks',
    prompt: 'What are the main engineering risks, hotspots, and coupling issues?',
    icon: <Cpu size={14} />,
  },
  {
    mode: 'INVESTIGATE' as AgentMode,
    label: 'Investigate Auth',
    prompt: 'Investigate how authentication and request authorization are implemented.',
    icon: <Search size={14} />,
  },
  {
    mode: 'FIX' as AgentMode,
    label: 'Propose Fix',
    prompt: 'Propose a code fix for identified security and maintainability findings.',
    icon: <Code2 size={14} />,
  },
];

export const AgentTab: React.FC<AgentTabProps> = ({
  initialRepoFullName = 'Gopalkrishna10845445/devpulse-ai',
}) => {
  const [repositoryId, setRepositoryId] = useState(initialRepoFullName);
  const [commitSha, setCommitSha] = useState('main');
  const [userMessage, setUserMessage] = useState('');
  const [activeMode, setActiveMode] = useState<AgentMode | undefined>(undefined);
  const [isRunning, setIsRunning] = useState(false);
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize when switching repositories
  React.useEffect(() => {
    setRepositoryId(initialRepoFullName);
    setAgentResponse(null);
    setErrorMessage(null);
  }, [initialRepoFullName]);

  // Approval state
  const [approvingActionId, setApprovingActionId] = useState<string | null>(null);
  const [approvalFeedback, setApprovalFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleRunAgent = async (overridePrompt?: string, overrideMode?: AgentMode) => {
    const promptToRun = overridePrompt !== undefined ? overridePrompt : userMessage;
    const modeToRun = overrideMode !== undefined ? overrideMode : activeMode;

    if (!repositoryId.trim() || !promptToRun.trim()) {
      setErrorMessage('Please provide both repository and a message.');
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);
    setApprovalFeedback(null);

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: repositoryId.trim(),
          commitSha: commitSha.trim() || 'main',
          userMessage: promptToRun.trim(),
          requestedMode: modeToRun,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAgentResponse(data);
      } else {
        setErrorMessage(normalizeErrorMessage(data?.error || data?.details, 'Agent execution failed.'));
      }
    } catch (err: any) {
      setErrorMessage(normalizeErrorMessage(err?.message, 'Network error during agent execution.'));
    } finally {
      setIsRunning(false);
    }
  };

  const handleApprovalDecision = async (
    action: AgentProposedAction,
    decision: 'approve' | 'reject'
  ) => {
    if (!agentResponse) return;
    setApprovingActionId(action.id);
    setApprovalFeedback(null);

    try {
      const res = await fetch('/api/agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traceId: agentResponse.traceId,
          actionId: action.id,
          repositoryId: action.targetRepository,
          commitSha: action.targetCommit,
          expectedDiffHash: action.diffHash,
          decision,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setApprovalFeedback({ success: true, message: data.message });
        // Update local response action status
        setAgentResponse({
          ...agentResponse,
          approvalRequired: false,
          actions: agentResponse.actions.map((a) =>
            a.id === action.id ? { ...a, status: decision === 'approve' ? 'executed' : 'rejected' } : a
          ),
        });
      } else {
        setApprovalFeedback({
          success: false,
          message: data.error || data.message || 'Approval execution failed.',
        });
      }
    } catch (err: any) {
      setApprovalFeedback({ success: false, message: err.message || 'Network error during approval.' });
    } finally {
      setApprovingActionId(null);
    }
  };

  const getTrustBadgeStyle = (level: ResponseTrustLevel) => {
    switch (level) {
      case 'FACT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'INFERENCE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'RECOMMENDATION':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'ACTION':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'REQUIRES_APPROVAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-surface-alt text-text-muted border-border';
    }
  };

  const getStateBadgeStyle = (state: string) => {
    switch (state) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'awaiting_approval':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'blocked':
      case 'failed':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-lg bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bot className="text-primary" size={22} />
            <h1 className="text-heading-lg text-text-primary">DevPilot Autonomous Agent</h1>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
              Phase 10 — Controlled Autonomy
            </span>
          </div>
          <p className="text-body-sm text-text-muted">
            Orchestrates codebase intelligence, security scanning, engineering telemetry, and grounded RAG into an observable developer workflow.
          </p>
        </div>

        {/* Read-Only Safety Pill */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface-alt border border-border text-xs text-text-muted">
          <Lock size={14} className="text-emerald-400" />
          <span>Default: <strong>Read-Only Guardrails</strong> (Writes require human approval)</span>
        </div>
      </div>

      {/* Target Repository & Prompt Controls */}
      <div className="p-5 rounded-lg bg-surface border border-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-body-xs text-text-muted mb-1 font-medium">Target Repository</label>
            <div className="relative">
              <FolderGit2 size={16} className="absolute left-3 top-2.5 text-text-muted" />
              <input
                type="text"
                value={repositoryId}
                onChange={(e) => setRepositoryId(e.target.value)}
                placeholder="owner/repo"
                className="w-full pl-9 pr-3 py-1.5 text-body-sm rounded-md bg-surface-alt border border-border text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-body-xs text-text-muted mb-1 font-medium">Commit / Branch</label>
            <div className="relative">
              <GitCommit size={16} className="absolute left-3 top-2.5 text-text-muted" />
              <input
                type="text"
                value={commitSha}
                onChange={(e) => setCommitSha(e.target.value)}
                placeholder="main or commit SHA"
                className="w-full pl-9 pr-3 py-1.5 text-body-sm rounded-md bg-surface-alt border border-border text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Workflow Presets */}
        <div>
          <label className="block text-body-xs text-text-muted mb-1.5 font-medium">Preset Workflows</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_WORKFLOWS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setUserMessage(p.prompt);
                  setActiveMode(p.mode);
                  handleRunAgent(p.prompt, p.mode);
                }}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-alt hover:bg-surface-alt/80 border border-border hover:border-primary/40 text-xs text-text-secondary transition-all disabled:opacity-50"
              >
                {p.icon}
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Box */}
        <div>
          <label className="block text-body-xs text-text-muted mb-1 font-medium">Developer Request</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isRunning && handleRunAgent()}
              placeholder="e.g. Why is authentication failing? Or: Review PR #1"
              className="flex-1 px-3 py-2 text-body-sm rounded-md bg-surface-alt border border-border text-text-primary focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => handleRunAgent()}
              disabled={isRunning || !userMessage.trim()}
              className="px-5 py-2 rounded-md bg-primary hover:bg-primary/90 text-white text-body-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isRunning ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
              <span>{isRunning ? 'Running...' : 'Ask Agent'}</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Main Results Display */}
      {agentResponse && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 cols): Response Sections + Approval Gate */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status & Mode Bar */}
            <div className="p-4 rounded-lg bg-surface border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStateBadgeStyle(agentResponse.status)}`}>
                  {agentResponse.status.toUpperCase()}
                </span>
                <span className="text-xs text-text-muted">
                  Mode: <strong className="text-text-primary">{agentResponse.mode}</strong>
                </span>
              </div>
              <span className="text-xs text-text-muted font-mono">Trace: {agentResponse.traceId}</span>
            </div>

            {/* Human-in-the-Loop Approval Banner if Write Action is Proposed */}
            {agentResponse.approvalRequired && agentResponse.pendingAction && (
              <div className="p-5 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="text-body-md font-semibold text-amber-300">
                      Human Approval Required: {agentResponse.pendingAction.title}
                    </h3>
                    <p className="text-xs text-amber-200/80 mt-1">
                      The agent formulated a remediation patch. Write execution is paused until authorized.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded bg-surface/80 border border-border text-xs space-y-1 font-mono">
                  <div>Target Repo: {agentResponse.pendingAction.targetRepository}</div>
                  <div>Target Commit: {agentResponse.pendingAction.targetCommit}</div>
                  <div>Affected Files: {agentResponse.pendingAction.affectedFiles.join(', ')}</div>
                  <div>Diff Hash: {agentResponse.pendingAction.diffHash}</div>
                </div>

                {agentResponse.pendingAction.unifiedDiff && (
                  <div className="rounded bg-black/60 p-3 text-xs font-mono overflow-x-auto border border-border/50 max-h-48">
                    <pre className="text-text-secondary">{agentResponse.pendingAction.unifiedDiff}</pre>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleApprovalDecision(agentResponse.pendingAction!, 'approve')}
                    disabled={approvingActionId === agentResponse.pendingAction.id}
                    className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {approvingActionId === agentResponse.pendingAction.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <ThumbsUp size={14} />
                    )}
                    <span>Approve & Apply Patch</span>
                  </button>

                  <button
                    onClick={() => handleApprovalDecision(agentResponse.pendingAction!, 'reject')}
                    disabled={approvingActionId === agentResponse.pendingAction.id}
                    className="px-4 py-2 rounded-md bg-surface-alt hover:bg-surface-alt/80 border border-border text-rose-400 text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <ThumbsDown size={14} />
                    <span>Reject Action</span>
                  </button>
                </div>

                {approvalFeedback && (
                  <div
                    className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                      approvalFeedback.success
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {approvalFeedback.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    <span>{approvalFeedback.message}</span>
                  </div>
                )}
              </div>
            )}

            {/* Structured Grounded Sections */}
            <div className="space-y-4">
              {agentResponse.sections.map((section, idx) => (
                <div key={idx} className="p-5 rounded-lg bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold tracking-wider rounded border ${getTrustBadgeStyle(
                          section.trustLevel
                        )}`}
                      >
                        {section.trustLevel}
                      </span>
                      <h3 className="text-body-md font-semibold text-text-primary">{section.heading}</h3>
                    </div>
                  </div>

                  <div className="text-body-sm text-text-secondary whitespace-pre-line leading-relaxed">
                    {section.content}
                  </div>

                  {section.citations && section.citations.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {section.citations.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-surface-alt border border-border text-[11px] font-mono text-primary"
                        >
                          <FileCode2 size={12} />
                          <span>
                            {c.filePath}
                            {c.startLine ? `:${c.startLine}-${c.endLine || c.startLine}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Activity Timeline & Citations */}
          <div className="space-y-6">
            {/* Activity Timeline */}
            <div className="p-5 rounded-lg bg-surface border border-border space-y-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                <h3 className="text-body-md font-semibold text-text-primary">Agent Activity Timeline</h3>
              </div>

              <div className="relative pl-4 space-y-4 border-l border-border/60">
                {agentResponse.activityTimeline.map((step) => (
                  <div key={step.stepIndex} className="relative group">
                    {/* Timeline dot */}
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary/80 ring-4 ring-surface" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-primary">{step.label}</span>
                        <span className="text-[10px] text-text-muted font-mono">{step.durationMs}ms</span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5">{step.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Citations & Verified Evidence */}
            <div className="p-5 rounded-lg bg-surface border border-border space-y-3">
              <div className="flex items-center gap-2">
                <FileCode2 size={16} className="text-emerald-400" />
                <h3 className="text-body-md font-semibold text-text-primary">Verified Citations</h3>
                <span className="text-xs px-1.5 py-0.5 rounded bg-surface-alt text-text-muted font-mono">
                  {agentResponse.citations.length}
                </span>
              </div>

              {agentResponse.citations.length === 0 ? (
                <p className="text-xs text-text-muted">No specific file citations referenced.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {agentResponse.citations.map((c, i) => (
                    <div key={i} className="p-2.5 rounded bg-surface-alt border border-border text-xs space-y-1">
                      <div className="font-mono text-primary flex items-center justify-between">
                        <span>{c.filePath}</span>
                        {c.startLine && (
                          <span className="text-[10px] text-text-muted">L{c.startLine}-{c.endLine || c.startLine}</span>
                        )}
                      </div>
                      {c.symbol && <div className="text-[11px] text-text-muted">Symbol: {c.symbol}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Execution Budget Summary */}
            <div className="p-4 rounded-lg bg-surface border border-border text-xs text-text-muted space-y-1.5">
              <div className="font-semibold text-text-primary mb-1">Execution Metrics</div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-mono text-text-secondary">{agentResponse.executionSummary.totalDurationMs} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Tool Calls:</span>
                <span className="font-mono text-text-secondary">{agentResponse.executionSummary.toolCallsCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Safety Budget:</span>
                <span className="font-mono text-emerald-400">PASSED</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
