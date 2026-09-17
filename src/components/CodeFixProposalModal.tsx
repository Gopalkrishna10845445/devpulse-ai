'use client';

import React, { useState } from 'react';
import {
  CodeFixProposal,
} from '@/lib/fixes/types';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Shield,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';
import { DiffViewer } from './DiffViewer';

interface CodeFixProposalModalProps {
  proposal: CodeFixProposal | null;
  isOpen?: boolean;
  onClose: () => void;
  onApprove?: (proposalId: string) => Promise<void>;
  onReject?: (proposalId: string, reason?: string) => Promise<void>;
  onApply?: (proposalId: string) => Promise<void>;
}

export const CodeFixProposalModal: React.FC<CodeFixProposalModalProps> = ({
  proposal,
  isOpen = true,
  onClose,
  onApprove,
  onReject,
  onApply,
}) => {
  const [activeView, setActiveView] = useState<'diff' | 'before_after' | 'validation'>('diff');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !proposal) return null;

  const handleApprove = async () => {
    if (!onApprove) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      await onApprove(proposal.id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve proposal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      await onReject(proposal.id, rejectionReason || undefined);
      setShowRejectInput(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject proposal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async () => {
    if (!onApply || !confirmApply) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      await onApply(proposal.id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to apply proposal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = () => {
    switch (proposal.status) {
      case 'applied':
        return <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono text-xs border border-emerald-500/20 font-semibold">APPLIED (IN-MEMORY)</span>;
      case 'approved':
        return <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-mono text-xs border border-blue-500/20 font-semibold">APPROVED</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 font-mono text-xs border border-red-500/20 font-semibold">REJECTED</span>;
      case 'stale':
        return <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-mono text-xs border border-amber-500/20 font-semibold">STALE</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 font-mono text-xs border border-red-500/20 font-semibold">VALIDATION FAILED</span>;
      case 'proposed':
      default:
        return <span className="px-2 py-0.5 rounded bg-surface-alt text-text-primary font-mono text-xs border border-border font-semibold">PROPOSED</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-surface rounded-lg border border-border shadow-modal overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-text-primary" />
              <span className="font-semibold text-body-sm text-text-primary">AI Code Fix Proposal</span>
              {getStatusBadge()}
            </div>
            <h3 className="text-body-md font-semibold text-text-primary">{proposal.title}</h3>
            <p className="text-caption font-mono text-text-muted">
              Target: {proposal.targetFile} {proposal.startLine ? `(Line ${proposal.startLine})` : ''}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Error */}
        {actionError && (
          <div className="mx-5 mt-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-body-sm text-red-600 flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{actionError}</span>
          </div>
        )}

        {/* Warnings / Caveats */}
        {proposal.warnings && proposal.warnings.length > 0 && (
          <div className="mx-5 mt-3 p-3 rounded bg-amber-500/10 border border-amber-500/20 text-body-sm text-amber-700 dark:text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-caption">
              <AlertTriangle size={14} />
              <span>Remediation Notice:</span>
            </div>
            <ul className="list-disc list-inside text-caption space-y-0.5">
              {proposal.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Explanation & Rationale */}
        <div className="px-5 pt-3 pb-2 space-y-2">
          <p className="text-body-sm text-text-secondary">{proposal.explanation}</p>
          <div className="text-caption text-text-muted">
            <span className="font-semibold text-text-primary">Rationale: </span>
            <span>{proposal.rationale}</span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-5 border-b border-border flex gap-4">
          <button
            onClick={() => setActiveView('diff')}
            className={`pb-2 text-body-sm font-medium border-b-2 transition-colors ${
              activeView === 'diff'
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Unified Diff
          </button>
          <button
            onClick={() => setActiveView('before_after')}
            className={`pb-2 text-body-sm font-medium border-b-2 transition-colors ${
              activeView === 'before_after'
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Before / After
          </button>
          <button
            onClick={() => setActiveView('validation')}
            className={`pb-2 text-body-sm font-medium border-b-2 transition-colors ${
              activeView === 'validation'
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Validation Plan ({proposal.validationPlan?.length || 0})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeView === 'diff' && (
            <DiffViewer diff={proposal.unifiedDiff} />
          )}

          {activeView === 'before_after' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-caption font-semibold text-red-600 font-mono">BEFORE</span>
                <pre className="p-3 rounded bg-surface-alt border border-border text-[11px] font-mono text-text-primary overflow-x-auto max-h-60 whitespace-pre">
                  {proposal.beforeCode}
                </pre>
              </div>
              <div className="space-y-1.5">
                <span className="text-caption font-semibold text-emerald-600 font-mono">AFTER</span>
                <pre className="p-3 rounded bg-surface-alt border border-border text-[11px] font-mono text-text-primary overflow-x-auto max-h-60 whitespace-pre">
                  {proposal.afterCode}
                </pre>
              </div>
            </div>
          )}

          {activeView === 'validation' && (
            <div className="space-y-3">
              <p className="text-caption text-text-muted">
                Suggested validation commands to verify the patch before production deployment:
              </p>
              <div className="space-y-2">
                {proposal.validationPlan?.map((item, idx) => (
                  <div key={idx} className="p-3 rounded bg-surface-alt border border-border flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-text-muted" />
                        <span className="text-body-sm font-semibold text-text-primary">{item.description}</span>
                        <span className="px-1.5 py-0.5 rounded bg-surface text-[10px] font-mono text-text-muted border border-border uppercase">
                          {item.type}
                        </span>
                      </div>
                      {item.command && (
                        <div className="text-[11px] font-mono text-text-secondary bg-surface px-2 py-1 rounded border border-border">
                          {item.command}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Review Actions */}
        <div className="px-5 py-4 border-t border-border bg-surface-alt/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-caption text-text-muted">
            <span>Human-controlled proposal. Changes apply in memory only.</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {proposal.status === 'proposed' && (
              <>
                {!showRejectInput ? (
                  <>
                    <button
                      onClick={() => setShowRejectInput(true)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded border border-border text-body-sm text-text-secondary hover:text-red-600 hover:border-red-500/40 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="px-4 py-1.5 rounded bg-text-primary text-white text-body-sm font-medium hover:bg-text-secondary transition-colors"
                    >
                      Approve Proposal
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Optional reason for rejection..."
                      className="px-2.5 py-1 rounded border border-border bg-surface text-caption text-text-primary placeholder:text-text-muted focus:outline-none w-56"
                    />
                    <button
                      onClick={handleReject}
                      disabled={isProcessing}
                      className="px-3 py-1 rounded bg-red-600 text-white text-caption font-medium hover:bg-red-700 transition-colors"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="text-caption text-text-muted hover:text-text-primary"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}

            {proposal.status === 'approved' && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-caption text-text-primary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmApply}
                    onChange={(e) => setConfirmApply(e.target.checked)}
                    className="rounded border-border text-text-primary focus:ring-0"
                  />
                  <span>Confirm in-memory patch</span>
                </label>

                <button
                  onClick={handleApply}
                  disabled={!confirmApply || isProcessing}
                  className="px-4 py-1.5 rounded bg-emerald-600 text-white text-body-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Apply Patch</span>
                </button>
              </div>
            )}

            {proposal.status === 'applied' && (
              <div className="text-body-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 size={16} />
                <span>Patch Applied (In-Memory)</span>
              </div>
            )}

            {proposal.status === 'rejected' && (
              <div className="text-body-sm text-text-muted">
                <span>Proposal was rejected.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
