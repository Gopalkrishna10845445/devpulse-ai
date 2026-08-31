import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DevPulse AI | Full-Stack AI Resume & Deep GitHub Portfolio Evaluator',
  description: 'Multi-signal engineering assessment platform combining deterministic ATS heuristics, GitHub code telemetry, and AI semantic intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen selection:bg-cyan-500/30 selection:text-cyan-300">
        {children}
      </body>
    </html>
  );
}
