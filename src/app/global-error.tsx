'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DevPilot Global Error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#FAF9F7] text-[#1A1A1A] min-h-screen flex items-center justify-center p-4 font-sans antialiased">
        <div className="w-full max-w-lg bg-white border border-[#E8E6E3] rounded-lg shadow-lg p-6 sm:p-8 space-y-6 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-[#1A1A1A]">
              System Recovery
            </h1>
            <p className="text-sm text-[#4A4A4A] leading-relaxed">
              A critical layout exception occurred. You can reload the application or reset the runtime state.
            </p>
          </div>

          {error.message && (
            <div className="p-3 rounded bg-[#F5F4F2] border border-[#E8E6E3] text-xs font-mono text-left text-[#8A8A8A] overflow-x-auto max-h-32">
              <code>{error.message}</code>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw size={15} />
              <span>Retry</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F5F4F2] border border-[#E8E6E3] text-[#1A1A1A] text-sm font-medium rounded-md hover:bg-[#E8E6E3] transition-colors cursor-pointer"
            >
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
