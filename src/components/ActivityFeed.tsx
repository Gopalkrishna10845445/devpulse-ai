'use client';

import React from 'react';

interface ActivityItem {
  id: string;
  type: 'commit' | 'pr' | 'skill' | 'ai' | 'report';
  title: string;
  timestamp: string;
  detail: string;
}

interface ActivityFeedProps {
  githubUsername?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ githubUsername = 'alexrivera-dev' }) => {
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'commit',
      title: 'Commit Pushed to Main',
      timestamp: '12 mins ago',
      detail: `pushed 3 commits to @${githubUsername}/devpulse-ui (TypeScript)`,
    },
    {
      id: '2',
      type: 'pr',
      title: 'Pull Request Merged',
      timestamp: '2 hours ago',
      detail: `PR #42 "Refactor design tokens & WCAG 2.1 compliance" merged with 100% test pass`,
    },
    {
      id: '3',
      type: 'ai',
      title: 'AI Code Review Generated',
      timestamp: '3 hours ago',
      detail: 'Generated 3 STAR-format bullet rewrites (+18 ATS Impact score boost)',
    },
    {
      id: '4',
      type: 'skill',
      title: 'Skill Evidence Verified',
      timestamp: '5 hours ago',
      detail: 'Verified TypeScript (58% code share) and React (14 repositories)',
    },
    {
      id: '5',
      type: 'report',
      title: 'Full Evaluation Report Generated',
      timestamp: '1 day ago',
      detail: 'Completed 4-Quadrant competency matrix assessment',
    },
  ];

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'commit': return 'commit';
      case 'pr': return 'call_merge';
      case 'skill': return 'verified';
      case 'ai': return 'auto_fix_high';
      case 'report': return 'description';
    }
  };

  return (
    <div className="p-6 rounded-xl bg-surface border border-border-subtle space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3.5">
        <h3 className="font-headline font-semibold text-sm sm:text-base text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant/70">history</span>
          <span>Recent Activity</span>
        </h3>
        <span className="font-label-mono text-[10px] text-on-surface-variant/70 uppercase">Live Telemetry Log</span>
      </div>

      <div className="space-y-3.5">
        {activities.map((act) => (
          <div key={act.id} className="flex items-start gap-3 text-xs">
            <div className="p-1 rounded bg-surface-container-low border border-border-subtle text-cyan-400 mt-0.5">
              <span className="material-symbols-outlined text-[14px]">{getIcon(act.type)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-headline font-medium text-xs text-primary truncate">{act.title}</span>
                <span className="font-label-mono text-[10px] text-on-surface-variant/70 whitespace-nowrap ml-2">{act.timestamp}</span>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant/80 truncate mt-0.5">{act.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

