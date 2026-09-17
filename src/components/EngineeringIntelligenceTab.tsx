'use client';

import React, { useState } from 'react';
import {
  EngineeringFinding,
  EngineeringHealthReport,
  FindingCategory,
  FindingSeverity,
} from '@/lib/engineering/types';
import { RepositoryIndex } from '@/lib/repository/types';
import { CodebaseIntelligence } from '@/lib/intelligence/types';
import { GitHubTelemetry } from '@/lib/types';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  FileCode,
  Filter,
  Flame,
  FolderGit2,
  Layers,
  Package,
  Search,
  ShieldAlert,
  TestTube,
  Wrench,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface EngineeringIntelligenceTabProps {
  initialRepoFullName?: string;
  preloadedIndex?: RepositoryIndex | null;
  preloadedIntelligence?: CodebaseIntelligence | null;
  preloadedGithub?: GitHubTelemetry | null;
}

export const EngineeringIntelligenceTab: React.FC<EngineeringIntelligenceTabProps> = ({
  initialRepoFullName = 'Gopalkrishna10845445/devpulse-ai',
  preloadedIndex,
  preloadedIntelligence,
  preloadedGithub,
}) => {
  const [repoInput, setRepoInput] = useState(initialRepoFullName);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<EngineeringHealthReport | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!repoInput.trim()) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/repository/engineering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: repoInput.trim(),
          preloadedIndex: preloadedIndex || undefined,
          preloadedIntelligence: preloadedIntelligence || undefined,
          preloadedGithub: preloadedGithub || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setReport(data.report);
      } else {
        setErrorMsg(data.error || 'Failed to generate engineering health report.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while analyzing engineering health.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredFindings = (report?.findings || []).filter(f => {
    if (categoryFilter !== 'ALL' && f.category !== categoryFilter) return false;
    if (severityFilter !== 'ALL' && f.severity !== severityFilter) return false;
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

  const getSeverityBadgeClass = (severity: FindingSeverity) => {
    switch (severity) {
      case 'high':
        return 'bg-surface-alt text-text-primary border-border-strong font-semibold';
      case 'medium':
        return 'bg-surface-alt text-text-secondary border-border';
      case 'low':
        return 'bg-surface text-text-muted border-border';
      case 'info':
      default:
        return 'bg-surface text-text-muted border-border';
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6 stagger-fade-up">

      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-lg text-text-primary">Engineering Intelligence</h2>
          <p className="text-body-sm text-text-muted mt-1">
            Deterministic static health signals, maintainability indicators, architectural boundaries, and hotspots.
          </p>
        </div>

        {report && (
          <div className="flex items-center gap-2">
            <StatusBadge
              status={report.summary.overallStatus === 'warning' ? 'pending' : 'indexed'}
              label={`Health: ${report.summary.overallStatus.toUpperCase()}`}
            />
            <span className="text-caption font-mono text-text-muted">
              {report.durationMs}ms analysis
            </span>
          </div>
        )}
      </div>

      {/* Analysis Trigger Form */}
      <div className="p-4 rounded-md bg-surface border border-border space-y-3">
        <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 w-full relative">
            <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="e.g. owner/repo or https://github.com/owner/repo"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md bg-surface-alt border border-border text-body-sm text-text-primary font-mono focus:outline-none focus:border-border-strong"
            />
          </div>

          <button
            type="submit"
            disabled={isAnalyzing || !repoInput.trim()}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-text-primary text-white text-body-sm font-medium hover:bg-text-secondary transition-colors disabled:opacity-40 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isAnalyzing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analyzing Health Signals...</span>
              </>
            ) : (
              <>
                <Cpu size={14} />
                <span>Run Engineering Audit</span>
              </>
            )}
          </button>
        </form>

        {errorMsg && (
          <div className="p-3 rounded-md bg-surface-alt border border-border text-caption text-red-600 flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Main Report Body */}
      {report && (
        <div className="space-y-6">

          {/* Top Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Maintainability', value: `${report.maintainability.oversizedFilesCount} flags`, icon: Wrench, status: report.maintainability.status },
              { label: 'Architecture', value: `${report.architecture.modularityScore}/100`, icon: Layers, status: report.architecture.status },
              { label: 'Testing', value: `${report.testing.totalTestFiles} tests`, icon: TestTube, status: report.testing.status },
              { label: 'Dependencies', value: `${report.dependencies.totalDependencies}`, icon: Package, status: report.dependencies.status },
              { label: 'Documentation', value: report.documentation.hasReadme ? 'README ✓' : 'No README', icon: FileCode, status: report.documentation.status },
              { label: 'Coupling', value: `${report.coupling.tightCouplingPairs.length} tight`, icon: ArrowRight, status: report.coupling.status },
              { label: 'Hotspots', value: `${report.hotspots.length}`, icon: Flame, status: report.hotspots.length > 0 ? 'warning' : 'healthy' },
              { label: 'Findings', value: `${report.summary.totalFindingsCount}`, icon: ShieldAlert, status: report.summary.findingsBySeverity.high > 0 ? 'warning' : 'healthy' },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="p-3 rounded-md bg-surface border border-border flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-muted mb-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider truncate">{card.label}</span>
                    <Icon size={12} />
                  </div>
                  <p className="font-mono text-body-sm font-medium text-text-primary truncate">{card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Key Risks & Health Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Key Risks */}
            <div className="p-4 rounded-md bg-surface border border-border space-y-2">
              <div className="flex items-center gap-2 text-caption font-mono uppercase tracking-wider text-text-primary">
                <AlertTriangle size={14} className="text-text-muted" />
                <span>Identified Engineering Risks</span>
              </div>
              {report.summary.keyRisks.length === 0 ? (
                <p className="text-body-sm text-text-muted font-mono">No severe structural risks detected.</p>
              ) : (
                <ul className="space-y-1.5 text-body-sm text-text-secondary">
                  {report.summary.keyRisks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-text-muted font-mono text-caption mt-0.5">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Health Highlights */}
            <div className="p-4 rounded-md bg-surface border border-border space-y-2">
              <div className="flex items-center gap-2 text-caption font-mono uppercase tracking-wider text-text-primary">
                <CheckCircle2 size={14} className="text-text-muted" />
                <span>Architecture & Quality Highlights</span>
              </div>
              {report.summary.healthHighlights.length === 0 ? (
                <p className="text-body-sm text-text-muted font-mono">No specific health highlights logged.</p>
              ) : (
                <ul className="space-y-1.5 text-body-sm text-text-secondary">
                  {report.summary.healthHighlights.map((hl, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-text-muted font-mono text-caption mt-0.5">✓</span>
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Engineering Hotspots Section */}
          {report.hotspots.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-heading-sm text-text-primary flex items-center gap-2">
                  <Flame size={16} className="text-text-muted" />
                  <span>Engineering Hotspots</span>
                </h3>
                <span className="text-caption font-mono text-text-muted">
                  Ranked deterministically by structural risk score
                </span>
              </div>

              <div className="rounded-md bg-surface border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-surface-alt border-b border-border text-[10px] uppercase text-text-muted">
                      <tr>
                        <th className="p-3">Hotspot File / Module</th>
                        <th className="p-3">Risk Score</th>
                        <th className="p-3">Severity</th>
                        <th className="p-3">Contributing Signals</th>
                        <th className="p-3">Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.hotspots.map((hs, idx) => (
                        <tr key={idx} className="hover:bg-surface-alt/50 transition-colors">
                          <td className="p-3 text-text-primary font-medium">{hs.filePath || hs.name}</td>
                          <td className="p-3">
                            <span className="font-bold">{hs.riskScore}</span>
                            <span className="text-[10px] text-text-muted">/100</span>
                          </td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded-sm text-[10px] uppercase border ${getSeverityBadgeClass(hs.severity)}`}>
                              {hs.severity}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {hs.signals.map((sig, sIdx) => (
                                <span key={sIdx} className="px-1.5 py-0.5 rounded-sm bg-surface-alt border border-border text-[10px] text-text-secondary">
                                  {sig}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-text-muted truncate max-w-xs">{hs.evidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Structured Findings Explorer */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-heading-sm text-text-primary">
                  Engineering Findings ({filteredFindings.length})
                </h3>
                <p className="text-caption text-text-muted mt-0.5">
                  Actionable, evidence-backed findings ordered by severity
                </p>
              </div>

              {/* Severity Quick Toggles */}
              <div className="flex items-center gap-1.5">
                {['ALL', 'high', 'medium', 'low', 'info'].map(sev => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-sm text-caption font-mono uppercase transition-colors ${
                      severityFilter === sev
                        ? 'bg-surface-alt text-text-primary border border-border-strong font-medium'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3 rounded-md bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:w-72 relative">
                <Search size={14} className="absolute left-2.5 top-2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search findings, rules, files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-md bg-surface-alt border border-border text-body-sm text-text-primary font-mono focus:outline-none focus:border-border-strong"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs w-full sm:w-auto">
                {['ALL', 'architecture', 'maintainability', 'testing', 'dependencies', 'documentation', 'complexity', 'coupling', 'activity'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded-sm font-mono text-[11px] uppercase transition-colors whitespace-nowrap ${
                      categoryFilter === cat
                        ? 'bg-surface-alt text-text-primary border border-border-strong font-medium'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Findings List */}
            {filteredFindings.length === 0 ? (
              <div className="p-8 rounded-md bg-surface border border-border text-center text-body-sm text-text-muted font-mono">
                No engineering findings matched the selected filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFindings.map((finding) => {
                  const isExpanded = expandedFindingId === finding.id;
                  return (
                    <div
                      key={finding.id}
                      className="p-4 rounded-md bg-surface border border-border space-y-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`px-1.5 py-0.5 rounded-sm text-[10px] uppercase font-mono border ${getSeverityBadgeClass(finding.severity)}`}>
                              {finding.severity}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-sm bg-surface-alt border border-border text-[10px] font-mono text-text-muted uppercase">
                              {finding.category}
                            </span>
                            <span className="text-[10px] font-mono text-text-muted">
                              {finding.deterministicRule}
                            </span>
                          </div>
                          <h4 className="text-body-sm font-medium text-text-primary">{finding.title}</h4>
                          <p className="text-body-sm text-text-secondary mt-1">{finding.description}</p>
                        </div>

                        <button
                          onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
                          className="p-1.5 rounded-md hover:bg-surface-alt text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                          aria-label="Toggle details"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>

                      {/* Expandable Deep Details */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-border space-y-3 text-body-sm">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-text-muted block">Impact</span>
                            <p className="text-text-secondary mt-0.5">{finding.impact}</p>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-mono text-text-muted block">Recommendation</span>
                            <p className="text-text-primary mt-0.5 font-medium">{finding.recommendation}</p>
                          </div>

                          {/* Evidence Reference Block */}
                          <div className="p-3 rounded-sm bg-surface-alt border border-border space-y-2 font-mono text-xs">
                            <span className="text-[10px] uppercase font-mono text-text-muted block">Deterministic Evidence</span>
                            <p className="text-text-primary">{finding.evidence.summary}</p>
                            {finding.evidence.references.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {finding.evidence.references.map((ref, rIdx) => (
                                  <span key={rIdx} className="px-2 py-0.5 rounded-sm bg-surface border border-border text-[11px] text-text-secondary">
                                    {ref.file && `${ref.file}`}
                                    {ref.line ? `:${ref.line}` : ''}
                                    {ref.fromModule && ref.toModule ? `${ref.fromModule} → ${ref.toModule}` : ''}
                                    {ref.metricName ? ` (${ref.metricName}: ${ref.metricValue})` : ''}
                                  </span>
                                ))}
                              </div>
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

        </div>
      )}

    </div>
  );
};
