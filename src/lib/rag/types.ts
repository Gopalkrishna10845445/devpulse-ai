/**
 * Phase 4 — Codebase RAG & Grounded Q&A Types
 *
 * Defines data structures for structural code chunking, vector storage,
 * hybrid retrieval, grounded context assembly, citations, and conversation history.
 */

import { FileRole, SymbolKind } from '../intelligence/types';

export type ChunkType =
  | 'symbol'
  | 'component'
  | 'endpoint'
  | 'class'
  | 'function'
  | 'interface_or_type'
  | 'module_overview'
  | 'config_block'
  | 'code_section'
  | FileRole
  | SymbolKind;

export interface CodeChunk {
  id: string; // Deterministic hash of repo + commit + path + startLine + endLine
  repositoryId: string; // e.g. "owner/repo"
  commitSha: string;
  filePath: string;
  language: string;
  module: string;
  symbolName?: string;
  symbolType?: ChunkType | SymbolKind;
  startLine: number;
  endLine: number;
  content: string;
  tokenCountEstimate: number;
}

export interface VectorRecord {
  id: string;
  repositoryId: string;
  commitSha: string;
  filePath: string;
  embedding: number[];
  chunk: CodeChunk;
}

export interface RetrievalResult {
  chunk: CodeChunk;
  score: number; // 0 to 1 composite similarity score
  lexicalScore?: number;
  semanticScore?: number;
  matchReason?: 'exact_symbol' | 'path_match' | 'semantic' | 'keyword' | 'structural_expansion';
}

export interface Citation {
  filePath: string;
  startLine: number;
  endLine: number;
  symbol?: string;
  snippet?: string;
}

export interface ValidatedCitation extends Citation {
  isValid: boolean;
  validationError?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: ValidatedCitation[];
  timestamp?: string;
}

export interface QARequest {
  repositoryId: string;
  commitSha?: string;
  question: string;
  conversationHistory?: ConversationMessage[];
}

export interface QAResponse {
  answer: string;
  citations: ValidatedCitation[];
  retrievedChunks: {
    filePath: string;
    startLine: number;
    endLine: number;
    symbolName?: string;
    score: number;
    matchReason?: string;
  }[];
  confidence: 'high' | 'medium' | 'low' | 'insufficient_evidence';
  repositoryId: string;
  commitSha: string;
  latencyMs: number;
}

export interface IndexStatus {
  repositoryId: string;
  commitSha: string;
  isIndexed: boolean;
  indexedAt?: string;
  filesIndexed: number;
  chunksIndexed: number;
  indexVersion: number;
}
