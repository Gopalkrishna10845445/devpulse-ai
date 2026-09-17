'use client';

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: string;
  trend?: string;
  status?: 'emerald' | 'cyan' | 'amber' | 'purple' | 'red';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
}) => {
  return (
    <div className="p-4 bg-surface border border-border rounded-md">
      <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider mb-2">{label}</p>
      <p className="text-xl font-mono font-semibold text-text-primary tracking-tight">{value}</p>
      {subtext && (
        <p className="text-caption text-text-muted mt-1 truncate">{subtext}</p>
      )}
    </div>
  );
};
