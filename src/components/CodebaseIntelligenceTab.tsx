'use client';

import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';

interface CodebaseIntelligenceTabProps {
  initialRepoFullName?: string;
  preloadedIndex?: RepositoryIndex | null;
}

export const CodebaseIntelligenceTab: React.FC<CodebaseIntelligenceTabProps> = ({
  initialRepoFullName = 'Gopalkrishna10845445/devpulse-ai',
  preloadedIndex,
}) => {
  const [repoInput, setRepoInput] = useState(initialRepoFullName);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<CodebaseIntelligence | null>(null);

  React.useEffect(() => {
    setRepoInput(initialRepoFullName);
    setIntelligence(null);
    setErrorMsg(null);
    setAnalysisStep('idle');
  }, [initialRepoFullName]);
  const [activeSubTab, setActiveSubTab] = useState<'architecture' | 'symbols' | 'relationships' | 'files' | 'dataflow'>('architecture');
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!repoInput.trim()) return;

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalysisStep('Ingesting repository tree & manifests...');

    try {
      setAnalysisStep('Parsing language-aware symbols & resolving imports...');
      const res = await fetch('/api/codebase/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: repoInput.includes('/') ? repoInput : undefined,
          url: repoInput.startsWith('http') ? repoInput : undefined,
          owner: !repoInput.includes('/') && !repoInput.startsWith('http') ? repoInput : undefined,
          index: preloadedIndex || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIntelligence(data.intelligence);
        setAnalysisStep('completed');
      } else {
        setErrorMsg(data.error?.message || 'Codebase intelligence analysis failed.');
        setAnalysisStep('failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error during codebase analysis.');
      setAnalysisStep('failed');
    } finally {
      setIsAnalyzing(false);
    }
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

  return (
    <div className="w-full flex flex-col space-y-6 stagger-fade-up">
      
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-lg text-text-primary">Codebase Intelligence & Architecture</h2>
          <p className="text-body-sm text-text-muted mt-1">
            Deterministic symbol extraction, import dependency graphs, module coupling, and architectural modeling.
          </p>
        </div>

        {intelligence && (
          <span className="px-3 py-1 rounded-sm border border-border bg-surface-alt text-text-secondary text-caption font-mono uppercase tracking-wider self-start sm:self-auto">
            {intelligence.architecture.pattern}
          </span>
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
                <span>Analyzing Architecture...</span>
              </>
            ) : (
              <>
                <Cpu size={14} />
                <span>Analyze Codebase</span>
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

      {/* Intelligence Dashboard */}
      {intelligence && (
        <div className="space-y-6">
          
          {/* Top Structural Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-md bg-surface border border-border">
              <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Analyzed Files</p>
              <p className="text-xl font-mono font-medium text-text-primary mt-1">{intelligence.architecture.metrics.totalFilesAnalyzed}</p>
            </div>
            <div className="p-4 rounded-md bg-surface border border-border">
              <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Code Symbols</p>
              <p className="text-xl font-mono font-medium text-text-primary mt-1">{intelligence.architecture.metrics.totalSymbolsFound}</p>
            </div>
            <div className="p-4 rounded-md bg-surface border border-border">
              <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Internal Imports</p>
              <p className="text-xl font-mono font-medium text-text-primary mt-1">{intelligence.architecture.metrics.totalImportsResolved}</p>
            </div>
            <div className="p-4 rounded-md bg-surface border border-border">
              <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Module Edges</p>
              <p className="text-xl font-mono font-medium text-text-primary mt-1">{intelligence.relationships.length}</p>
            </div>
            <div className="p-4 rounded-md bg-surface border border-border">
              <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Modularity</p>
              <p className="text-xl font-mono font-medium text-text-primary mt-1">{intelligence.architecture.metrics.modularityScore}/100</p>
            </div>
            <div className="p-4 rounded-md bg-surface border border-border">
              <p className="text-[10px] text-text-muted uppercase font-mono tracking-wider">Coupling Ratio</p>
              <p className="text-xl font-mono font-medium text-text-primary mt-1">{intelligence.architecture.metrics.internalCouplingScore}%</p>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-border pb-2 overflow-x-auto no-scrollbar text-xs">
            {[
              { id: 'architecture', label: 'Architectural Model', icon: Layers },
              { id: 'symbols', label: `Symbols (${intelligence.symbols.length})`, icon: Cpu },
              { id: 'relationships', label: `Relationships (${intelligence.relationships.length})`, icon: GitMerge },
              { id: 'files', label: `Files (${intelligence.files.length})`, icon: FileCode },
              { id: 'dataflow', label: 'Data Flow', icon: Network },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
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

          {/* TAB 1: ARCHITECTURAL MODEL & LAYERS */}
          {activeSubTab === 'architecture' && (
            <div className="space-y-4">
              
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

          {/* TAB 2: CODE SYMBOLS EXPLORER */}
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
                  {['ALL', 'component', 'function', 'class', 'interface', 'type_alias', 'endpoint', 'struct'].map(kind => (
                    <button
                      key={kind}
                      onClick={() => setSymbolFilter(kind)}
                      className={`px-2 py-0.5 rounded-sm font-mono text-[11px] transition-colors whitespace-nowrap ${
                        symbolFilter === kind
                          ? 'bg-surface-alt text-text-primary border border-border-strong font-medium'
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
                      {filteredSymbols.map((sym, idx) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: MODULE RELATIONSHIPS */}
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

          {/* TAB 4: FILE INTELLIGENCE */}
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

          {/* TAB 5: DATA FLOW & ENTRYPOINTS */}
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
