'use client';

import React from 'react';
import { FileCode, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
      <div className="w-10 h-10 rounded-md bg-surface-alt border border-border flex items-center justify-center text-text-muted mb-4">
        {icon || <FileCode size={20} />}
      </div>
      <h3 className="text-heading-sm text-text-primary mb-1.5">{title}</h3>
      <p className="text-body-sm text-text-muted max-w-md leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-4 py-2 rounded-md bg-text-primary text-white text-body-sm font-medium hover:bg-text-secondary transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
