'use client';

import React, { useState } from 'react';
import {
  RepositoryIndex,
  IngestionStatusCode,
} from '@/lib/repository/types';
import { FolderOpen, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { normalizeErrorMessage } from '@/lib/errorUtils';

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

  React.useEffect(() => {
    setRepoInput(initialRepoFullName);
    setIndex(null);
    setErrorMsg(null);
    setIngestionStep('idle');
  }, [initialRepoFullName]);

  const handleIngest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!repoInput.trim()) return;

    setIsIngesting(true);
    setErrorMsg(null);
    setIngestionStep('Connecting to GitHub API...');

    try {
      setIngestionStep('Retrieving repository tree & files...');
      const trimmedRepo = repoInput.trim();
      const isHttp = trimmedRepo.startsWith('http://') || trimmedRepo.startsWith('https://');
      const hasSlash = trimmedRepo.includes('/');

      const res = await fetch('/api/repository/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: hasSlash && !isHttp ? trimmedRepo : undefined,
          url: isHttp ? trimmedRepo : undefined,
          owner: !hasSlash && !isHttp ? trimmedRepo : undefined,
          branch: branchInput.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIndex(data.index);
        setIngestionStep('completed');
      } else {
        setErrorMsg(normalizeErrorMessage(data?.error, 'Repository ingestion failed.'));
        setIngestionStep('failed');
      }
    } catch (err: any) {
      setErrorMsg(normalizeErrorMessage(err?.message, 'Network error during ingestion.'));
      setIngestionStep('failed');
    } finally {
      setIsIngesting(false);
    }
  };

  const getStatusVariant = (status: IngestionStatusCode): 'indexed' | 'pending' | 'error' | 'disabled' => {
    switch (status) {
      case 'complete': return 'indexed';
      case 'partial':
      case 'rate_limited': return 'pending';
      case 'failed': return 'error';
      default: return 'disabled';
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6 stagger-fade-up">
      
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-lg text-text-primary">Repository ingestion</h2>
          <p className="text-body-sm text-text-muted mt-1">
            Structural indexing, file classification, framework extraction, and module mapping.
          </p>
        </div>

        {index && (
          <StatusBadge status={getStatusVariant(index.ingestion.status)} label={index.ingestion.status} />
        )}
      </div>

      {/* Ingestion Input Bar */}
      <div className="bg-surface border border-border rounded-md p-4 space-y-3">
        <form onSubmit={handleIngest} className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 w-full relative">
            <FolderOpen size={14} className="absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="e.g. owner/repo or https://github.com/owner/repo"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-md bg-surface-alt border border-border text-body-sm text-text-primary font-mono focus:outline-none focus:border-border-strong"
            />
          </div>

          <input
            type="text"
            placeholder="Branch (optional)"
            value={branchInput}
            onChange={(e) => setBranchInput(e.target.value)}
            className="w-full sm:w-36 px-3 py-2 rounded-md bg-surface-alt border border-border text-body-sm text-text-primary font-mono focus:outline-none focus:border-border-strong"
          />

          <button
            type="submit"
            disabled={isIngesting || !repoInput.trim()}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-text-primary text-white font-medium text-body-sm hover:bg-text-secondary transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isIngesting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Ingesting...</span>
              </>
            ) : (
              <span>Index repository</span>
            )}
          </button>
        </form>

        {isIngesting && (
          <div className="flex items-center gap-2 text-caption text-text-muted font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-semantic-amber animate-pulse" />
            <span>{ingestionStep}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-caption text-semantic-red flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Ingestion Results Display */}
      {index && (
        <div className="space-y-5">
          
          {/* Stat Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Tree nodes', value: index.ingestion.totalFilesCounted },
              { label: 'Indexed files', value: index.ingestion.indexedFilesCount },
              { label: 'Directories', value: index.ingestion.directoryCount },
              { label: 'Modules', value: index.modules.length },
              { label: 'Dependencies', value: index.dependencies.length },
              { label: 'Skipped', value: index.ingestion.skippedFilesCount },
            ].map((tile, idx) => (
              <div key={idx} className="p-4 bg-surface border border-border rounded-md">
                <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{tile.label}</p>
                <p className="text-xl font-mono font-semibold text-text-primary mt-1">{tile.value}</p>
              </div>
            ))}
          </div>

          {/* Repository Metadata Bar */}
          <div className="p-4 bg-surface border border-border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <a
                href={index.repository.url}
                target="_blank"
                rel="noreferrer"
                className="text-heading-sm text-text-primary hover:text-text-secondary transition-colors flex items-center gap-1.5"
              >
                {index.repository.fullName}
                <ExternalLink size={12} className="text-text-muted" />
              </a>
              <p className="text-caption text-text-muted hidden sm:block">{index.repository.description || 'No description'}</p>
            </div>

            <div className="flex items-center gap-4 font-mono text-[11px] text-text-muted">
              <span>branch: <strong className="text-text-primary">{index.repository.defaultBranch}</strong></span>
              <span>★ <strong className="text-text-primary">{index.repository.stars}</strong></span>
              <span>forks: <strong className="text-text-primary">{index.repository.forks}</strong></span>
              <span>{index.ingestion.durationMs}ms</span>
            </div>
          </div>

          {/* Sub-Tabs */}
          <div className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto no-scrollbar text-body-sm">
            {[
              { id: 'overview', label: 'Overview & Languages' },
              { id: 'modules', label: `Modules (${index.modules.length})` },
              { id: 'dependencies', label: `Dependencies (${index.dependencies.length})` },
              { id: 'files', label: `Files (${index.ingestion.indexedFilesCount})` },
              { id: 'skipped', label: `Skipped (${index.skippedFiles.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-text-primary text-text-primary font-medium'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW & LANGUAGES */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              
              {/* Language Distribution */}
              <div className="bg-surface border border-border rounded-md p-5 space-y-3">
                <h4 className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                  Language distribution (by source bytes)
                </h4>

                {index.languages.length === 0 ? (
                  <p className="text-body-sm text-text-muted italic">No recognized source code files indexed.</p>
                ) : (
                  <>
                    <div className="w-full h-2 rounded-full bg-surface-alt overflow-hidden flex border border-border">
                      {index.languages.map((lang, idx) => (
                        <div
                          key={idx}
                          style={{ width: `${Math.max(1, lang.percentage)}%`, backgroundColor: lang.color || '#94a3b8' }}
                          className="h-full transition-all"
                          title={`${lang.name}: ${lang.percentage}% (${(lang.bytes / 1024).toFixed(1)} KB)`}
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {index.languages.map((lang, idx) => (
                        <div key={idx} className="p-3 rounded-md bg-surface-alt border border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color || '#94a3b8' }} />
                            <span className="text-body-sm font-medium text-text-primary">{lang.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-body-sm font-mono font-medium text-text-primary">{lang.percentage}%</span>
                            <span className="text-[10px] font-mono text-text-muted block">{lang.fileCount} files</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Detected Frameworks */}
              <div className="bg-surface border border-border rounded-md p-5 space-y-3">
                <h4 className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                  Detected frameworks & tooling ({index.frameworks.length})
                </h4>

                {index.frameworks.length === 0 ? (
                  <p className="text-body-sm text-text-muted italic">No standard frameworks detected.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {index.frameworks.map((fw, idx) => (
                      <div key={idx} className="p-4 rounded-md bg-surface-alt border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-body-sm text-text-primary">{fw.name}</span>
                            <span className="px-2 py-0.5 rounded-sm bg-surface border border-border text-[10px] font-mono text-text-muted uppercase">
                              {fw.category}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-text-muted">
                            {fw.confidence}
                          </span>
                        </div>

                        <div className="space-y-0.5 pt-1 border-t border-border text-caption text-text-muted">
                          <p className="text-[10px] font-mono text-text-muted uppercase">Evidence:</p>
                          {fw.evidence.map((ev, eIdx) => (
                            <p key={eIdx} className="font-mono text-caption text-text-secondary pl-2">• {ev}</p>
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
                <div className="p-8 bg-surface border border-border rounded-md text-center text-body-sm text-text-muted">
                  No structural module roots identified. Repository may have a flat structure.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {index.modules.map((mod, idx) => (
                    <div key={idx} className="p-4 bg-surface border border-border rounded-md space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-body-sm text-text-primary">{mod.name}</span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-sm bg-surface-alt border border-border text-text-muted">
                              {mod.detectedRole}
                            </span>
                          </div>
                          <p className="font-mono text-caption text-text-muted mt-0.5">{mod.path}</p>
                        </div>
                        <span className="text-caption font-mono font-medium text-text-primary">{mod.fileCount} files</span>
                      </div>

                      <p className="text-caption text-text-muted leading-relaxed">{mod.description}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] font-mono text-text-muted">
                        <span>Language: <strong className="text-text-primary">{mod.primaryLanguage || 'Mixed'}</strong></span>
                        <span>{(mod.totalBytes / 1024).toFixed(1)} KB</span>
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
                  <div key={idx} className="px-3 py-1.5 rounded-md bg-surface border border-border flex items-center gap-2 text-caption font-mono">
                    <span className="text-text-primary font-medium">{m.path}</span>
                    <span className="text-text-muted">({m.ecosystem} — {m.dependencyCount + m.devDependencyCount} pkgs)</span>
                  </div>
                ))}
              </div>

              {/* Dependencies Table */}
              <div className="bg-surface border border-border rounded-md overflow-hidden">
                <div className="p-3 border-b border-border bg-surface-alt">
                  <input
                    type="text"
                    placeholder="Search dependencies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-surface border border-border text-caption text-text-primary font-mono focus:outline-none focus:border-border-strong"
                  />
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-caption font-mono">
                    <thead className="bg-surface-alt border-b border-border text-[10px] uppercase text-text-muted sticky top-0">
                      <tr>
                        <th className="p-3">Dependency</th>
                        <th className="p-3">Version</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Manifest</th>
                        <th className="p-3">Ecosystem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {index.dependencies
                        .filter(d => !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((dep, idx) => (
                          <tr key={idx} className="hover:bg-surface-alt transition-colors">
                            <td className="p-3 font-medium text-text-primary">{dep.name}</td>
                            <td className="p-3 text-text-muted">{dep.versionConstraint || '*'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-sm text-[10px] border ${dep.isDev ? 'bg-surface-alt border-border text-text-muted' : 'bg-surface-alt border-border text-text-primary'}`}>
                                {dep.isDev ? 'dev' : 'prod'}
                              </span>
                            </td>
                            <td className="p-3 text-text-muted">{dep.manifestPath}</td>
                            <td className="p-3 text-text-muted uppercase text-[10px]">{dep.ecosystem}</td>
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
            <div className="bg-surface border border-border rounded-md overflow-hidden">
              <div className="p-3 border-b border-border bg-surface-alt">
                <input
                  type="text"
                  placeholder="Filter indexed files by path..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md bg-surface border border-border text-caption text-text-primary font-mono focus:outline-none focus:border-border-strong"
                />
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-caption font-mono">
                  <thead className="bg-surface-alt border-b border-border text-[10px] uppercase text-text-muted sticky top-0">
                    <tr>
                      <th className="p-3">File Path</th>
                      <th className="p-3">Language</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {index.files
                      .filter(f => f.status !== 'skipped')
                      .filter(f => !searchQuery || f.path.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((file, idx) => (
                        <tr key={idx} className="hover:bg-surface-alt transition-colors">
                          <td className="p-3 text-text-primary">{file.path}</td>
                          <td className="p-3 text-text-muted">{file.language || 'Plain Text'}</td>
                          <td className="p-3 text-text-muted">{(file.sizeBytes / 1024).toFixed(1)} KB</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-sm text-[10px] text-semantic-green font-mono">
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
              <div className="p-4 bg-surface border border-border rounded-md text-caption text-text-muted">
                <p className="font-medium text-text-primary mb-1">Protection & filtering rules</p>
                <p>Sensitive environment variables, private keys, binary assets, and build directories are strictly isolated.</p>
              </div>

              <div className="bg-surface border border-border rounded-md overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-caption font-mono">
                    <thead className="bg-surface-alt border-b border-border text-[10px] uppercase text-text-muted sticky top-0">
                      <tr>
                        <th className="p-3">Path</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {index.skippedFiles.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-alt transition-colors">
                          <td className="p-3 text-text-muted">{item.path}</td>
                          <td className="p-3 text-semantic-amber">{item.reason}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-sm text-[10px] bg-surface-alt border border-border text-text-muted">
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
