'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[DevPilot Client Error Boundary]', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-md bg-surface border border-border shadow-xs space-y-4 max-w-2xl mx-auto my-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">
              {this.props.fallbackTitle || 'Component Encountered a Problem'}
            </h3>
            <p className="text-body-sm text-text-secondary">
              {this.props.fallbackMessage ||
                'A client-side issue occurred while rendering this view. Your session and data are safe.'}
            </p>
          </div>
          {this.state.error && (
            <div className="p-3 rounded bg-surface-alt border border-border text-caption font-mono text-left text-text-muted overflow-x-auto max-h-28">
              <code>{this.state.error.message || String(this.state.error)}</code>
            </div>
          )}
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-text-primary text-white text-body-sm font-medium rounded-md hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Retry Component</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface-alt border border-border text-text-primary text-body-sm font-medium rounded-md hover:bg-border transition-colors cursor-pointer"
            >
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
