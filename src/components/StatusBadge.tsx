'use client';

import React from 'react';

interface StatusBadgeProps {
  status: 'indexed' | 'pending' | 'error' | 'disabled' | 'online';
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
  const dotColor = {
    indexed: 'bg-semantic-green',
    online: 'bg-semantic-green',
    pending: 'bg-semantic-amber',
    error: 'bg-semantic-red',
    disabled: 'bg-text-muted',
  }[status];

  const textColor = {
    indexed: 'text-semantic-green',
    online: 'text-semantic-green',
    pending: 'text-semantic-amber',
    error: 'text-semantic-red',
    disabled: 'text-text-muted',
  }[status];

  const defaultLabel = {
    indexed: 'Indexed',
    online: 'Online',
    pending: 'Pending',
    error: 'Error',
    disabled: 'Unavailable',
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono ${textColor} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label || defaultLabel}</span>
    </span>
  );
};
