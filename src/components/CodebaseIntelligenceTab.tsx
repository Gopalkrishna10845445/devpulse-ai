'use client';

import React, { useState } from 'react';
import { CodebaseIntelligence } from '@/lib/intelligence/types';
import { RepositoryIndex } from '@/lib/repository/types';

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
    <div className="w-full flex flex-col space-y-5 stagger-fade-up">
      
      {/* Title & Description */}
      <div className="pt-1 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-on-surface mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-400 text-[26px]">schema</span>
            <span>Codebase Intelligence & Architecture</span>
          </h2>
          <p className="text-xs text-on-surface-variant">
            Deterministic symbol extraction, import dependency graphs, module coupling, and architectural modeling.
          </p>
        </div>

        {intelligence && (
          <span className="px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/15 text-purple-300 text-xs font-mono font-semibold uppercase tracking-wider">
            {intelligence.architecture.pattern}
          </span>
        )}
      </div>

      {/* Analysis Trigger Bar */}
      <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3 shadow-sm">
        <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 w-full relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
              hub
            </span>
            <input
              type="text"
              placeholder="e.g. Gopalkrishna10845445/devpulse-ai"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-lowest border border-border-subtle text-xs text-on-surface font-mono focus:outline-none focus:border-purple-400"
            />
          </div>

          <button
            type="submit"
            disabled={isAnalyzing || !repoInput.trim()}
            className="w-full sm:w-auto px-5 py-2 rounded-lg bg-purple-500 text-white font-semibold text-xs hover:bg-purple-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm shadow-purple-500/20"
          >
            {isAnalyzing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analyzing Architecture...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">account_tree</span>
                <span>Analyze Codebase Intelligence</span>
              </>
            )}
          </button>
        </form>

        {isAnalyzing && (
          <div className="flex items-center gap-2 text-xs text-purple-400 font-mono pt-1">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>{analysisStep}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-semantic-red/10 border border-semantic-red/30 text-xs text-red-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Intelligence Dashboard */}
      {intelligence && (
        <div className="space-y-5">
          
          {/* Top Structural Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Analyzed Files</p>
              <p className="text-xl font-headline font-bold text-on-surface">{intelligence.architecture.metrics.totalFilesAnalyzed}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Code Symbols</p>
              <p className="text-xl font-headline font-bold text-purple-300">{intelligence.architecture.metrics.totalSymbolsFound}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Internal Imports</p>
              <p className="text-xl font-headline font-bold text-cyan-400">{intelligence.architecture.metrics.totalImportsResolved}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Module Edges</p>
              <p className="text-xl font-headline font-bold text-semantic-emerald">{intelligence.relationships.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Modularity Score</p>
              <p className="text-xl font-headline font-bold text-semantic-emerald">{intelligence.architecture.metrics.modularityScore}/100</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Coupling Ratio</p>
              <p className="text-xl font-headline font-bold text-semantic-amber">{intelligence.architecture.metrics.internalCouplingScore}%</p>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-border-subtle pb-2 overflow-x-auto no-scrollbar text-xs">
            {[
              { id: 'architecture', label: 'Architectural Model & Layers', icon: 'view_quilt' },
              { id: 'symbols', label: `Code Symbols (${intelligence.symbols.length})`, icon: 'code_blocks' },
              { id: 'relationships', label: `Module Relationships (${intelligence.relationships.length})`, icon: 'mediation' },
              { id: 'files', label: `File Intelligence (${intelligence.files.length})`, icon: 'folder_data' },
              { id: 'dataflow', label: 'Data Flow & Entrypoints', icon: 'route' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeSubTab === tab.id
                    ? 'bg-surface-container-low text-primary border border-border-subtle'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: ARCHITECTURAL MODEL & LAYERS */}
          {activeSubTab === 'architecture' && (
            <div className="space-y-4">
              
              {/* Pattern Overview Card */}
              <div className="p-5 rounded-xl bg-surface border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400 text-[20px]">architecture</span>
                    <h3 className="font-headline font-bold text-base text-primary">{intelligence.architecture.pattern}</h3>
                  </div>
                  <span className="text-[11px] font-mono text-on-surface-variant">{intelligence.durationMs}ms analysis duration</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">{intelligence.architecture.summary}</p>
              </div>

              {/* Architectural Layers Stack */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">layers</span>
                  <span>Structural Tiers & Layer Decomposition</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {intelligence.architecture.layers.map((layer, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-surface border border-border-subtle space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-headline font-bold text-sm text-primary">{layer.name}</span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-cyan-300 border border-border-subtle">
                              {layer.path}
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">{layer.role}</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-purple-300">{layer.symbolCount} symbols</span>
                      </div>

                      <p className="text-xs text-on-surface-variant leading-relaxed">{layer.description}</p>

                      {layer.keySymbols.length > 0 && (
                        <div className="pt-2 border-t border-border-subtle space-y-1">
                          <p className="text-[10px] font-semibold text-on-surface-variant uppercase">Key Exported Symbols:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {layer.keySymbols.map((sym, sIdx) => (
                              <span key={sIdx} className="px-2 py-0.5 rounded bg-surface-container-lowest text-[10px] font-mono text-on-surface border border-border-subtle">
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
              <div className="p-4 rounded-xl bg-surface border border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-72 relative">
                  <input
                    type="text"
                    placeholder="Search symbols by name or file..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-border-subtle text-xs text-on-surface font-mono focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                  {['ALL', 'component', 'function', 'class', 'interface', 'type_alias', 'endpoint', 'struct'].map(kind => (
                    <button
                      key={kind}
                      onClick={() => setSymbolFilter(kind)}
                      className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors whitespace-nowrap ${
                        symbolFilter === kind
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {kind}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symbols Table */}
              <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-surface-container-lowest border-b border-border-subtle text-[10px] uppercase text-on-surface-variant sticky top-0">
                      <tr>
                        <th className="p-3">Symbol Name</th>
                        <th className="p-3">Kind</th>
                        <th className="p-3">File Path</th>
                        <th className="p-3">Exported</th>
                        <th className="p-3">Signature</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {filteredSymbols.map((sym, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-semibold text-primary">{sym.name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-surface-container-high text-cyan-300 uppercase">
                              {sym.kind}
                            </span>
                          </td>
                          <td className="p-3 text-on-surface-variant truncate max-w-xs">{sym.filePath}</td>
                          <td className="p-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${sym.isExported ? 'text-semantic-emerald bg-semantic-emerald/10' : 'text-on-surface-variant'}`}>
                              {sym.isExported ? 'yes' : 'no'}
                            </span>
                          </td>
                          <td className="p-3 text-on-surface-variant truncate max-w-md">{sym.signature || '-'}</td>
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
                <div className="p-8 rounded-xl bg-surface border border-border-subtle text-center text-xs text-on-surface-variant">
                  No inter-module import relationships detected.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {intelligence.relationships.map((rel, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-surface border border-border-subtle space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                          <span className="text-cyan-400">{rel.fromModule}</span>
                          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">arrow_forward</span>
                          <span className="text-purple-300">{rel.toModule}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-surface-container-high font-mono text-[10px] text-on-surface">
                          {rel.importCount} imports
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] font-mono text-on-surface-variant border-t border-border-subtle pt-2">
                        <p className="text-[10px] uppercase font-semibold text-on-surface-variant">Sample Linkages:</p>
                        {rel.sampleImports.map((samp, sIdx) => (
                          <p key={sIdx} className="pl-2 text-on-surface/80">• {samp}</p>
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
            <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-surface-container-lowest border-b border-border-subtle text-[10px] uppercase text-on-surface-variant sticky top-0">
                    <tr>
                      <th className="p-3">File Path</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">LOC</th>
                      <th className="p-3">Symbols</th>
                      <th className="p-3">Dependencies</th>
                      <th className="p-3">Dependents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {intelligence.files.map((file, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-primary font-semibold">{file.filePath}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-surface-container-high text-cyan-300">
                            {file.role}
                          </span>
                        </td>
                        <td className="p-3 text-on-surface-variant">{file.loc}</td>
                        <td className="p-3 text-purple-300">{file.symbols.length}</td>
                        <td className="p-3 text-on-surface-variant">{file.internalDependencies.length}</td>
                        <td className="p-3 text-semantic-emerald">{file.dependents.length}</td>
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
              <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">login</span>
                  <span>System Entrypoints & Request Handlers ({intelligence.architecture.entrypoints.length})</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {intelligence.architecture.entrypoints.map((ep, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg bg-surface-container-lowest border border-border-subtle flex items-start justify-between gap-3 text-xs">
                      <div>
                        <p className="font-mono font-semibold text-primary">{ep.path}</p>
                        <p className="text-on-surface-variant text-[11px] mt-0.5">{ep.description}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-surface-container-high text-cyan-300 font-mono text-[10px] uppercase">
                        {ep.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Flow Arcs */}
              <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-semantic-emerald">timeline</span>
                  <span>End-to-End Architectural Data Flow</span>
                </h4>

                <div className="space-y-2">
                  {intelligence.architecture.dataFlow.map((arc, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg bg-surface-container-lowest border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-primary">{arc.from}</span>
                        <span className="material-symbols-outlined text-[14px] text-semantic-emerald">arrow_forward</span>
                        <span className="font-bold text-cyan-400">{arc.to}</span>
                      </div>
                      <p className="text-on-surface-variant text-[11px]">{arc.description}</p>
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
