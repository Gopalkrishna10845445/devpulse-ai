/**
 * Phase 9 — Repository Events & Activity Stream Component
 *
 * Provides a real-time observability feed of incoming GitHub webhooks,
 * delivery verification statuses, and background analysis jobs with manual retry support.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  RepositoryAnalysisJob,
  WebhookDeliveryRecord,
  WebhookProcessingState,
} from '@/lib/webhook/types';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FolderGit2,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Key,
  Layers,
  RefreshCw,
  RotateCcw,
  Shield,
  Terminal,
  Zap,
} from 'lucide-react';

export const RepositoryEventsTab: React.FC = () => {
  const [deliveries, setDeliveries] = useState<WebhookDeliveryRecord[]>([]);
  const [jobs, setJobs] = useState<RepositoryAnalysisJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Filters
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchEvents = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/github/webhook/events');
      const data = await res.json();
      if (res.ok && data.success) {
        setDeliveries(data.deliveries || []);
        setJobs(data.jobs || []);
      } else {
        setErrorMsg(data.error || 'Failed to fetch webhook events.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error fetching webhook stream.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      const res = await fetch('/api/github/webhook/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchEvents();
      } else {
        alert(data.error || 'Failed to retry analysis job.');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing retry.');
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleCopyWebhookUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/api/github/webhook`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const filteredJobs = jobs.filter(job => {
    if (eventFilter !== 'ALL' && job.eventType !== eventFilter) return false;
    if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: WebhookProcessingState) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">COMPLETED</span>;
      case 'processing':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>PROCESSING</span>
          </span>
        );
      case 'queued':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-600 border border-amber-500/20">QUEUED</span>;
      case 'duplicate':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-600 border border-purple-500/20">DUPLICATE</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-600 border border-red-500/20">FAILED</span>;
      case 'ignored':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-alt text-text-muted border border-border">IGNORED</span>;
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6 stagger-fade-up">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-lg text-text-primary flex items-center gap-2.5">
            <Zap size={22} className="text-text-primary" />
            <span>Repository Events & Webhook Stream</span>
          </h2>
          <p className="text-body-sm text-text-muted mt-1">
            Real-time GitHub event ingestion with HMAC-SHA256 signature verification and automated pipeline dispatch.
          </p>
        </div>

        <button
          onClick={fetchEvents}
          disabled={isLoading}
          className="px-3.5 py-1.5 rounded bg-surface border border-border text-caption font-mono text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Webhook Configuration / Endpoint Card */}
      <div className="p-4 rounded-md bg-surface border border-border space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Key size={15} className="text-text-primary" />
            <h4 className="text-body-sm font-semibold text-text-primary">Webhook Setup Guide</h4>
          </div>
          <span className="text-[10px] font-mono text-text-muted">Algorithm: HMAC-SHA256 (X-Hub-Signature-256)</span>
        </div>

        <div className="p-3 rounded bg-surface-alt border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-caption">
          <div className="space-y-0.5">
            <span className="text-[10px] text-text-muted uppercase block">Payload URL</span>
            <code className="text-text-primary font-semibold text-xs break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/github/webhook` : '/api/github/webhook'}
            </code>
          </div>

          <button
            onClick={handleCopyWebhookUrl}
            className="px-2.5 py-1 rounded bg-surface border border-border text-[11px] hover:text-text-primary transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            {copiedUrl ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-caption text-text-muted flex-wrap">
          <span>Supported Triggers: <strong className="text-text-secondary font-mono">push</strong>, <strong className="text-text-secondary font-mono">pull_request</strong>, <strong className="text-text-secondary font-mono">repository</strong></span>
          <span>Content Type: <strong className="text-text-secondary font-mono">application/json</strong></span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-md bg-surface border border-border">
          <span className="text-[10px] font-mono text-text-muted uppercase block">Total Deliveries</span>
          <span className="text-heading-sm font-mono font-bold text-text-primary">{deliveries.length}</span>
        </div>
        <div className="p-3 rounded-md bg-surface border border-border">
          <span className="text-[10px] font-mono text-text-muted uppercase block">Completed Jobs</span>
          <span className="text-heading-sm font-mono font-bold text-emerald-600">
            {jobs.filter(j => j.status === 'completed').length}
          </span>
        </div>
        <div className="p-3 rounded-md bg-surface border border-border">
          <span className="text-[10px] font-mono text-text-muted uppercase block">Processing / Queued</span>
          <span className="text-heading-sm font-mono font-bold text-blue-600">
            {jobs.filter(j => j.status === 'processing' || j.status === 'queued').length}
          </span>
        </div>
        <div className="p-3 rounded-md bg-surface border border-border">
          <span className="text-[10px] font-mono text-text-muted uppercase block">Failed Jobs</span>
          <span className={`text-heading-sm font-mono font-bold ${jobs.filter(j => j.status === 'failed').length > 0 ? 'text-red-600' : 'text-text-primary'}`}>
            {jobs.filter(j => j.status === 'failed').length}
          </span>
        </div>
      </div>

      {/* Feed Filter Bar */}
      <div className="p-3 rounded-md bg-surface border border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-2 py-1 rounded border border-border bg-surface text-caption font-mono text-text-primary focus:outline-none"
          >
            <option value="ALL">All Event Types</option>
            <option value="push">Push</option>
            <option value="pull_request">Pull Request</option>
            <option value="repository">Repository</option>
            <option value="ping">Ping</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 rounded border border-border bg-surface text-caption font-mono text-text-primary focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="queued">Queued</option>
            <option value="duplicate">Duplicate</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <span className="text-caption font-mono text-text-muted">
          Showing {filteredJobs.length} active job(s)
        </span>
      </div>

      {/* Jobs & Event Feed List */}
      {filteredJobs.length === 0 ? (
        <div className="p-12 rounded-md bg-surface border border-border text-center space-y-2">
          <Zap size={24} className="mx-auto text-text-muted" />
          <h4 className="text-body-sm font-semibold text-text-primary">No Webhook Events Received Yet</h4>
          <p className="text-caption text-text-muted max-w-md mx-auto">
            Configure your GitHub repository Webhooks to target this endpoint. Events will automatically stream here with cryptographic verification.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="p-4 rounded-md bg-surface border border-border space-y-3 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(job.status)}
                    <span className="px-2 py-0.5 rounded bg-surface-alt text-[10px] font-mono font-semibold text-text-primary border border-border uppercase">
                      {job.eventType}
                    </span>
                    {job.action && (
                      <span className="text-[10px] font-mono text-text-muted">
                        action: {job.action}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-text-muted">
                      delivery: {job.eventDeliveryId.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-body-sm font-mono font-semibold text-text-primary">
                    <span>{job.repositoryId}</span>
                    {job.branch && <span className="text-caption text-text-muted font-normal font-mono">({job.branch})</span>}
                    {job.pullRequestNumber && (
                      <span className="px-1.5 py-0.2 rounded bg-surface-alt text-[11px] text-text-secondary border border-border">
                        PR #{job.pullRequestNumber}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-caption text-text-muted self-start sm:self-auto">
                  {job.targetSha && (
                    <span>SHA: <code className="text-text-primary font-bold">{job.targetSha.slice(0, 7)}</code></span>
                  )}
                  <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Triggered Operations Badges */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] font-mono uppercase text-text-muted mr-1">Triggered:</span>
                {job.requestedOperations.map((op) => (
                  <span
                    key={op}
                    className="px-1.5 py-0.5 rounded bg-surface-alt border border-border text-[10px] font-mono text-text-secondary"
                  >
                    {op}
                  </span>
                ))}
              </div>

              {/* Error & Retry Banner */}
              {job.status === 'failed' && job.error && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-caption text-red-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-semibold">Execution Failure: </span>
                    <span>{job.error.message}</span>
                    <span className="text-[10px] font-mono block text-red-500">
                      Code: {job.error.code} • Retry Count: {job.retryCount}/{job.maxRetries}
                    </span>
                  </div>

                  {job.error.isRetryable && job.retryCount < job.maxRetries && (
                    <button
                      onClick={() => handleRetryJob(job.id)}
                      disabled={retryingJobId === job.id}
                      className="px-3 py-1.5 rounded bg-red-600 text-white text-caption font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      <RotateCcw size={12} className={retryingJobId === job.id ? 'animate-spin' : ''} />
                      <span>Retry Job</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
