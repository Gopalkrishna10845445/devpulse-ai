'use client';

import React from 'react';
import { FullEvaluationReport } from '@/lib/types';
import { X, FileDown, Printer, Copy, Check, ShieldCheck, Award } from 'lucide-react';

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
    downloadAnchor.setAttribute("download", `DevPulse-Report-${report.candidateName.replace(/\s+/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopySummary = () => {
    const summary = `DEVPULSE AI RECRUITER SCORECARD
Candidate: ${report.candidateName}
Target Role: ${report.targetRole}
Overall Score: ${report.overallScore}/100
Hiring Recommendation: ${report.keyTakeaways.hiringRecommendation}
ATS Score: ${report.quadrants.atsFormatting}/100 | GitHub Proof: ${report.quadrants.githubProofOfWork}/100
Key Strengths: ${report.keyTakeaways.strengths.join('; ')}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <FileDown className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Export Recruiter Assessment Report</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Overview Preview */}
        <div className="glass-card p-5 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">{report.candidateName}</h4>
              <p className="text-xs text-cyan-400">{report.targetRole}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-cyan-400 font-mono">{report.overallScore}/100</span>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Overall Rating</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-1">
            <p><strong className="text-slate-200">Recommendation:</strong> {report.keyTakeaways.hiringRecommendation}</p>
            <p><strong className="text-slate-200">GitHub Profile:</strong> @{report.github.username} ({report.github.totalStars} stars, {report.github.publicReposCount} repos)</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <button
            onClick={handlePrint}
            className="py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>

          <button
            onClick={handleDownloadJSON}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center justify-center space-x-2"
          >
            <FileDown className="w-4 h-4 text-purple-400" />
            <span>Download JSON</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center justify-center space-x-2"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

        </div>

      </div>
    </div>
  );
};
