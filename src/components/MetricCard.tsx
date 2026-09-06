'use client';

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: string;
  trend?: string;
  status?: 'emerald' | 'cyan' | 'amber' | 'purple' | 'red';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  trend,
  status = 'cyan',
}) => {
  const statusColors = {
    emerald: 'text-semantic-emerald border-semantic-emerald/30 bg-semantic-emerald/10',
    cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    amber: 'text-semantic-amber border-semantic-amber/30 bg-semantic-amber/10',
    purple: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    red: 'text-semantic-red border-semantic-red/30 bg-semantic-red/10',
  };

  return (
    <div className="p-4 rounded-xl bg-surface border border-border-subtle flex flex-col justify-between hover:border-white/20 transition-all shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-label-caps text-label-caps text-on-surface-variant/80 uppercase tracking-wider">{label}</span>
        <div className={`p-1 rounded border ${statusColors[status]}`}>
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-xl sm:text-2xl font-mono font-semibold text-primary tracking-tight">{value}</span>
        {trend && (
          <span className="font-label-mono text-[10px] text-semantic-emerald font-semibold flex items-center">
            <span className="material-symbols-outlined text-[12px]">trending_up</span>
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <p className="font-body-sm text-[11px] text-on-surface-variant/70 mt-1 truncate">{subtext}</p>
      )}
    </div>
  );
};

