'use client';

import React, { useState, useRef } from 'react';
import { Send, User, Bot, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: CitationItem[];
  confidence?: string | number;
  retrievedChunks?: RetrievedChunkItem[];
}

interface CitationItem {
  filePath?: string;
  file?: string;
  startLine?: number;
  endLine?: number;
  lineRange?: string;
  symbol?: string;
  snippet?: string;
  isValid?: boolean;
}

interface RetrievedChunkItem {
  filePath?: string;
  file?: string;
  startLine?: number;
  endLine?: number;
  symbolName?: string;
  content?: string;
  score?: number;
  matchReason?: string;
}

interface CodebaseQATabProps {
  initialRepoFullName?: string;
  repositoryUrl?: string;
  isIndexed?: boolean;
  onAskQuestion?: (question: string) => Promise<any>;
}

export const CodebaseQATab: React.FC<CodebaseQATabProps> = ({
  initialRepoFullName = 'Gopalkrishna10845445/devpulse-ai',
  repositoryUrl,
  isIndexed = true,
  onAskQuestion,
}) => {
  const effectiveRepo = initialRepoFullName || repositoryUrl || 'Gopalkrishna10845445/devpulse-ai';
  const [repoName, setRepoName] = useState(effectiveRepo);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    'What is the high-level architecture of this project?',
    'Explain the authentication flow.',
    'List the main API routes and their purpose.',
    'What testing patterns are used?',
  ];

  const handleSubmit = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let result;
      if (onAskQuestion) {
        result = await onAskQuestion(question);
      } else {
        const res = await fetch('/api/repository/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repositoryId: repoName,
            question,
          }),
        });
        if (!res.ok) {
          throw new Error('Failed to ask question');
        }
        result = await res.json();
      }
      const assistantMessage: Message = {
        role: 'assistant',
        content: result?.answer || 'No answer available. The codebase may not be fully indexed.',
        citations: result?.citations || [],
        confidence: result?.confidence,
        retrievedChunks: result?.retrievedChunks || [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'An error occurred while processing your question. Please ensure repository is indexed.' },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(input);
  };

  return (
    <div className="space-y-6 stagger-fade-up">

      {/* Header */}
      <div>
        <h2 className="text-heading-lg text-text-primary">Codebase Q&A</h2>
        <p className="text-body-sm text-text-muted mt-1">Ask questions about the codebase. Answers are grounded in indexed repository content with file-level citations.</p>
      </div>

      {/* Input area at top */}
      <div className="bg-surface border border-border rounded-md p-4">
        <form onSubmit={handleFormSubmit} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isIndexed ? 'Ask about the codebase...' : 'Index a repository first to enable Q&A'}
            disabled={!isIndexed || isLoading}
            className="flex-1 bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted disabled:opacity-50 font-mono"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !isIndexed}
            className="p-2 rounded-md bg-text-primary text-white hover:bg-text-secondary disabled:opacity-30 transition-colors"
            aria-label="Send question"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

      {/* Suggested prompts — only show when no messages */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSubmit(prompt)}
              disabled={!isIndexed || isLoading}
              className="px-3 py-1.5 rounded-md border border-border text-body-sm text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Message thread */}
      {messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-md bg-surface-alt border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-text-muted" />
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div className={`px-4 py-3 rounded-md text-body-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-text-primary text-white rounded-br-none'
                    : 'bg-surface border border-border'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.citations.map((cite, cIdx) => {
                      const fileName = cite.filePath || cite.file;
                      const range = cite.startLine ? `${cite.startLine}–${cite.endLine}` : cite.lineRange;
                      return (
                        <span key={cIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-surface-alt border border-border text-[11px] font-mono text-text-secondary">
                          <FileText size={10} className="text-text-muted" />
                          {fileName}{range ? `:${range}` : ''}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Confidence */}
                {msg.confidence !== undefined && (
                  <p className="mt-1.5 text-[10px] font-mono text-text-muted">
                    Confidence: {typeof msg.confidence === 'number' ? `${(msg.confidence * 100).toFixed(0)}%` : msg.confidence.replace('_', ' ').toUpperCase()}
                  </p>
                )}

                {/* Retrieved chunks drawer */}
                {msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setExpandedChunks(expandedChunks === idx ? null : idx)}
                      className="text-[10px] font-mono text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors"
                    >
                      {expandedChunks === idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {msg.retrievedChunks.length} retrieved chunks
                    </button>
                    {expandedChunks === idx && (
                      <div className="mt-2 space-y-2">
                        {msg.retrievedChunks.map((chunk, chIdx) => {
                          const chunkFile = chunk.filePath || chunk.file;
                          const range = chunk.startLine ? `:${chunk.startLine}–${chunk.endLine}` : '';
                          return (
                            <div key={chIdx} className="p-3 rounded-sm bg-surface-alt border border-border">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-mono text-text-secondary">
                                  {chunkFile}{range} {chunk.symbolName ? `(${chunk.symbolName})` : ''}
                                </span>
                                <span className="text-[10px] font-mono text-text-muted">
                                  {chunk.score !== undefined ? `score: ${chunk.score.toFixed(3)}` : chunk.matchReason || ''}
                                </span>
                              </div>
                              {chunk.content && (
                                <pre className="text-[11px] font-mono text-text-secondary whitespace-pre-wrap leading-relaxed">{chunk.content}</pre>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-md bg-text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={14} className="text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-md bg-surface-alt border border-border flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-text-muted" />
              </div>
              <div className="px-4 py-3 bg-surface border border-border rounded-md">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 spinner" />
                  <span className="text-body-sm text-text-muted">Analyzing codebase...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
};
