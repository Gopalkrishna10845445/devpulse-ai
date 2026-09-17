'use client';

import React from 'react';
import { GitBranch, GitCommit, ExternalLink, Star, GitFork, Lock, Globe } from 'lucide-react';

interface RepositoryHeaderProps {
  repoName: string;
  url?: string;
  defaultBranch?: string;
  commitSha?: string;
  isPrivate?: boolean;
  stars?: number;
  forks?: number;
  description?: string;
  language?: string;
}

export const RepositoryHeader: React.FC<RepositoryHeaderProps> = ({
  repoName,
  url,
  defaultBranch = 'main',
  commitSha,
  isPrivate = false,
  stars,
  forks,
  description,
  language,
}) => {
  return (
    <div className="p-4 rounded-md bg-surface border border-border space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {isPrivate ? (
            <Lock size={14} className="text-text-muted" />
          ) : (
            <Globe size={14} className="text-text-muted" />
          )}
          
          <h2 className="font-mono font-medium text-body-sm text-text-primary">
            {repoName}
          </h2>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-text-muted hover:text-text-primary transition-colors"
              aria-label="View on GitHub"
            >
              <ExternalLink size={12} />
            </a>
          )}

          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-surface-alt border border-border text-[10px] font-mono text-text-secondary">
            <GitBranch size={10} className="text-text-muted" />
            {defaultBranch}
          </span>

          {commitSha && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-surface-alt border border-border text-[10px] font-mono text-text-muted">
              <GitCommit size={10} />
              {commitSha.slice(0, 7)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-caption font-mono text-text-muted">
          {language && (
            <span className="text-text-secondary">{language}</span>
          )}
          {stars !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Star size={11} />
              {stars}
            </span>
          )}
          {forks !== undefined && (
            <span className="inline-flex items-center gap-1">
              <GitFork size={11} />
              {forks}
            </span>
          )}
        </div>
      </div>

      {description && (
        <p className="text-body-sm text-text-secondary line-clamp-2">
          {description}
        </p>
      )}
    </div>
  );
};
