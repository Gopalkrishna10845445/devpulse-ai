'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception safely to client console for telemetry
    console.error('[DevPilot App Root Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg text-text-primary flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-surface border border-border rounded-lg shadow-modal p-6 sm:p-8 space-y-6 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle size={28} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Application Recovery
          </h1>
          <p className="text-body-sm text-text-secondary leading-relaxed">
            An unexpected error occurred in the application interface.
            DevPilot has isolated the exception and preserved your session.
          </p>
        </div>

        {error.message && (
          <div className="p-3 rounded bg-surface-alt border border-border text-caption font-mono text-left text-text-muted overflow-x-auto max-h-32">
            <code>{error.message}</code>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-text-primary text-white text-body-sm font-medium rounded-md hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw size={15} />
            <span>Try Again</span>
          </button>
          <a
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-surface-alt border border-border text-text-primary text-body-sm font-medium rounded-md hover:bg-border transition-colors cursor-pointer"
          >
            <Home size={15} />
            <span>Return to Overview</span>
          </a>
        </div>
      </div>
    </div>
  );
}
