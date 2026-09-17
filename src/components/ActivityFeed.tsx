'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface ActivityFeedProps {
  githubUsername?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ githubUsername }) => {
  return (
    <div className="bg-surface border border-border rounded-md p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-heading-sm text-text-primary flex items-center gap-2">
          <Clock size={16} className="text-text-muted" />
          Recent activity
        </h3>
        <span className="text-[10px] font-mono text-text-muted uppercase">Not live</span>
      </div>

      <p className="text-body-sm text-text-muted leading-relaxed">
        GitHub activity unavailable
        {githubUsername ? ` for @${githubUsername}` : ''}. Commit, pull request, and review events are not fetched in this phase.
      </p>
    </div>
  );
};
