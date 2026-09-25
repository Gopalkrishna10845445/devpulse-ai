'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CodebaseIntelligence } from '@/lib/intelligence/types';
import { RepositoryIndex } from '@/lib/repository/types';
import {
  Network,
  Cpu,
  Layers,
  FileCode,
  GitMerge,
  Search,
  ArrowRight,
  AlertCircle,
  FolderTree,
  FileText,
  Package,
  Boxes,
  Database,
  Lock,
  TestTube,
  Wrench,
  CheckCircle2,
  Terminal,
  Activity,
  Code2,
  Server,
  Folder,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';
import { normalizeErrorMessage } from '@/lib/errorUtils';

interface CodebaseIntelligenceTabProps {
  initialRepoFullName?: string;
  preloadedIndex?: RepositoryIndex | null;
}

type SubTab =
  | 'overview'
  | 'techstack'
  | 'architecture'
  | 'structure'
  | 'dependencies'
  | 'symbols'
  | 'relationships'
  | 'files'
  | 'dataflow';

export const CodebaseIntelligenceTab: React.FC<CodebaseIntelligenceTabProps> = ({
  initialRepoFullName = 'Gopalkrishna10845445/devpulse-ai',
  preloadedIndex,
}) => {
  const [repoInput, setRepoInput] = useState(initialRepoFullName);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<CodebaseIntelligence | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [depSearchQuery, setDepSearchQuery] = useState('');
  const [depCategoryFilter, setDepCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setRepoInput(initialRepoFullName);
    setIntelligence(null);
    setErrorMsg(null);
    setAnalysisStep('idle');

    // Auto-trigger analysis for the repository
    if (initialRepoFullName) {
      runAnalysis(initialRepoFullName);
    }

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [initialRepoFullName]);

  const runAnalysis = async (targetRepo: string, forceRefresh = false) => {
    if (!targetRepo.trim()) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalysisStep('Ingesting repository tree & dependency manifests...');

    try {
      setAnalysisStep('Parsing language-aware symbols & resolving imports...');
      const trimmedRepo = targetRepo.trim();
      const isHttp = trimmedRepo.startsWith('http://') || trimmedRepo.startsWith('https://');
      const hasSlash = trimmedRepo.includes('/');

      const res = await fetch('/api/codebase/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: hasSlash && !isHttp ? trimmedRepo : undefined,
          url: isHttp ? trimmedRepo : undefined,
          owner: !hasSlash && !isHttp ? trimmedRepo : undefined,
          index: preloadedIndex || undefined,
          forceRefresh,
        }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIntelligence(data.intelligence);
        setAnalysisStep('completed');
      } else {
        setErrorMsg(normalizeErrorMessage(data?.error, 'Codebase intelligence analysis failed.'));
        setAnalysisStep('failed');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg(normalizeErrorMessage(err?.message, 'Network error during codebase analysis.'));
        setAnalysisStep('failed');
      }
    } finally {
      if (abortRef.current === controller) {
        setIsAnalyzing(false);
      }
    }
  };

  const handleAnalyze = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    runAnalysis(repoInput, true);
  };

  const filteredSymbols = (intelligence?.symbols || []).filter(sym => {
    if (symbolFilter !== 'ALL' && sym.kind !== symbolFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        sym.name.toLowerCase().includes(q) ||
        sym.filePath.toLowerCase().includes(q) ||
        (sym.signature && sym.signature.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const dependenciesList = intelligence?.technologyStack?.dependencies || [];
  const filteredDependencies = dependenciesList.filter(dep => {
    if (depCategoryFilter === 'DEV' && !dep.isDev) return false;
    if (depCategoryFilter === 'PROD' && dep.isDev) return false;
    if (depSearchQuery) {
      const q = depSearchQuery.toLowerCase();
      return dep.name.toLowerCase().includes(q) || (dep.versionConstraint && dep.versionConstraint.toLowerCase().includes(q));
    }
    return true;
  });

  const metrics = intelligence?.metrics || {
    totalFiles: intelligence?.files?.length || 0,
    analyzedFiles: intelligence?.files?.length || 0,
    skippedFiles: 0,
    symbolsCount: intelligence?.symbols?.length || 0,
    totalLinesOfCode: intelligence?.files?.reduce((acc, f) => acc + f.loc, 0) || 0,
    modularityScore: intelligence?.architecture?.metrics?.modularityScore || 80,
    internalCouplingScore: intelligence?.architecture?.metrics?.internalCouplingScore || 0,
    languageDistribution: [],
  };

  const summary = intelligence?.summary || {
    overview: `${intelligence?.repository?.fullName || repoInput} codebase analysis.`,
    technologies: 'Languages and frameworks detected from source tree.',
    structure: 'Modular application structure.',
    majorModules: 'Core source modules.',
    executionModel: 'Standard execution model.',
    entrypoints: 'Application entrypoints.',
    engineeringObservations: ['Codebase indexed and analyzed.'],
  };

  const techStack = intelligence?.technologyStack || {
    languages: [],
    frameworks: [],
    dependencies: [],
    manifests: [],
    database: { detected: false, type: 'Not detected', evidence: [] },
    authentication: { detected: false, mechanism: 'Not detected', evidence: [] },
    testing: { detected: false, frameworks: [], testFileCount: 0, evidence: [] },
    buildAndDeployment: { detected: false, tools: [], configFiles: [], evidence: [] },
  };

  const patterns = intelligence?.patterns || {
    frontend: 'Not detected',
    backend: 'Not detected',
    api: 'Not detected',
    database: 'Not detected',
    authentication: 'Not detected',
    services: 'Not detected',
    utilities: 'Not detected',
    components: 'Not detected',
    hooks: 'Not detected',
    tests: 'Not detected',
    configuration: 'Not detected',
    infrastructure: 'Not detected',
    deployment: 'Not detected',
  };

  const structure = intelligence?.structure || {
    majorDirectories: [],
    importantFiles: [],
    entrypoints: intelligence?.architecture?.entrypoints || [],
    apiEndpoints: [],
    frontendComponents: [],
    services: [],
    models: [],
    configFiles: [],
    testFiles: [],
  };

  return (
    <div className="w-full flex flex-col space-y-6 stagger-fade-up">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-lg text-text-primary">Codebase Intelligence & Architecture</h2>
          <p className="text-body-sm text-text-muted mt-1">
            Deterministic technology stack detection, symbol parsing, import resolution, and architectural modeling.
          </p>
        </div>

        {intelligence && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-sm border border-border bg-surface-alt text-text-primary text-caption font-mono uppercase tracking-wider self-start sm:self-auto font-medium">
              {intelligence.projectType || intelligence.architecture.pattern}
            </span>
          </div>
        )}
      </div>

      {/* Analysis Trigger Bar */}
      <div className="p-4 rounded-md bg-surface border border-border space-y-3">
        <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 w-full relative">
            <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="e.g. Gopalkrishna10845445/devpulse-ai"
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
                <span>Analyzing Repository...</span>
              </>
            ) : (
              <>
                <Cpu size={14} />
                <span>Re-Analyze Codebase</span>
              </>
            )}
          </button>
        </form>

        {isAnalyzing && (
          <div className="flex items-center gap-2 text-caption text-text-muted font-mono pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-pulse" />
            <span>{analysisStep}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-md bg-surface-alt border border-border text-caption text-red-600 flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!intelligence && !isAnalyzing && !errorMsg && (
        <div className="p-12 rounded-md bg-surface border border-border text-center space-y-3">
          <Code2 size={32} className="mx-auto text-text-muted" />
          <h3 className="text-heading-sm text-text-primary">Ready to Analyze Codebase</h3>
          <p className="text-body-sm text-text-muted max-w-md mx-auto">
            Click &quot;Re-Analyze Codebase&quot; above to inspect the repository structure, detect frameworks, extract symbols, and model its architecture.
          </p>
        </div>
      )}

      {/* Intelligence Dashboard */}
      {intelligence && (
        <div className="space-y-6">
          {/* Top Structural Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-md bg-surface border border-border">
              <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Total Files</p>
              <p className="text-xl font-mono font-medium text-text-primary mt-1">{metrics.totalFiles}</p>
            </div>
            <div className="p-4 rounded-md bg-surface border border-border">
              <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Analyzed Files</p>
              <p className="text-xl font-mono font-medium text-text-primary mt-1">{metrics.analyzedFiles}</p>
            </div>
            <div className="p-4 rounded-md bg-surface border border-border">
              <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Code Symbols</p>
              <p className="text-xl font-mono font-medium text-text-primary mt-1">{metrics.symbolsCount}</p>
            </div>
            <div className="p-4 rounded-md bg-surface border border-border">
              <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Est. Lines of Code</p>
              <p className="text-xl font-mono font-medium text-text-primary mt-1">{metrics.totalLinesOfCode.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-md bg-surface border border-border">
              <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Modularity Score</p>
              <p className="text-xl font-mono font-medium text-text-primary mt-1">{metrics.modularityScore}/100</p>
            </div>
            <div className="p-4 rounded-md bg-surface border border-border">
              <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Coupling Score</p>
              <p className="text-xl font-mono font-medium text-text-primary mt-1">{metrics.internalCouplingScore}%</p>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-border pb-2 overflow-x-auto no-scrollbar text-xs">
            {[
              { id: 'overview', label: 'Overview & Summary', icon: Info },
              { id: 'techstack', label: 'Technology Stack', icon: Boxes },
              { id: 'architecture', label: 'Architecture & Patterns', icon: Layers },
              { id: 'structure', label: 'Repository Structure', icon: FolderTree },
              { id: 'dependencies', label: `Dependencies (${dependenciesList.length})`, icon: Package },
              { id: 'symbols', label: `Symbols (${intelligence.symbols.length})`, icon: Cpu },
              { id: 'relationships', label: `Module Edges (${intelligence.relationships.length})`, icon: GitMerge },
              { id: 'files', label: `Files (${intelligence.files.length})`, icon: FileCode },
              { id: 'dataflow', label: 'Data Flow', icon: Network },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as SubTab)}
                  className={`px-3 py-1.5 rounded-md text-caption font-mono transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    activeSubTab === tab.id
                      ? 'bg-surface-alt text-text-primary border border-border font-medium'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <Icon size={12} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 0: OVERVIEW & SUMMARY */}
          {activeSubTab === 'overview' && (
            <div className="space-y-5">
              {/* Executive Summary Card */}
              <div className="p-5 rounded-md bg-surface border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-text-secondary" />
                    <h3 className="text-heading-sm text-text-primary">Engineering Codebase Summary</h3>
                  </div>
                  <span className="text-caption font-mono text-text-muted">{intelligence.durationMs}ms duration</span>
                </div>

                <p className="text-body-sm text-text-primary leading-relaxed">{summary.overview}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase text-text-muted">Technologies & Libraries</p>
                    <p className="text-caption text-text-secondary leading-relaxed">{summary.technologies}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase text-text-muted">Directory Layout</p>
                    <p className="text-caption text-text-secondary leading-relaxed">{summary.structure}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase text-text-muted">Major Modules</p>
                    <p className="text-caption text-text-secondary leading-relaxed">{summary.majorModules}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase text-text-muted">Execution Model</p>
                    <p className="text-caption text-text-secondary leading-relaxed">{summary.executionModel}</p>
                  </div>
                </div>
              </div>

              {/* Key Engineering Observations */}
              <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                <h4 className="text-caption font-mono uppercase tracking-wider text-text-secondary">
                  Key Deterministic Observations
                </h4>
                <div className="space-y-2">
                  {summary.engineeringObservations.map((obs, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-body-sm text-text-secondary">
                      <CheckCircle2 size={14} className="text-text-primary mt-0.5 flex-shrink-0" />
                      <span>{obs}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Language Distribution */}
              {metrics.languageDistribution.length > 0 && (
                <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                  <h4 className="text-caption font-mono uppercase tracking-wider text-text-secondary">
                    Programming Language Distribution
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {metrics.languageDistribution.map((lang, idx) => (
                      <div key={idx} className="p-3 rounded-md bg-surface-alt border border-border flex items-center justify-between">
                        <div>
                          <p className="font-mono font-medium text-body-sm text-text-primary">{lang.language}</p>
                          <p className="text-text-muted font-mono text-[11px]">{lang.filesCount} files ({(lang.bytes / 1024).toFixed(1)} KB)</p>
                        </div>
                        <span className="text-heading-sm font-mono text-text-primary">{lang.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: TECHNOLOGY STACK */}
          {activeSubTab === 'techstack' && (
            <div className="space-y-5">
              {/* Stack Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Languages */}
                <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Code2 size={16} className="text-text-secondary" />
                    <h4 className="text-heading-sm text-text-primary">Languages</h4>
                  </div>
                  <div className="space-y-2">
                    {techStack.languages.length === 0 ? (
                      <p className="text-caption text-text-muted font-mono">No language summary available</p>
                    ) : (
                      techStack.languages.map((l, i) => (
                        <div key={i} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-text-primary font-medium">{l.name}</span>
                          <span className="text-text-muted">{l.fileCount} files ({l.percentage}%)</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Frameworks */}
                <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Boxes size={16} className="text-text-secondary" />
                    <h4 className="text-heading-sm text-text-primary">Frameworks</h4>
                  </div>
                  <div className="space-y-2">
                    {techStack.frameworks.length === 0 ? (
                      <p className="text-caption text-text-muted font-mono">No external frameworks detected</p>
                    ) : (
                      techStack.frameworks.map((f, i) => (
                        <div key={i} className="p-2.5 rounded-sm bg-surface-alt border border-border space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-medium text-text-primary text-xs">{f.name}</span>
                            <span className="px-1.5 py-0.5 rounded-sm bg-surface border border-border text-[10px] font-mono text-text-muted uppercase">
                              {f.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted font-mono">{f.evidence.join('; ')}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Database */}
                <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-text-secondary" />
                    <h4 className="text-heading-sm text-text-primary">Database & Storage</h4>
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-body-sm text-text-primary font-medium">
                      {techStack.database.detected ? techStack.database.type : 'Not detected'}
                    </p>
                    {techStack.database.evidence.map((ev, i) => (
                      <p key={i} className="text-[11px] text-text-muted font-mono">• {ev}</p>
                    ))}
                  </div>
                </div>

                {/* Authentication */}
                <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-text-secondary" />
                    <h4 className="text-heading-sm text-text-primary">Authentication & Security</h4>
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-body-sm text-text-primary font-medium">
                      {techStack.authentication.detected ? techStack.authentication.mechanism : 'Not detected'}
                    </p>
                    {techStack.authentication.evidence.map((ev, i) => (
                      <p key={i} className="text-[11px] text-text-muted font-mono">• {ev}</p>
                    ))}
                  </div>
                </div>

                {/* Testing */}
                <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <TestTube size={16} className="text-text-secondary" />
                    <h4 className="text-heading-sm text-text-primary">Testing Infrastructure</h4>
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-body-sm text-text-primary font-medium">
                      {techStack.testing.detected
                        ? `${techStack.testing.frameworks.join(', ')} (${techStack.testing.testFileCount} test files)`
                        : 'Not detected'}
                    </p>
                    {techStack.testing.evidence.map((ev, i) => (
                      <p key={i} className="text-[11px] text-text-muted font-mono">• {ev}</p>
                    ))}
                  </div>
                </div>

                {/* Build & Deployment */}
                <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-text-secondary" />
                    <h4 className="text-heading-sm text-text-primary">Build & Tooling</h4>
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono text-body-sm text-text-primary font-medium">
                      {techStack.buildAndDeployment.detected
                        ? techStack.buildAndDeployment.tools.join(', ')
                        : 'Standard defaults'}
                    </p>
                    {techStack.buildAndDeployment.evidence.map((ev, i) => (
                      <p key={i} className="text-[11px] text-text-muted font-mono">• {ev}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ARCHITECTURE & PATTERNS */}
          {activeSubTab === 'architecture' && (
            <div className="space-y-5">
              {/* Pattern Overview Card */}
              <div className="p-5 rounded-md bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree size={16} className="text-text-secondary" />
                    <h3 className="text-heading-sm text-text-primary">{intelligence.architecture.pattern}</h3>
                  </div>
                  <span className="text-caption font-mono text-text-muted">{intelligence.durationMs}ms duration</span>
                </div>
                <p className="text-body-sm text-text-secondary leading-relaxed">{intelligence.architecture.summary}</p>
              </div>

              {/* Architectural Patterns Matrix */}
              <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                <h4 className="text-caption font-mono uppercase tracking-wider text-text-secondary">
                  Detected Architectural Dimensions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(patterns).map(([key, value], idx) => (
                    <div key={idx} className="p-3 rounded-md bg-surface-alt border border-border space-y-1">
                      <p className="text-[10px] uppercase font-mono text-text-muted">{key}</p>
                      <p className="text-caption font-mono text-text-primary font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architectural Layers Stack */}
              <div className="space-y-3">
                <h4 className="text-caption font-mono uppercase tracking-wider text-text-secondary">
                  Structural Tiers & Layer Decomposition
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {intelligence.architecture.layers.map((layer, idx) => (
                    <div key={idx} className="p-4 rounded-md bg-surface border border-border space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-body-sm text-text-primary">{layer.name}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-surface-alt text-text-muted border border-border">
                              {layer.path}
                            </span>
                          </div>
                          <p className="font-mono text-caption text-text-muted mt-0.5">{layer.role}</p>
                        </div>
                        <span className="text-caption font-mono text-text-secondary">{layer.symbolCount} symbols</span>
                      </div>

                      <p className="text-body-sm text-text-secondary leading-relaxed">{layer.description}</p>

                      {layer.keySymbols.length > 0 && (
                        <div className="pt-2 border-t border-border space-y-1">
                          <p className="text-[10px] uppercase font-mono text-text-muted">Key Exported Symbols:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {layer.keySymbols.map((sym, sIdx) => (
                              <span key={sIdx} className="px-2 py-0.5 rounded-sm bg-surface-alt text-[11px] font-mono text-text-primary border border-border">
                                {sym}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REPOSITORY STRUCTURE */}
          {activeSubTab === 'structure' && (
            <div className="space-y-5">
              {/* Major Directories */}
              <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                <h4 className="text-caption font-mono uppercase tracking-wider text-text-secondary">
                  Major Architectural Directories
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {structure.majorDirectories.map((dir, idx) => (
                    <div key={idx} className="p-3.5 rounded-md bg-surface-alt border border-border flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Folder size={14} className="text-text-secondary" />
                          <span className="font-mono font-medium text-body-sm text-text-primary">{dir.path}</span>
                        </div>
                        <p className="text-[11px] text-text-muted font-mono">{dir.purpose}</p>
                      </div>
                      <div className="text-right font-mono text-caption text-text-muted">
                        <p>{dir.fileCount} files</p>
                        <p className="text-[10px]">{(dir.bytes / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Important Files */}
              <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                <h4 className="text-caption font-mono uppercase tracking-wider text-text-secondary">
                  Important Source Files & Roles
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {structure.importantFiles.map((file, idx) => (
                    <div key={idx} className="p-3 rounded-md bg-surface-alt border border-border flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono font-medium text-xs text-text-primary">{file.path}</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{file.description}</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-sm bg-surface border border-border text-[10px] font-mono text-text-secondary whitespace-nowrap">
                        {file.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEPENDENCIES */}
          {activeSubTab === 'dependencies' && (
            <div className="space-y-3">
              {/* Filter Bar */}
              <div className="p-3 rounded-md bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-72 relative">
                  <input
                    type="text"
                    placeholder="Search dependencies..."
                    value={depSearchQuery}
                    onChange={(e) => setDepSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-surface-alt border border-border text-body-sm text-text-primary font-mono focus:outline-none focus:border-border-strong"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {['ALL', 'PROD', 'DEV'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setDepCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-sm font-mono text-caption transition-colors ${
                        depCategoryFilter === cat
                          ? 'bg-surface-alt text-text-primary border border-border font-medium'
                          : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {cat === 'ALL' ? 'All Packages' : cat === 'PROD' ? 'Production' : 'DevDependencies'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md bg-surface border border-border overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-surface-alt border-b border-border text-[10px] uppercase text-text-muted sticky top-0">
                      <tr>
                        <th className="p-3">Package Name</th>
                        <th className="p-3">Version Constraint</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Ecosystem</th>
                        <th className="p-3">Manifest</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredDependencies.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-text-muted">
                            No dependencies found matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredDependencies.map((dep, idx) => (
                          <tr key={idx} className="hover:bg-surface-alt/50 transition-colors">
                            <td className="p-3 font-medium text-text-primary">{dep.name}</td>
                            <td className="p-3 text-text-muted">{dep.versionConstraint || 'latest'}</td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 rounded-sm text-[10px] ${dep.isDev ? 'bg-surface-alt text-text-muted border border-border' : 'bg-surface-alt text-text-primary border border-border font-medium'}`}>
                                {dep.isDev ? 'dev' : 'prod'}
                              </span>
                            </td>
                            <td className="p-3 text-text-muted">{dep.ecosystem}</td>
                            <td className="p-3 text-text-muted">{dep.manifestPath}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CODE SYMBOLS EXPLORER */}
          {activeSubTab === 'symbols' && (
            <div className="space-y-3">
              {/* Filter and Search Bar */}
              <div className="p-3 rounded-md bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-72 relative">
                  <input
                    type="text"
                    placeholder="Filter symbols..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-surface-alt border border-border text-body-sm text-text-primary font-mono focus:outline-none focus:border-border-strong"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                  {['ALL', 'component', 'endpoint', 'function', 'class', 'interface', 'type_alias', 'struct'].map((kind) => (
                    <button
                      key={kind}
                      onClick={() => setSymbolFilter(kind)}
                      className={`px-2 py-0.5 rounded-sm font-mono text-[11px] transition-colors whitespace-nowrap ${
                        symbolFilter === kind
                          ? 'bg-surface-alt text-text-primary border border-border font-medium'
                          : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      {kind}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symbols Table */}
              <div className="rounded-md bg-surface border border-border overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-surface-alt border-b border-border text-[10px] uppercase text-text-muted sticky top-0">
                      <tr>
                        <th className="p-3">Symbol Name</th>
                        <th className="p-3">Kind</th>
                        <th className="p-3">File Path</th>
                        <th className="p-3">Exported</th>
                        <th className="p-3">Signature</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSymbols.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-text-muted">
                            No symbols found matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredSymbols.map((sym, idx) => (
                          <tr key={idx} className="hover:bg-surface-alt/50 transition-colors">
                            <td className="p-3 font-medium text-text-primary">{sym.name}</td>
                            <td className="p-3">
                              <span className="px-1.5 py-0.5 rounded-sm text-[10px] bg-surface-alt text-text-secondary border border-border uppercase">
                                {sym.kind}
                              </span>
                            </td>
                            <td className="p-3 text-text-muted truncate max-w-xs">{sym.filePath}</td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 rounded-sm text-[10px] ${sym.isExported ? 'text-text-primary bg-surface-alt border border-border' : 'text-text-muted'}`}>
                                {sym.isExported ? 'yes' : 'no'}
                              </span>
                            </td>
                            <td className="p-3 text-text-muted truncate max-w-md">{sym.signature || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MODULE RELATIONSHIPS */}
          {activeSubTab === 'relationships' && (
            <div className="space-y-3">
              {intelligence.relationships.length === 0 ? (
                <div className="p-8 rounded-md bg-surface border border-border text-center text-body-sm text-text-muted">
                  No inter-module import relationships detected.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {intelligence.relationships.map((rel, idx) => (
                    <div key={idx} className="p-4 rounded-md bg-surface border border-border space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono text-caption">
                          <span className="text-text-primary font-medium">{rel.fromModule}</span>
                          <ArrowRight size={12} className="text-text-muted" />
                          <span className="text-text-secondary">{rel.toModule}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-sm bg-surface-alt border border-border font-mono text-[10px] text-text-muted">
                          {rel.importCount} imports
                        </span>
                      </div>

                      <div className="space-y-1 text-caption font-mono text-text-muted border-t border-border pt-2">
                        <p className="text-[10px] uppercase font-mono text-text-muted">Sample Linkages:</p>
                        {rel.sampleImports.map((samp, sIdx) => (
                          <p key={sIdx} className="pl-2 text-text-secondary">• {samp}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: FILE INTELLIGENCE */}
          {activeSubTab === 'files' && (
            <div className="rounded-md bg-surface border border-border overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-surface-alt border-b border-border text-[10px] uppercase text-text-muted sticky top-0">
                    <tr>
                      <th className="p-3">File Path</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">LOC</th>
                      <th className="p-3">Symbols</th>
                      <th className="p-3">Dependencies</th>
                      <th className="p-3">Dependents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {intelligence.files.map((file, idx) => (
                      <tr key={idx} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="p-3 text-text-primary font-medium">{file.filePath}</td>
                        <td className="p-3">
                          <span className="px-1.5 py-0.5 rounded-sm text-[10px] bg-surface-alt border border-border text-text-secondary">
                            {file.role}
                          </span>
                        </td>
                        <td className="p-3 text-text-muted">{file.loc}</td>
                        <td className="p-3 text-text-secondary">{file.symbols.length}</td>
                        <td className="p-3 text-text-muted">{file.internalDependencies.length}</td>
                        <td className="p-3 text-text-primary font-medium">{file.dependents.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: DATA FLOW & ENTRYPOINTS */}
          {activeSubTab === 'dataflow' && (
            <div className="space-y-4">
              {/* Entrypoints */}
              <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                <h4 className="text-caption font-mono uppercase tracking-wider text-text-secondary">
                  System Entrypoints & Request Handlers ({intelligence.architecture.entrypoints.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {intelligence.architecture.entrypoints.map((ep, idx) => (
                    <div key={idx} className="p-3 rounded-md bg-surface-alt border border-border flex items-start justify-between gap-3 text-xs">
                      <div>
                        <p className="font-mono font-medium text-text-primary">{ep.path}</p>
                        <p className="text-text-muted text-[11px] mt-0.5">{ep.description}</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-sm bg-surface border border-border text-text-muted font-mono text-[10px] uppercase">
                        {ep.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Flow Arcs */}
              <div className="p-5 rounded-md bg-surface border border-border space-y-3">
                <h4 className="text-caption font-mono uppercase tracking-wider text-text-secondary">
                  End-to-End Architectural Data Flow
                </h4>

                <div className="space-y-2">
                  {intelligence.architecture.dataFlow.map((arc, idx) => (
                    <div key={idx} className="p-3 rounded-md bg-surface-alt border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-medium text-text-primary">{arc.from}</span>
                        <ArrowRight size={12} className="text-text-muted" />
                        <span className="text-text-secondary">{arc.to}</span>
                      </div>
                      <p className="text-text-muted text-[11px]">{arc.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
