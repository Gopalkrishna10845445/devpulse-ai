'use client';

import React from 'react';
import { FullEvaluationReport } from '@/lib/types';
import { X, Download, Printer, Copy, Check } from 'lucide-react';

interface ExportReportModalProps {
  report: FullEvaluationReport;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({ report, isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `DevPilot-Report-${(report.profileName || 'profile').replace(/\s+/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopySummary = () => {
    const summary = `DEVPILOT ENGINEERING INTELLIGENCE REPORT
Profile: ${report.profileName}
Target Role: ${report.targetRole}
Overall Score: ${report.overallScore ?? 'Unavailable'}/100
Assessment: ${report.keyTakeaways.engineeringAssessment}
Contact & Structure: ${report.quadrants.atsFormatting ?? 'N/A'}/100 | GitHub Hygiene: ${report.quadrants.githubProofOfWork ?? 'N/A'}/100
Key Strengths: ${report.keyTakeaways.strengths.join('; ')}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 command-overlay">
      <div className="bg-surface w-full max-w-2xl rounded-md p-6 sm:p-8 border border-border shadow-modal relative space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center space-x-2">
            <Download size={18} className="text-text-muted" />
            <h3 className="text-heading-sm text-text-primary">Export engineering report</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Report Preview */}
        <div className="p-5 rounded-md bg-surface-alt border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-body-sm font-medium text-text-primary">{report.profileName}</h4>
              <p className="text-caption text-text-muted">{report.targetRole}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-mono font-bold text-text-primary">{report.overallScore}/100</span>
              <p className="text-[10px] font-mono text-text-muted uppercase">Overall rating</p>
            </div>
          </div>

          <div className="pt-3 border-t border-border text-caption text-text-secondary space-y-1">
            <p><strong className="text-text-primary">Assessment:</strong> {report.keyTakeaways.engineeringAssessment}</p>
            <p><strong className="text-text-primary">GitHub:</strong> @{report.github.username} ({report.github.totalStars} stars, {report.github.publicReposCount} repos)</p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handlePrint}
            className="py-3 px-4 rounded-md bg-text-primary text-white font-medium text-body-sm transition-colors hover:bg-text-secondary flex items-center justify-center space-x-2"
          >
            <Printer size={16} />
            <span>Print / Save PDF</span>
          </button>

          <button
            onClick={handleDownloadJSON}
            className="py-3 px-4 rounded-md bg-surface border border-border text-text-primary font-medium text-body-sm transition-colors hover:border-border-strong flex items-center justify-center space-x-2"
          >
            <Download size={16} className="text-text-muted" />
            <span>Download JSON</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="py-3 px-4 rounded-md bg-surface border border-border text-text-primary font-medium text-body-sm transition-colors hover:border-border-strong flex items-center justify-center space-x-2"
          >
            {copied ? <Check size={16} className="text-semantic-green" /> : <Copy size={16} className="text-text-muted" />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
