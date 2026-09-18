'use client';

import React, { useState } from 'react';
import {
  SecurityFinding,
  SecurityHealthReport,
  SecuritySeverity,
} from '@/lib/security/types';
import { CodeFixProposal } from '@/lib/fixes/types';
import { RepositoryIndex } from '@/lib/repository/types';
import { CodebaseIntelligence } from '@/lib/intelligence/types';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCode,
  Filter,
  FolderGit2,
  KeyRound,
  Lock,
  Package,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Wrench,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { CodeFixProposalModal } from './CodeFixProposalModal';
import { maskSecret } from '@/lib/security/redactor';

interface SecurityIntelligenceTabProps {
  initialRepoFullName?: string;
  preloadedIndex?: RepositoryIndex | null;
  preloadedIntelligence?: CodebaseIntelligence | null;
}

export const SecurityIntelligenceTab: React.FC<SecurityIntelligenceTabProps> = ({
  initialRepoFullName = 'Gopalkrishna10845445/devpulse-ai',
  preloadedIndex,
  preloadedIntelligence,
}) => {
  const [repoInput, setRepoInput] = useState(initialRepoFullName);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<SecurityHealthReport | null>(null);

  React.useEffect(() => {
    setRepoInput(initialRepoFullName);
    setReport(null);
    setErrorMsg(null);
  }, [initialRepoFullName]);

  // Filters & Search
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'findings' | 'advisories' | 'files' | 'overview'>('overview');

  // Fix Proposal State
  const [activeProposal, setActiveProposal] = useState<CodeFixProposal | null>(null);
  const [isGeneratingFix, setIsGeneratingFix] = useState(false);
  const [generatingFindingId, setGeneratingFindingId] = useState<string | null>(null);

  const handleGenerateFix = async (f: SecurityFinding) => {
    if (!report || !f.filePath) return;
    setIsGeneratingFix(true);
    setGeneratingFindingId(f.id);

    try {
      const res = await fetch('/api/repository/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: report.repository.fullName,
          commitSha: report.summary.commitSha,
          findingId: f.id,
          category: 'security',
          filePath: f.filePath,
          lineRange: f.lineStart?.toString(),
          findingTitle: f.title,
          findingDescription: f.description,
          findingRule: f.deterministicRule,
          findingRecommendation: f.recommendation,
          evidence: f.evidence,
          preloadedIndex: preloadedIndex || undefined,
          preloadedIntelligence: preloadedIntelligence || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveProposal(data.proposal);
      } else {
        alert(data.error || 'Failed to generate code fix.');
      }
    } catch (err: any) {
      alert(err.message || 'Error generating code fix.');
    } finally {
      setIsGeneratingFix(false);
      setGeneratingFindingId(null);
    }
  };

  const handleApproveProposal = async (proposalId: string) => {
    const res = await fetch('/api/repository/fix/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId, action: 'approve' }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setActiveProposal(data.proposal);
    }
  };

  const handleRejectProposal = async (proposalId: string, reason?: string) => {
    const res = await fetch('/api/repository/fix/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId, action: 'reject', rejectionReason: reason }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setActiveProposal(data.proposal);
    }
  };

  const handleApplyProposal = async (proposalId: string) => {
    if (!activeProposal || !report) return;
    const res = await fetch('/api/repository/fix/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId,
        repositoryId: report.repository.fullName,
        commitSha: report.summary.commitSha,
        expectedDiffHash: activeProposal.diffHash,
        confirmedByUser: true,
        preloadedIndex: preloadedIndex || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setActiveProposal(data.proposal);
    } else {
      throw new Error(data.error || 'Failed to apply patch.');
    }
  };

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!repoInput.trim()) return;

    setIsScanning(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/repository/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: repoInput.trim(),
          preloadedIndex: preloadedIndex || undefined,
          preloadedIntelligence: preloadedIntelligence || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setReport(data.report);
      } else {
        setErrorMsg(data.error || 'Failed to generate security health report.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while analyzing repository security.');
    } finally {
      setIsScanning(false);
    }
  };

  const filteredFindings = (report?.findings || []).filter(f => {
    if (categoryFilter !== 'ALL' && f.category !== categoryFilter) return false;
    if (severityFilter !== 'ALL' && f.severity !== severityFilter) return false;
    if (sourceFilter !== 'ALL' && f.source !== sourceFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        (f.filePath && f.filePath.toLowerCase().includes(q)) ||
        f.deterministicRule.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const renderSeverityBadge = (sev: SecuritySeverity) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 font-mono text-[10px] border border-red-500/20 font-semibold">
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-mono text-[10px] border border-amber-500/20 font-semibold">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600 font-mono text-[10px] border border-yellow-500/20">
            MEDIUM
          </span>
        );
      case 'low':
        return (
          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-mono text-[10px] border border-blue-500/20">
            LOW
          </span>
        );
      case 'info':
      default:
        return (
          <span className="px-1.5 py-0.5 rounded bg-surface-alt text-text-muted font-mono text-[10px] border border-border">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-5 rounded-md bg-surface border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-text-primary" />
              <h2 className="text-heading-md text-text-primary">Security Intelligence</h2>
            </div>
            <p className="text-body-sm text-text-muted mt-1">
              Deterministic, evidence-backed security scanning for exposed secrets, sensitive files, insecure configurations, and dependency advisories.
            </p>
          </div>

          <form onSubmit={handleScan} className="flex items-center gap-2">
            <div className="relative">
              <FolderGit2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="owner/repo"
                disabled={isScanning}
                className="pl-8 pr-3 py-1.5 rounded border border-border bg-surface text-body-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong w-60 sm:w-72"
              />
            </div>
            <button
              type="submit"
              disabled={isScanning || !repoInput.trim()}
              className="px-3 py-1.5 rounded bg-text-primary text-white text-body-sm font-medium hover:bg-text-secondary disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isScanning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Run Security Scan</span>
                </>
              )}
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-body-sm text-red-600 flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Initial / Empty State */}
      {!report && !isScanning && !errorMsg && (
        <div className="p-12 rounded-md bg-surface border border-border text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-surface-alt border border-border flex items-center justify-center mx-auto text-text-muted">
            <Shield size={20} />
          </div>
          <h3 className="text-body-md font-medium text-text-primary">No Security Scan Performed Yet</h3>
          <p className="text-body-sm text-text-muted max-w-md mx-auto">
            Run a security scan on the repository to deterministically audit credentials, sensitive files, dangerous code execution patterns, and verified dependency advisories.
          </p>
          <button
            onClick={() => handleScan()}
            className="mt-2 px-4 py-2 rounded bg-text-primary text-white text-body-sm font-medium hover:bg-text-secondary transition-colors inline-flex items-center gap-2"
          >
            <span>Scan {repoInput}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Report View */}
      {report && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Card */}
            <div className="p-4 rounded-md bg-surface border border-border">
              <div className="flex items-center justify-between">
                <span className="text-caption text-text-muted uppercase tracking-wider font-mono">Status</span>
                <StatusBadge
                  status={
                    report.summary.overallStatus === 'critical'
                      ? 'error'
                      : report.summary.overallStatus === 'warning'
                      ? 'pending'
                      : 'indexed'
                  }
                  label={report.summary.overallStatus.toUpperCase()}
                />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold font-mono text-text-primary">
                  {report.summary.totalFindingsCount}
                </span>
                <span className="text-caption text-text-muted">total findings</span>
              </div>
              <div className="mt-2 text-[11px] font-mono text-text-muted">
                Scan time: {report.durationMs}ms
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="p-4 rounded-md bg-surface border border-border">
              <span className="text-caption text-text-muted uppercase tracking-wider font-mono">Severity Breakdown</span>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 font-mono text-xs border border-red-500/20">
                  {report.summary.findingsBySeverity.critical} critical
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-mono text-xs border border-amber-500/20">
                  {report.summary.findingsBySeverity.high} high
                </span>
                <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-600 font-mono text-xs border border-yellow-500/20">
                  {report.summary.findingsBySeverity.medium} med
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-alt text-text-muted font-mono text-xs border border-border">
                  {report.summary.findingsBySeverity.low + report.summary.findingsBySeverity.info} low/info
                </span>
              </div>
              <p className="mt-2 text-caption text-text-muted">
                Evidence-backed static rules
              </p>
            </div>

            {/* Secrets & Files */}
            <div className="p-4 rounded-md bg-surface border border-border">
              <span className="text-caption text-text-muted uppercase tracking-wider font-mono">Credentials & Files</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-semibold font-mono text-text-primary">
                  {report.secrets.totalSecretsFound}
                </span>
                <span className="text-caption text-text-muted">secrets detected</span>
              </div>
              <div className="mt-1 text-caption text-text-muted font-mono">
                {report.sensitiveFiles.totalSensitiveFiles} sensitive file(s)
              </div>
            </div>

            {/* Dependencies */}
            <div className="p-4 rounded-md bg-surface border border-border">
              <span className="text-caption text-text-muted uppercase tracking-wider font-mono">Dependencies</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-semibold font-mono text-text-primary">
                  {report.dependencies.verifiedAdvisoriesCount}
                </span>
                <span className="text-caption text-text-muted">verified advisories</span>
              </div>
              <div className="mt-1 text-caption text-text-muted font-mono">
                {report.dependencies.totalDependencies} dependencies scanned
              </div>
            </div>
          </div>

          {/* Key Risks & Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-md bg-surface border border-border">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="text-body-sm font-semibold text-text-primary">Key Security Signals</h3>
              </div>
              {report.summary.keySecurityRisks.length > 0 ? (
                <ul className="space-y-2">
                  {report.summary.keySecurityRisks.map((risk, i) => (
                    <li key={i} className="text-body-sm text-text-secondary flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-sm text-text-muted">No high-priority security risk flags detected.</p>
              )}
            </div>

            <div className="p-4 rounded-md bg-surface border border-border">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <h3 className="text-body-sm font-semibold text-text-primary">Security Highlights</h3>
              </div>
              {report.summary.securityHighlights.length > 0 ? (
                <ul className="space-y-2">
                  {report.summary.securityHighlights.map((hl, i) => (
                    <li key={i} className="text-body-sm text-text-secondary flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-sm text-text-muted">No highlighted security signals available.</p>
              )}
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
              Overview & Categories
            </button>
            <button
              onClick={() => setActiveSubTab('findings')}
              className={`pb-2.5 text-body-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'findings'
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <span>Findings</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-alt text-[10px] font-mono text-text-muted">
                {report.findings.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab('advisories')}
              className={`pb-2.5 text-body-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'advisories'
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <span>Verified Advisories</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-alt text-[10px] font-mono text-text-muted">
                {report.advisories.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab('files')}
              className={`pb-2.5 text-body-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'files'
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <span>Sensitive Files</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-alt text-[10px] font-mono text-text-muted">
                {report.sensitiveFiles.totalSensitiveFiles}
              </span>
            </button>
          </div>

          {/* Sub-Tab 1: Overview & Signal Cards */}
          {activeSubTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Secrets Indicator */}
              <div className="p-4 rounded-md bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-text-primary" />
                    <span className="font-semibold text-body-sm text-text-primary">Secret Exposure</span>
                  </div>
                  <StatusBadge
                    status={report.secrets.status === 'healthy' ? 'indexed' : report.secrets.status === 'critical' ? 'error' : 'pending'}
                    label={report.secrets.status.toUpperCase()}
                  />
                </div>
                <p className="text-caption text-text-secondary">{report.secrets.summary}</p>
                {report.secrets.secretTypesFound.length > 0 && (
                  <div className="pt-2 border-t border-border flex flex-wrap gap-1">
                    {report.secrets.secretTypesFound.map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-surface-alt text-[10px] font-mono text-text-primary border border-border">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sensitive Files */}
              <div className="p-4 rounded-md bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode size={16} className="text-text-primary" />
                    <span className="font-semibold text-body-sm text-text-primary">Sensitive Files</span>
                  </div>
                  <StatusBadge
                    status={report.sensitiveFiles.status === 'healthy' ? 'indexed' : 'pending'}
                    label={report.sensitiveFiles.status.toUpperCase()}
                  />
                </div>
                <p className="text-caption text-text-secondary">{report.sensitiveFiles.summary}</p>
                {report.sensitiveFiles.detectedFiles.length > 0 && (
                  <div className="pt-2 border-t border-border space-y-1">
                    {report.sensitiveFiles.detectedFiles.slice(0, 3).map((f, idx) => (
                      <div key={idx} className="text-[11px] font-mono text-text-muted truncate">
                        {f.filePath}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Configuration */}
              <div className="p-4 rounded-md bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal size={16} className="text-text-primary" />
                    <span className="font-semibold text-body-sm text-text-primary">Configuration Security</span>
                  </div>
                  <StatusBadge
                    status={report.configuration.status === 'healthy' ? 'indexed' : 'pending'}
                    label={report.configuration.status.toUpperCase()}
                  />
                </div>
                <p className="text-caption text-text-secondary">{report.configuration.summary}</p>
              </div>

              {/* Dangerous Code Patterns */}
              <div className="p-4 rounded-md bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className="text-text-primary" />
                    <span className="font-semibold text-body-sm text-text-primary">Static Code Signals</span>
                  </div>
                  <StatusBadge
                    status={report.codePatterns.status === 'healthy' ? 'indexed' : 'pending'}
                    label={report.codePatterns.status.toUpperCase()}
                  />
                </div>
                <p className="text-caption text-text-secondary">{report.codePatterns.summary}</p>
              </div>

              {/* Authentication & Route Architecture */}
              <div className="p-4 rounded-md bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-text-primary" />
                    <span className="font-semibold text-body-sm text-text-primary">Auth Signals</span>
                  </div>
                  <StatusBadge
                    status={report.authentication.status === 'healthy' ? 'indexed' : 'disabled'}
                    label={report.authentication.status.toUpperCase()}
                  />
                </div>
                <p className="text-caption text-text-secondary">{report.authentication.summary}</p>
              </div>

              {/* Dependency Advisories */}
              <div className="p-4 rounded-md bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-text-primary" />
                    <span className="font-semibold text-body-sm text-text-primary">Vulnerabilities</span>
                  </div>
                  <StatusBadge
                    status={
                      report.dependencies.advisoryStatus === 'verified'
                        ? report.dependencies.verifiedAdvisoriesCount > 0
                          ? 'error'
                          : 'indexed'
                        : 'disabled'
                    }
                    label={report.dependencies.advisoryStatus.toUpperCase()}
                  />
                </div>
                <p className="text-caption text-text-secondary">{report.dependencies.summary}</p>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Findings List with Filter Toolbar */}
          {activeSubTab === 'findings' && (
            <div className="space-y-4">
              {/* Filter Toolbar */}
              <div className="p-3.5 rounded-md bg-surface border border-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-caption text-text-muted">
                    <Filter size={13} />
                    <span>Filter:</span>
                  </div>

                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2 py-1 rounded border border-border bg-surface text-caption font-mono text-text-primary focus:outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="secrets">Secrets</option>
                    <option value="sensitive_files">Sensitive Files</option>
                    <option value="configuration">Configuration</option>
                    <option value="code_security">Code Security</option>
                    <option value="authentication">Authentication</option>
                    <option value="dependencies">Dependencies</option>
                  </select>

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

                  {/* Source Filter */}
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="px-2 py-1 rounded border border-border bg-surface text-caption font-mono text-text-primary focus:outline-none"
                  >
                    <option value="ALL">All Sources</option>
                    <option value="repository_static">Repository Static</option>
                    <option value="external_advisory">External Advisory</option>
                  </select>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search findings or files..."
                    className="pl-7 pr-3 py-1 rounded border border-border bg-surface text-caption text-text-primary placeholder:text-text-muted focus:outline-none w-48 sm:w-60"
                  />
                </div>
              </div>

              {/* Findings Accordion List */}
              {filteredFindings.length === 0 ? (
                <div className="p-8 rounded-md bg-surface border border-border text-center text-body-sm text-text-muted">
                  No security findings matched the selected criteria.
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
                              {renderSeverityBadge(f.severity)}
                              <span className="px-1.5 py-0.5 rounded bg-surface-alt text-[10px] font-mono text-text-muted border border-border">
                                {f.category}
                              </span>
                              <span className="text-[10px] font-mono text-text-muted">
                                {f.deterministicRule}
                              </span>
                              <span className="text-[10px] font-mono text-text-muted">
                                {f.source === 'external_advisory' ? 'External Advisory' : 'Static Analysis'}
                              </span>
                            </div>
                            <h4 className="text-body-sm font-semibold text-text-primary">{f.title}</h4>
                            <p className="text-caption text-text-muted line-clamp-1">{f.description}</p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 text-text-muted mt-1">
                            {f.filePath && (
                              <span className="text-[11px] font-mono text-text-muted hidden sm:inline">
                                {f.filePath}:{f.lineStart}
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

                            {/* Safe Evidence Section */}
                            <div className="p-3 rounded bg-surface border border-border space-y-1.5">
                              <div className="flex items-center justify-between text-caption font-medium text-text-primary">
                                <span>Evidence:</span>
                                <span className="text-[10px] font-mono text-text-muted">Confidence: {f.confidence}</span>
                              </div>
                              <p className="text-caption text-text-secondary">{f.evidence.summary}</p>
                              {f.evidence.redactedContent && (
                                <pre className="p-2 rounded bg-surface-alt border border-border text-[11px] font-mono text-text-primary overflow-x-auto whitespace-pre-wrap">
                                  {/* Defensive masking check */}
                                  {maskSecret(f.evidence.redactedContent)}
                                </pre>
                              )}
                              {f.filePath && (
                                <div className="text-[10px] font-mono text-text-muted">
                                  Location: {f.filePath}{f.lineStart ? ` (Line ${f.lineStart})` : ''}
                                </div>
                              )}
                            </div>

                            {/* Recommendation & Fix Action */}
                            <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/20 text-caption text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <span className="font-semibold">Recommendation: </span>
                                <span>{f.recommendation}</span>
                              </div>
                              {f.filePath && (
                                <button
                                  onClick={() => handleGenerateFix(f)}
                                  disabled={isGeneratingFix && generatingFindingId === f.id}
                                  className="px-3 py-1.5 rounded bg-text-primary text-white text-caption font-medium hover:bg-text-secondary disabled:opacity-50 transition-colors flex items-center gap-1.5 flex-shrink-0 self-start sm:self-auto"
                                >
                                  {isGeneratingFix && generatingFindingId === f.id ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      <span>Generating Fix...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Wrench size={13} />
                                      <span>Generate Fix</span>
                                    </>
                                  )}
                                </button>
                              )}
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

          {/* Sub-Tab 3: Verified Advisories */}
          {activeSubTab === 'advisories' && (
            <div className="p-4 rounded-md bg-surface border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-body-sm font-semibold text-text-primary">Verified Dependency Advisories</h3>
                  <p className="text-caption text-text-muted">
                    Vulnerabilities matched from verified advisory databases against repository manifests.
                  </p>
                </div>
                <StatusBadge
                  status={report.dependencies.verifiedAdvisoriesCount > 0 ? 'error' : 'indexed'}
                  label={report.dependencies.advisoryStatus.toUpperCase()}
                />
              </div>

              {report.advisories.length === 0 ? (
                <div className="p-6 text-center text-body-sm text-text-muted">
                  No verified dependency advisories were found from the available vulnerability intelligence.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-body-sm">
                    <thead>
                      <tr className="border-b border-border text-[11px] font-mono text-text-muted uppercase">
                        <th className="pb-2">Package</th>
                        <th className="pb-2">Version</th>
                        <th className="pb-2">Advisory</th>
                        <th className="pb-2">Severity</th>
                        <th className="pb-2">Patched In</th>
                        <th className="pb-2">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-caption">
                      {report.advisories.map((adv, i) => (
                        <tr key={i} className="hover:bg-surface-alt">
                          <td className="py-2.5 font-semibold text-text-primary">{adv.packageName}</td>
                          <td className="py-2.5 text-text-secondary">{adv.affectedVersion}</td>
                          <td className="py-2.5">
                            <a
                              href={adv.referenceUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-text-primary hover:underline flex items-center gap-1"
                            >
                              <span>{adv.advisoryId}</span>
                              <ExternalLink size={11} className="text-text-muted" />
                            </a>
                          </td>
                          <td className="py-2.5">
                            {renderSeverityBadge(adv.severity)}
                          </td>
                          <td className="py-2.5 text-emerald-600 font-semibold">{adv.patchedVersion || 'N/A'}</td>
                          <td className="py-2.5 text-text-muted text-[11px]">{adv.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 4: Sensitive Files */}
          {activeSubTab === 'files' && (
            <div className="p-4 rounded-md bg-surface border border-border space-y-4">
              <div>
                <h3 className="text-body-sm font-semibold text-text-primary">Sensitive File Audit</h3>
                <p className="text-caption text-text-muted">
                  Files identified in the version control tree that typically store keys, credentials, or private configuration.
                </p>
              </div>

              {report.sensitiveFiles.detectedFiles.length === 0 ? (
                <div className="p-6 text-center text-body-sm text-text-muted">
                  Zero sensitive credential or environment files detected in the repository structure.
                </div>
              ) : (
                <div className="space-y-2">
                  {report.sensitiveFiles.detectedFiles.map((file, i) => (
                    <div key={i} className="p-3 rounded bg-surface-alt border border-border flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-body-sm font-mono font-semibold text-text-primary">{file.filePath}</span>
                        <p className="text-caption text-text-muted">{file.reason}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-surface text-[10px] font-mono text-text-muted border border-border flex-shrink-0">
                        {file.sensitivityType}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Code Fix Proposal Review Modal */}
      {activeProposal && (
        <CodeFixProposalModal
          proposal={activeProposal}
          onClose={() => setActiveProposal(null)}
          onApprove={handleApproveProposal}
          onReject={handleRejectProposal}
          onApply={handleApplyProposal}
        />
      )}
    </div>
  );
};
