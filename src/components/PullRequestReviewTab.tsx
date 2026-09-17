/**
 * Phase 8 — Pull Request Review Tab Component
 *
 * Provides a developer-oriented Pull Request Review interface with
 * metadata inspection, multi-dimensional impact scorecards,
 * structured findings explorer, and unified diff viewer.
 */

'use client';

import React, { useState } from 'react';
import {
  ArchitectureImpact,
  DependencyImpact,
  DocumentationImpact,
  PRFindingCategory,
  PRFindingSeverity,
  PRReviewFinding,
  PullRequestReview,
  SecurityImpact,
  TestingImpact,
} from '@/lib/pr/types';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  FileCode,
  Filter,
  FolderGit2,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Layers,
  Package,
  Search,
  Shield,
  ShieldAlert,
  TestTube,
  Terminal,
  Wrench,
  X,
  FileText,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { DiffViewer } from './DiffViewer';

interface PullRequestReviewTabProps {
  initialRepoFullName?: string;
  initialPrNumber?: number;
}

export const PullRequestReviewTab: React.FC<PullRequestReviewTabProps> = ({
  initialRepoFullName = 'Gopalkrishna10845445/devpulse-ai',
  initialPrNumber = 1,
}) => {
  const [repoInput, setRepoInput] = useState(initialRepoFullName);
  const [prNumberInput, setPrNumberInput] = useState(initialPrNumber.toString());
  const [isReviewing, setIsReviewing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [review, setReview] = useState<PullRequestReview | null>(null);

  // Sub-Navigation
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'findings' | 'diff'>('overview');

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [selectedFileForDiff, setSelectedFileForDiff] = useState<string | null>(null);

  const handleReview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!repoInput.trim() || !prNumberInput.trim()) return;

    setIsReviewing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/github/pull-request/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: repoInput.trim(),
          pullRequestNumber: parseInt(prNumberInput.trim(), 10),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReview(data.review);
        if (data.review.changedFiles.length > 0) {
          setSelectedFileForDiff(data.review.changedFiles[0].filePath);
        }
      } else {
        setErrorMsg(data.error || 'Failed to review Pull Request.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while requesting PR review.');
    } finally {
      setIsReviewing(false);
    }
  };

  const filteredFindings = (review?.findings || []).filter(f => {
    if (severityFilter !== 'ALL' && f.severity !== severityFilter) return false;
    if (categoryFilter !== 'ALL' && f.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        (f.file && f.file.toLowerCase().includes(q)) ||
        f.rule.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityBadge = (severity: PRFindingSeverity) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-600 border border-red-500/20">CRITICAL</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">HIGH</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">MEDIUM</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-600 border border-blue-500/20">LOW</span>;
      case 'info':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-alt text-text-muted border border-border">INFO</span>;
    }
  };

  const getVerdictBadge = (verdict: 'approve' | 'comment' | 'request_changes') => {
    switch (verdict) {
      case 'request_changes':
        return (
          <span className="px-3 py-1 rounded text-caption font-mono font-bold uppercase bg-red-500/10 text-red-600 border border-red-500/30 flex items-center gap-1.5">
            <AlertCircle size={14} />
            <span>Changes Requested</span>
          </span>
        );
      case 'comment':
        return (
          <span className="px-3 py-1 rounded text-caption font-mono font-bold uppercase bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            <span>Comments & Advisories</span>
          </span>
        );
      case 'approve':
      default:
        return (
          <span className="px-3 py-1 rounded text-caption font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            <span>Approved (Clean Diff)</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6 stagger-fade-up">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-lg text-text-primary flex items-center gap-2.5">
            <GitPullRequest size={22} className="text-text-primary" />
            <span>Pull Request Review Engine</span>
          </h2>
          <p className="text-body-sm text-text-muted mt-1">
            Authoritative, diff-scoped engineering and security reviews with architectural impact and test analysis.
          </p>
        </div>

        {review && (
          <div className="flex items-center gap-2">
            <span className="text-caption font-mono text-text-muted">
              {review.durationMs}ms review • {review.metadata.filesAnalyzed} files
            </span>
          </div>
        )}
      </div>

      {/* Input / Control Form */}
      <div className="p-4 rounded-md bg-surface border border-border">
        <form onSubmit={handleReview} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full relative">
            <FolderGit2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="owner/repository"
              className="w-full pl-9 pr-3 py-2 rounded bg-surface-alt border border-border text-body-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
            />
          </div>

          <div className="w-full sm:w-36 relative">
            <GitPullRequest size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="number"
              value={prNumberInput}
              onChange={(e) => setPrNumberInput(e.target.value)}
              placeholder="PR #"
              min="1"
              className="w-full pl-9 pr-3 py-2 rounded bg-surface-alt border border-border text-body-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong"
            />
          </div>

          <button
            type="submit"
            disabled={isReviewing || !repoInput.trim() || !prNumberInput.trim()}
            className="w-full sm:w-auto px-5 py-2 rounded bg-text-primary text-white text-body-sm font-medium hover:bg-text-secondary disabled:opacity-50 transition-colors flex items-center justify-center gap-2 flex-shrink-0"
          >
            {isReviewing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Analyzing PR...</span>
              </>
            ) : (
              <>
                <span>Review PR</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {errorMsg && (
          <div className="mt-3 p-3 rounded bg-red-500/10 border border-red-500/20 text-body-sm text-red-600 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Main Review Body */}
      {review && (
        <div className="space-y-6">
          {/* Hero PR Details Card */}
          <div className="p-5 rounded-md bg-surface border border-border space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-surface-alt text-caption font-mono text-text-primary border border-border font-semibold">
                    #{review.pullRequest.number}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-surface-alt text-text-secondary border border-border">
                    {review.pullRequest.state}
                  </span>
                  <div className="flex items-center gap-1.5 text-caption text-text-muted font-mono">
                    <GitBranch size={13} />
                    <span>{review.pullRequest.baseBranch}</span>
                    <span className="text-text-muted">←</span>
                    <span className="text-text-primary font-semibold">{review.pullRequest.headBranch}</span>
                  </div>
                </div>

                <h3 className="text-heading-md font-bold text-text-primary">
                  {review.pullRequest.title}
                </h3>

                <div className="flex items-center gap-4 text-caption text-text-muted font-mono flex-wrap">
                  <span>Author: <strong className="text-text-secondary">{review.pullRequest.author}</strong></span>
                  <span>Base: <code className="text-text-muted">{review.baseCommit.slice(0, 7)}</code></span>
                  <span>Head: <code className="text-text-primary font-bold">{review.headCommit.slice(0, 7)}</code></span>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2 flex-shrink-0">
                {getVerdictBadge(review.summary.verdict)}
                <div className="flex items-center gap-3 font-mono text-caption">
                  <span className="text-emerald-600 font-semibold">+{review.pullRequest.additions}</span>
                  <span className="text-red-600 font-semibold">-{review.pullRequest.deletions}</span>
                  <span className="text-text-muted">{review.changedFiles.length} files</span>
                </div>
              </div>
            </div>

            {/* Severity Breakdown Bar */}
            <div className="pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-2.5 rounded bg-surface-alt border border-border">
                <span className="text-[10px] font-mono text-text-muted uppercase block">Critical</span>
                <span className={`text-heading-sm font-mono font-bold ${review.summary.criticalCount > 0 ? 'text-red-600' : 'text-text-primary'}`}>
                  {review.summary.criticalCount}
                </span>
              </div>
              <div className="p-2.5 rounded bg-surface-alt border border-border">
                <span className="text-[10px] font-mono text-text-muted uppercase block">High</span>
                <span className={`text-heading-sm font-mono font-bold ${review.summary.highCount > 0 ? 'text-amber-600' : 'text-text-primary'}`}>
                  {review.summary.highCount}
                </span>
              </div>
              <div className="p-2.5 rounded bg-surface-alt border border-border">
                <span className="text-[10px] font-mono text-text-muted uppercase block">Medium</span>
                <span className="text-heading-sm font-mono font-bold text-text-primary">
                  {review.summary.mediumCount}
                </span>
              </div>
              <div className="p-2.5 rounded bg-surface-alt border border-border">
                <span className="text-[10px] font-mono text-text-muted uppercase block">Low</span>
                <span className="text-heading-sm font-mono font-bold text-text-primary">
                  {review.summary.lowCount}
                </span>
              </div>
              <div className="p-2.5 rounded bg-surface-alt border border-border">
                <span className="text-[10px] font-mono text-text-muted uppercase block">Info</span>
                <span className="text-heading-sm font-mono font-bold text-text-primary">
                  {review.summary.infoCount}
                </span>
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-border gap-6">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`pb-2.5 text-body-sm font-medium border-b-2 transition-colors ${
                activeSubTab === 'overview'
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Overview & Impact Scorecard
            </button>
            <button
              onClick={() => setActiveSubTab('findings')}
              className={`pb-2.5 text-body-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'findings'
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <span>Review Findings</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-alt text-[10px] font-mono text-text-muted">
                {review.findings.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab('diff')}
              className={`pb-2.5 text-body-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'diff'
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <span>Changed Files & Diff</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-alt text-[10px] font-mono text-text-muted">
                {review.changedFiles.length}
              </span>
            </button>
          </div>

          {/* Sub-Tab 1: Overview & Impact Scorecard */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="p-4 rounded-md bg-surface border border-border space-y-2">
                <h4 className="text-body-sm font-semibold text-text-primary">Executive Summary</h4>
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  {review.summary.executiveSummary}
                </p>
              </div>

              {/* 5-Dimensional Impact Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Architecture Impact */}
                <div className="p-4 rounded-md bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-text-primary" />
                      <h4 className="text-body-sm font-semibold text-text-primary">Architecture Impact</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                      review.architectureImpact.status === 'critical' ? 'bg-red-500/10 text-red-600' : 'bg-surface-alt text-text-secondary'
                    }`}>
                      {review.architectureImpact.status}
                    </span>
                  </div>
                  <p className="text-caption text-text-muted">{review.architectureImpact.summary}</p>
                </div>

                {/* 2. Security Impact */}
                <div className="p-4 rounded-md bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-text-primary" />
                      <h4 className="text-body-sm font-semibold text-text-primary">Security Impact</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                      review.securityImpact.status === 'critical' ? 'bg-red-500/10 text-red-600' : 'bg-surface-alt text-text-secondary'
                    }`}>
                      {review.securityImpact.status}
                    </span>
                  </div>
                  <p className="text-caption text-text-muted">{review.securityImpact.summary}</p>
                </div>

                {/* 3. Testing Impact */}
                <div className="p-4 rounded-md bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TestTube size={16} className="text-text-primary" />
                      <h4 className="text-body-sm font-semibold text-text-primary">Testing Impact</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-surface-alt text-text-secondary">
                      {review.testingImpact.status}
                    </span>
                  </div>
                  <p className="text-caption text-text-muted">{review.testingImpact.summary}</p>
                </div>

                {/* 4. Dependency Impact */}
                <div className="p-4 rounded-md bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-text-primary" />
                      <h4 className="text-body-sm font-semibold text-text-primary">Dependency Impact</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                      review.dependencyImpact.status === 'critical' ? 'bg-red-500/10 text-red-600' : 'bg-surface-alt text-text-secondary'
                    }`}>
                      {review.dependencyImpact.status}
                    </span>
                  </div>
                  <p className="text-caption text-text-muted">{review.dependencyImpact.summary}</p>
                </div>

                {/* 5. Documentation Impact */}
                <div className="p-4 rounded-md bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-text-primary" />
                      <h4 className="text-body-sm font-semibold text-text-primary">Documentation Impact</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-surface-alt text-text-secondary">
                      {review.documentationImpact.status}
                    </span>
                  </div>
                  <p className="text-caption text-text-muted">{review.documentationImpact.summary}</p>
                </div>
              </div>

              {/* Recommendations & Validation Plan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-md bg-surface border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-text-primary" />
                    <h4 className="text-body-sm font-semibold text-text-primary">Actionable Recommendations</h4>
                  </div>
                  <ul className="space-y-2">
                    {review.recommendations.map((rec, i) => (
                      <li key={i} className="text-body-sm text-text-secondary flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-primary mt-2 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-md bg-surface border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <h4 className="text-body-sm font-semibold text-text-primary">Validation Checklist</h4>
                  </div>
                  <ul className="space-y-2 font-mono text-caption text-text-secondary">
                    {review.validationPlan.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Findings Explorer */}
          {activeSubTab === 'findings' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="p-3 rounded-md bg-surface border border-border flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                  {/* Severity Filter */}
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="px-2 py-1 rounded border border-border bg-surface text-caption font-mono text-text-primary focus:outline-none"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="info">Info</option>
                  </select>

                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2 py-1 rounded border border-border bg-surface text-caption font-mono text-text-primary focus:outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="security">Security</option>
                    <option value="architecture">Architecture</option>
                    <option value="testing">Testing</option>
                    <option value="dependencies">Dependencies</option>
                    <option value="documentation">Documentation</option>
                    <option value="api">API</option>
                  </select>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search findings, rules, files..."
                    className="w-full pl-7 pr-3 py-1 rounded border border-border bg-surface text-caption text-text-primary placeholder:text-text-muted focus:outline-none"
                  />
                </div>
              </div>

              {/* Findings List */}
              {filteredFindings.length === 0 ? (
                <div className="p-8 rounded-md bg-surface border border-border text-center text-body-sm text-text-muted">
                  No review findings matched the selected criteria.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFindings.map((f) => {
                    const isExpanded = expandedFindingId === f.id;
                    return (
                      <div key={f.id} className="rounded-md bg-surface border border-border overflow-hidden">
                        <button
                          onClick={() => setExpandedFindingId(isExpanded ? null : f.id)}
                          className="w-full px-4 py-3 text-left flex items-start justify-between gap-4 hover:bg-surface-alt transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getSeverityBadge(f.severity)}
                              <span className="px-1.5 py-0.5 rounded bg-surface-alt text-[10px] font-mono text-text-muted border border-border uppercase">
                                {f.category}
                              </span>
                              <span className="text-[10px] font-mono text-text-muted">
                                {f.rule}
                              </span>
                            </div>
                            <h4 className="text-body-sm font-semibold text-text-primary">{f.title}</h4>
                            <p className="text-caption text-text-muted line-clamp-1">{f.description}</p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 text-text-muted mt-1">
                            {f.file && (
                              <span className="text-[11px] font-mono text-text-muted hidden sm:inline">
                                {f.file}:{f.line || ''}
                              </span>
                            )}
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-border space-y-3 bg-surface-alt/30">
                            <div>
                              <span className="text-caption font-medium text-text-primary">Impact:</span>
                              <p className="text-caption text-text-secondary mt-0.5">{f.impact}</p>
                            </div>

                            {/* Evidence */}
                            <div className="p-3 rounded bg-surface border border-border space-y-1.5">
                              <div className="flex items-center justify-between text-caption font-medium text-text-primary">
                                <span>Evidence:</span>
                                <span className="text-[10px] font-mono text-text-muted">Confidence: {f.confidence}</span>
                              </div>
                              <p className="text-caption text-text-secondary">{f.evidence.summary}</p>
                              {f.evidence.snippet && (
                                <pre className="p-2 rounded bg-surface-alt border border-border text-[11px] font-mono text-text-primary overflow-x-auto whitespace-pre-wrap">
                                  {f.evidence.snippet}
                                </pre>
                              )}
                            </div>

                            {/* Recommendation */}
                            <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/20 text-caption text-emerald-800 dark:text-emerald-300">
                              <span className="font-semibold">Recommendation: </span>
                              <span>{f.recommendation}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 3: Changed Files & Diff */}
          {activeSubTab === 'diff' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* File List */}
              <div className="p-3 rounded-md bg-surface border border-border space-y-2 md:col-span-1">
                <h4 className="text-caption font-mono uppercase text-text-muted font-bold mb-2">
                  Files Changed ({review.changedFiles.length})
                </h4>
                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {review.changedFiles.map((file) => (
                    <button
                      key={file.filePath}
                      onClick={() => setSelectedFileForDiff(file.filePath)}
                      className={`w-full p-2 rounded text-left text-caption font-mono transition-colors flex items-center justify-between gap-2 ${
                        selectedFileForDiff === file.filePath
                          ? 'bg-surface-alt text-text-primary font-semibold border border-border'
                          : 'text-text-muted hover:bg-surface-alt hover:text-text-primary'
                      }`}
                    >
                      <span className="truncate">{file.filePath}</span>
                      <span className="text-[10px] text-emerald-600 flex-shrink-0">+{file.additions}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Diff Viewer Pane */}
              <div className="md:col-span-3 space-y-3">
                {selectedFileForDiff && (
                  <div>
                    {(() => {
                      const selected = review.changedFiles.find(f => f.filePath === selectedFileForDiff);
                      if (!selected || !selected.patch) {
                        return (
                          <div className="p-8 rounded-md bg-surface border border-border text-center text-body-sm text-text-muted font-mono">
                            No unified diff patch available for {selectedFileForDiff}.
                          </div>
                        );
                      }
                      const patchFull = `--- a/${selected.filePath}\n+++ b/${selected.filePath}\n${selected.patch}`;
                      return (
                        <DiffViewer
                          diff={patchFull}
                        />
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
