import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DevPulse | Full-Stack Engineering Intelligence & GitHub Portfolio Evaluator',
  description: 'Multi-signal engineering assessment platform combining deterministic ATS heuristics, GitHub code telemetry, and AI semantic intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="bg-black text-[#e5e1e4] min-h-screen font-sans selection:bg-cyan-500/30 selection:text-cyan-300 antialiased">
        {children}
      </body>
    </html>
  );
}
