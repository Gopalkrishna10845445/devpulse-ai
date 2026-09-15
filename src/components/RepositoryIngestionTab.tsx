'use client';

import React, { useState } from 'react';
import {
  RepositoryIndex,
  IngestionStatusCode,
} from '@/lib/repository/types';

interface RepositoryIngestionTabProps {
  initialRepoFullName?: string;
}

export const RepositoryIngestionTab: React.FC<RepositoryIngestionTabProps> = ({
  initialRepoFullName = 'Gopalkrishna10845445/devpulse-ai',
}) => {
  const [repoInput, setRepoInput] = useState(initialRepoFullName);
  const [branchInput, setBranchInput] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionStep, setIngestionStep] = useState<string>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [index, setIndex] = useState<RepositoryIndex | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'dependencies' | 'files' | 'skipped'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const handleIngest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!repoInput.trim()) return;

    setIsIngesting(true);
    setErrorMsg(null);
    setIngestionStep('Connecting to GitHub API...');

    try {
      setIngestionStep('Retrieving repository tree & files...');
      const res = await fetch('/api/repository/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: repoInput.includes('/') ? repoInput : undefined,
          url: repoInput.startsWith('http') ? repoInput : undefined,
          owner: !repoInput.includes('/') && !repoInput.startsWith('http') ? repoInput : undefined,
          branch: branchInput.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIndex(data.index);
        setIngestionStep('completed');
      } else {
        setErrorMsg(data.error?.message || 'Repository ingestion failed.');
        setIngestionStep('failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error during ingestion.');
      setIngestionStep('failed');
    } finally {
      setIsIngesting(false);
    }
  };

  const getStatusBadge = (status: IngestionStatusCode) => {
    switch (status) {
      case 'complete':
        return 'bg-semantic-emerald/15 text-emerald-400 border-semantic-emerald/30';
      case 'partial':
        return 'bg-semantic-amber/15 text-amber-300 border-semantic-amber/30';
      case 'rate_limited':
        return 'bg-semantic-amber/15 text-amber-300 border-semantic-amber/30';
      case 'failed':
        return 'bg-semantic-red/15 text-red-400 border-semantic-red/30';
      default:
        return 'bg-surface-container border-border-subtle text-on-surface-variant';
    }
  };

  return (
    <div className="w-full flex flex-col space-y-5 stagger-fade-up">
      
      {/* Title & Description */}
      <div className="pt-1 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-headline text-2xl font-semibold text-on-surface mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400 text-[26px]">account_tree</span>
            <span>Repository Ingestion & Indexing</span>
          </h2>
          <p className="text-xs text-on-surface-variant">
            Deterministic code structural ingestion, file classification, framework extraction, and module mapping.
          </p>
        </div>

        {index && (
          <span className={`px-3 py-1 rounded-full border text-xs font-mono font-semibold uppercase tracking-wider ${getStatusBadge(index.ingestion.status)}`}>
            {index.ingestion.status}
          </span>
        )}
      </div>

      {/* Ingestion Input Bar */}
      <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3 shadow-sm">
        <form onSubmit={handleIngest} className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 w-full relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
              folder_open
            </span>
            <input
              type="text"
              placeholder="e.g. Gopalkrishna10845445/devpulse-ai or https://github.com/owner/repo"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-lowest border border-border-subtle text-xs text-on-surface font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="w-full sm:w-36 relative">
            <input
              type="text"
              placeholder="Branch (optional)"
              value={branchInput}
              onChange={(e) => setBranchInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-border-subtle text-xs text-on-surface font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={isIngesting || !repoInput.trim()}
            className="w-full sm:w-auto px-5 py-2 rounded-lg bg-primary text-black font-semibold text-xs hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
          >
            {isIngesting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Ingesting...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                <span>Ingest & Index Repository</span>
              </>
            )}
          </button>
        </form>

        {isIngesting && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono pt-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>{ingestionStep}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-semantic-red/10 border border-semantic-red/30 text-xs text-red-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Ingestion Results Display */}
      {index && (
        <div className="space-y-5">
          
          {/* Repository Header & Key Stat Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Total Tree Nodes</p>
              <p className="text-xl font-headline font-bold text-on-surface">{index.ingestion.totalFilesCounted}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Indexed Files</p>
              <p className="text-xl font-headline font-bold text-semantic-emerald">{index.ingestion.indexedFilesCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Directories</p>
              <p className="text-xl font-headline font-bold text-cyan-400">{index.ingestion.directoryCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Modules</p>
              <p className="text-xl font-headline font-bold text-purple-300">{index.modules.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Dependencies</p>
              <p className="text-xl font-headline font-bold text-semantic-amber">{index.dependencies.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle">
              <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Skipped / Filtered</p>
              <p className="text-xl font-headline font-bold text-on-surface-variant">{index.ingestion.skippedFilesCount}</p>
            </div>
          </div>

          {/* Repository Metadata Bar */}
          <div className="p-4 rounded-xl bg-surface border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-primary">code</span>
              <div>
                <a
                  href={index.repository.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-headline font-bold text-sm text-primary hover:text-cyan-400 transition-colors flex items-center gap-1"
                >
                  {index.repository.fullName}
                  <span className="material-symbols-outlined text-[12px] text-on-surface-variant">open_in_new</span>
                </a>
                <p className="text-on-surface-variant text-[11px] mt-0.5">{index.repository.description || 'No description provided'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 font-mono text-[11px] text-on-surface-variant">
              <span>branch: <strong className="text-on-surface">{index.repository.defaultBranch}</strong></span>
              <span>★ <strong className="text-semantic-amber">{index.repository.stars}</strong></span>
              <span>forks: <strong className="text-on-surface">{index.repository.forks}</strong></span>
              <span>size: <strong className="text-on-surface">{index.repository.sizeKb} KB</strong></span>
              <span>time: <strong className="text-cyan-400">{index.ingestion.durationMs}ms</strong></span>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-border-subtle pb-2 overflow-x-auto no-scrollbar text-xs">
            {[
              { id: 'overview', label: 'Overview & Languages', icon: 'dashboard' },
              { id: 'modules', label: `Architectural Modules (${index.modules.length})`, icon: 'view_module' },
              { id: 'dependencies', label: `Dependencies (${index.dependencies.length})`, icon: 'inventory_2' },
              { id: 'files', label: `Indexed Files (${index.ingestion.indexedFilesCount})`, icon: 'article' },
              { id: 'skipped', label: `Skipped / Filtered (${index.skippedFiles.length})`, icon: 'filter_alt' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-surface-container-low text-primary border border-border-subtle'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW & LANGUAGES */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              
              {/* Language Distribution */}
              <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">data_array</span>
                  <span>Repository Language Distribution (by source bytes)</span>
                </h4>

                {index.languages.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">No recognized source code files indexed.</p>
                ) : (
                  <>
                    <div className="w-full h-2.5 rounded-full bg-surface-container-lowest overflow-hidden flex border border-border-subtle">
                      {index.languages.map((lang, idx) => (
                        <div
                          key={idx}
                          style={{ width: `${Math.max(1, lang.percentage)}%`, backgroundColor: lang.color || '#94a3b8' }}
                          className="h-full transition-all"
                          title={`${lang.name}: ${lang.percentage}% (${(lang.bytes / 1024).toFixed(1)} KB)`}
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      {index.languages.map((lang, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-surface-container-lowest border border-border-subtle flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lang.color || '#94a3b8' }} />
                            <span className="text-xs font-medium text-on-surface">{lang.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-primary">{lang.percentage}%</span>
                            <span className="text-[10px] font-mono text-on-surface-variant block">{lang.fileCount} files</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Detected Frameworks */}
              <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">layers</span>
                  <span>Detected Frameworks & Tooling ({index.frameworks.length})</span>
                </h4>

                {index.frameworks.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">No standard frameworks detected from manifests or configuration files.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {index.frameworks.map((fw, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-surface-container-lowest border border-border-subtle space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-headline font-bold text-sm text-primary">{fw.name}</span>
                            <span className="px-2 py-0.5 rounded bg-surface-container-high text-[10px] font-mono text-cyan-300 border border-border-subtle uppercase">
                              {fw.category}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-semantic-emerald/10 text-emerald-400 font-mono text-[10px] border border-semantic-emerald/30">
                            {fw.confidence} confidence
                          </span>
                        </div>

                        <div className="space-y-1 pt-1 border-t border-border-subtle text-[11px] text-on-surface-variant">
                          <p className="text-[10px] font-semibold text-on-surface-variant uppercase">Evidence Citations:</p>
                          {fw.evidence.map((ev, eIdx) => (
                            <p key={eIdx} className="font-mono text-on-surface/80 pl-2">• {ev}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: ARCHITECTURAL MODULES */}
          {activeTab === 'modules' && (
            <div className="space-y-3">
              {index.modules.length === 0 ? (
                <div className="p-8 rounded-xl bg-surface border border-border-subtle text-center text-xs text-on-surface-variant">
                  No structural module roots identified. Repository may have a flat structure.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {index.modules.map((mod, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-surface border border-border-subtle space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-headline font-semibold text-sm text-primary">{mod.name}</span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container-low text-cyan-300 border border-border-subtle">
                              {mod.detectedRole}
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">{mod.path}</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-on-surface">{mod.fileCount} files</span>
                      </div>

                      <p className="text-xs text-on-surface-variant leading-relaxed">{mod.description}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px] font-mono text-on-surface-variant">
                        <span>Language: <strong className="text-primary">{mod.primaryLanguage || 'Mixed'}</strong></span>
                        <span>Size: <strong className="text-on-surface">{(mod.totalBytes / 1024).toFixed(1)} KB</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DEPENDENCIES & MANIFESTS */}
          {activeTab === 'dependencies' && (
            <div className="space-y-4">
              
              {/* Manifest Headers */}
              <div className="flex flex-wrap gap-2">
                {index.manifests.map((m, idx) => (
                  <div key={idx} className="px-3 py-1.5 rounded-lg bg-surface border border-border-subtle flex items-center gap-2 text-xs font-mono">
                    <span className="material-symbols-outlined text-[16px] text-primary">description</span>
                    <span className="text-on-surface font-semibold">{m.path}</span>
                    <span className="text-on-surface-variant">({m.ecosystem} — {m.dependencyCount + m.devDependencyCount} pkgs)</span>
                  </div>
                ))}
              </div>

              {/* Dependencies Search & Table */}
              <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden">
                <div className="p-3 border-b border-border-subtle bg-surface-container-lowest">
                  <input
                    type="text"
                    placeholder="Search dependencies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs text-on-surface font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-surface-container-lowest border-b border-border-subtle text-[10px] uppercase text-on-surface-variant sticky top-0">
                      <tr>
                        <th className="p-3">Dependency Name</th>
                        <th className="p-3">Version Specifier</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Manifest</th>
                        <th className="p-3">Ecosystem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {index.dependencies
                        .filter(d => !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((dep, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 font-semibold text-primary">{dep.name}</td>
                            <td className="p-3 text-on-surface-variant">{dep.versionConstraint || '*'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${dep.isDev ? 'bg-surface-container-high text-on-surface-variant' : 'bg-cyan-500/10 text-cyan-300'}`}>
                                {dep.isDev ? 'dev' : 'prod'}
                              </span>
                            </td>
                            <td className="p-3 text-on-surface-variant">{dep.manifestPath}</td>
                            <td className="p-3 text-on-surface-variant uppercase text-[10px]">{dep.ecosystem}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: INDEXED SOURCE FILES */}
          {activeTab === 'files' && (
            <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden">
              <div className="p-3 border-b border-border-subtle bg-surface-container-lowest">
                <input
                  type="text"
                  placeholder="Filter indexed files by path..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border-subtle text-xs text-on-surface font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-surface-container-lowest border-b border-border-subtle text-[10px] uppercase text-on-surface-variant sticky top-0">
                    <tr>
                      <th className="p-3">File Path</th>
                      <th className="p-3">Language</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {index.files
                      .filter(f => f.status !== 'skipped')
                      .filter(f => !searchQuery || f.path.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((file, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-primary">{file.path}</td>
                          <td className="p-3 text-on-surface-variant">{file.language || 'Plain Text'}</td>
                          <td className="p-3 text-on-surface-variant">{(file.sizeBytes / 1024).toFixed(1)} KB</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-semantic-emerald/15 text-emerald-400 border border-semantic-emerald/30">
                              {file.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: SKIPPED & PROTECTED FILES */}
          {activeTab === 'skipped' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-surface border border-border-subtle text-xs text-on-surface-variant">
                <p className="font-semibold text-on-surface mb-1">Protection & Filtering Rules Audit</p>
                <p>Sensitive environment variables, private keys, binary assets, and build directories are strictly isolated.</p>
              </div>

              <div className="rounded-xl bg-surface border border-border-subtle overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-surface-container-lowest border-b border-border-subtle text-[10px] uppercase text-on-surface-variant sticky top-0">
                      <tr>
                        <th className="p-3">Path</th>
                        <th className="p-3">Skip Reason</th>
                        <th className="p-3">Classification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {index.skippedFiles.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-on-surface-variant">{item.path}</td>
                          <td className="p-3 text-semantic-amber">{item.reason}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-surface-container-high text-on-surface-variant">
                              excluded
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
