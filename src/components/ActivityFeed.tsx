'use client';

import React from 'react';

interface ActivityFeedProps {
  githubUsername?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ githubUsername }) => {
  return (
    <div className="p-6 rounded-xl bg-surface border border-border-subtle space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3.5">
        <h3 className="font-headline font-semibold text-sm sm:text-base text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant/70">history</span>
          <span>Recent Activity</span>
        </h3>
        <span className="font-label-mono text-[10px] text-on-surface-variant/70 uppercase">Not live</span>
      </div>

      <p className="text-xs text-on-surface-variant leading-relaxed">
        GitHub activity unavailable
        {githubUsername ? ` for @${githubUsername}` : ''}. Commit, pull request, and review events are not fetched in this phase.
      </p>
    </div>
  );
};
