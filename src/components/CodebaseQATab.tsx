/**
 * Phase 4 — Codebase RAG & Grounded Q&A Interactive Tab
 *
 * Provides repository-scoped natural-language question answering with
 * strict evidence citations, symbol navigation, and follow-up conversation threads.
 */

'use client';

import React, { useState } from 'react';
import { ValidatedCitation } from '@/lib/rag/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: ValidatedCitation[];
  retrievedChunks?: {
    filePath: string;
    startLine: number;
    endLine: number;
    symbolName?: string;
    score: number;
    matchReason?: string;
  }[];
  confidence?: 'high' | 'medium' | 'low' | 'insufficient_evidence';
  latencyMs?: number;
}

interface CodebaseQATabProps {
  initialRepoFullName?: string;
}

export function CodebaseQATab({
  initialRepoFullName = 'Gopalkrishna10845445/devpulse-ai',
}: CodebaseQATabProps) {
  const [repoFullName, setRepoFullName] = useState(initialRepoFullName);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState<{
    isIndexed: boolean;
    commitSha?: string;
    filesIndexed?: number;
    chunksIndexed?: number;
  }>({
    isIndexed: false,
  });

  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const suggestedQuestions = [
    'How does authentication work in this repository?',
    'Where are the API routes and endpoints defined?',
    'What is the high-level architecture pattern?',
    'What dependencies or external services does this project use?',
    'How is data validated across the application?',
  ];

  const handleIndexRepository = async () => {
    if (!repoFullName.includes('/')) {
      setError('Please provide a valid repository in "owner/repo" format.');
      return;
    }

    setIsIndexing(true);
    setError(null);

    try {
      const res = await fetch('/api/repository/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: repoFullName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setIndexStatus({
        isIndexed: data.status === 'completed',
        commitSha: data.commitSha,
        filesIndexed: data.filesIndexed,
        chunksIndexed: data.chunksIndexed,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to index repository.');
    } finally {
      setIsIndexing(false);
    }
  };

  const handleAskQuestion = async (qText?: string) => {
    const textToAsk = qText || question;
    if (!textToAsk || !textToAsk.trim()) return;

    // Auto-index if not already indexed
    if (!indexStatus.isIndexed) {
      await handleIndexRepository();
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToAsk.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!qText) setQuestion('');
    setIsAsking(true);
    setError(null);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/repository/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: repoFullName.trim(),
          commitSha: indexStatus.commitSha,
          question: textToAsk.trim(),
          conversationHistory,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        retrievedChunks: data.retrievedChunks,
        confidence: data.confidence,
        latencyMs: data.latencyMs,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
      setError(e.message || 'Failed to get answer from codebase.');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Repository Index Control */}
      <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">psychology</span>
              <h2 className="font-headline text-lg font-semibold text-on-surface tracking-tight">
                Codebase RAG & Grounded Q&A
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Ask natural-language questions about this repository. Answers are strictly grounded in verified source code and structural citations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-border-subtle">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">folder_zip</span>
              <input
                type="text"
                value={repoFullName}
                onChange={e => setRepoFullName(e.target.value)}
                placeholder="owner/repository"
                className="bg-transparent text-xs text-on-surface font-mono outline-none w-56"
              />
            </div>

            <button
              onClick={handleIndexRepository}
              disabled={isIndexing}
              className="px-3.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isIndexing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Indexing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[15px]">neurology</span>
                  <span>{indexStatus.isIndexed ? 'Re-Index' : 'Index Codebase'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Index Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-subtle text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                indexStatus.isIndexed ? 'bg-semantic-emerald animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-on-surface-variant font-mono">
              {indexStatus.isIndexed
                ? `Indexed (${indexStatus.filesIndexed} files, ${indexStatus.chunksIndexed} semantic chunks)`
                : 'Not Indexed yet — click "Index Codebase" or ask a question to auto-index.'}
            </span>
          </div>

          {indexStatus.commitSha && (
            <div className="flex items-center gap-2 text-on-surface-variant text-[11px] font-mono">
              <span>Commit:</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-cyan-300">
                {indexStatus.commitSha.slice(0, 7)}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-mono text-xs">✕</button>
        </div>
      )}

      {/* 2. Messages Thread */}
      <div className="space-y-4 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface border border-border-subtle text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mx-auto text-primary">
              <span className="material-symbols-outlined text-[28px]">chat_spark</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">No queries asked yet</h3>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto mt-1">
                Select a suggested question below or type your own question to inspect how code modules, authentication, API routes, or data flow works.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-2xl mx-auto">
              {suggestedQuestions.map((sq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskQuestion(sq)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high border border-border-subtle text-xs text-on-surface-variant hover:text-primary transition-all text-left"
                >
                  &ldquo;{sq}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`p-5 rounded-xl border transition-all ${
                msg.role === 'user'
                  ? 'bg-surface-container-lowest border-border-subtle ml-8'
                  : 'bg-surface border-border-subtle mr-8'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      msg.role === 'user' ? 'text-primary' : 'text-purple-400'
                    }`}
                  >
                    {msg.role === 'user' ? 'person' : 'smart_toy'}
                  </span>
                  <span className="text-xs font-semibold text-on-surface font-headline uppercase tracking-wider">
                    {msg.role === 'user' ? 'You' : 'DevPilot Codebase AI'}
                  </span>
                </div>

                {msg.latencyMs && (
                  <span className="text-[11px] font-mono text-on-surface-variant">
                    {msg.latencyMs}ms
                  </span>
                )}
              </div>

              {/* Message Content */}
              <div className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                {msg.content}
              </div>

              {/* Citations Box (Assistant only) */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border-subtle">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-semantic-emerald">verified</span>
                    <span>Verified Code Citations ({msg.citations.length})</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.citations.map((cit, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-surface-container-lowest border border-border-subtle flex items-start justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="font-mono font-medium text-primary text-[11px]">{cit.filePath}</p>
                          <p className="text-on-surface-variant text-[10px] font-mono mt-0.5">
                            Lines {cit.startLine}–{cit.endLine}
                          </p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-semantic-emerald/10 text-semantic-emerald font-mono text-[9px] uppercase font-semibold">
                          Verified
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retrieved Chunks Drawer (Optional Inspection) */}
              {msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                <details className="mt-3 text-[11px] text-on-surface-variant">
                  <summary className="cursor-pointer hover:text-on-surface py-1 select-none">
                    View {msg.retrievedChunks.length} retrieved candidate chunks & similarity scores
                  </summary>
                  <div className="space-y-1.5 mt-2 pl-2 border-l border-border-subtle">
                    {msg.retrievedChunks.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant py-0.5">
                        <span className="text-on-surface truncate max-w-sm">{c.filePath}:{c.startLine}-{c.endLine}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-purple-300">{c.matchReason}</span>
                          <span className="text-cyan-300">{(c.score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))
        )}

        {isAsking && (
          <div className="p-5 rounded-xl bg-surface border border-border-subtle space-y-3 mr-8 animate-pulse">
            <div className="flex items-center gap-2 text-xs text-primary font-headline">
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Retrieving relevant files and synthesizing grounded answer...</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Input Bar */}
      <div className="p-3 rounded-xl bg-surface border border-border-subtle flex items-center gap-3">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAskQuestion();
            }
          }}
          placeholder="Ask anything about this codebase (e.g. 'How does authentication work?')..."
          className="flex-1 bg-transparent text-xs text-on-surface outline-none placeholder:text-on-surface-variant/60"
        />

        <button
          onClick={() => handleAskQuestion()}
          disabled={isAsking || !question.trim()}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          <span>Ask</span>
          <span className="material-symbols-outlined text-[15px]">send</span>
        </button>
      </div>
    </div>
  );
}
