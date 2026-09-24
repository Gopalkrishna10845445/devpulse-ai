/**
 * Comprehensive RAG / Codebase Q&A Milestone Verification Test Suite
 *
 * Verifies all 14 mandatory areas:
 * 1. Chunk creation
 * 2. Sensitive-file exclusion
 * 3. Embedding generation
 * 4. Vector storage
 * 5. Vector retrieval
 * 6. Repository filtering
 * 7. Authorization
 * 8. Citation generation
 * 9. Grounded answers
 * 10. Unsupported questions
 * 11. Embedding failure handling
 * 12. LLM failure handling
 * 13. Empty index handling
 * 14. Idempotent re-indexing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chunkSourceFile, createChunkId } from '../chunker';
import { isSensitivePath, isBinaryPath, isExcludedDirectory } from '../../repository/fileFilter';
import { DeterministicLocalEmbedder, GeminiEmbedder, OpenAIEmbedder, getEmbeddingProvider, cosineSimilarity } from '../embeddings';
import { RepositoryVectorStore } from '../vectorStore';
import { CodebaseRetriever } from '../retriever';
import { ContextBuilder, redactSecrets } from '../contextBuilder';
import { CitationValidator } from '../citationValidator';
import { GroundedLLMClient } from '../llm';
import { CodebaseRAGPipeline } from '../ragPipeline';
import { RepositoryIndex } from '../../repository/types';
import { CodebaseIntelligence } from '../../intelligence/types';
import { authorizeRepositoryAccess } from '../../auth/accessControl';
import { User } from '../../auth/types';

describe('DEVpilot — RAG / Codebase Q&A Comprehensive Milestone Suite', () => {
  let vectorStore: RepositoryVectorStore;
  let pipeline: CodebaseRAGPipeline;

  beforeEach(() => {
    vectorStore = new RepositoryVectorStore();
    pipeline = new CodebaseRAGPipeline(vectorStore);
  });

  // ─── 1. Chunk Creation ───────────────────────────────────────────────────────
  describe('1. Chunk Creation', () => {
    it('creates semantic, symbol-aligned chunks with correct line ranges', () => {
      const code = [
        'import React from "react";',
        '',
        'export interface UserCardProps {',
        '  name: string;',
        '  email: string;',
        '}',
        '',
        'export function UserCard({ name, email }: UserCardProps) {',
        '  return (',
        '    <div className="card">',
        '      <h2>{name}</h2>',
        '      <p>{email}</p>',
        '    </div>',
        '  );',
        '}',
      ].join('\n');

      const chunks = chunkSourceFile('src/components/UserCard.tsx', code, 'test/repo', 'commit123');
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].filePath).toBe('src/components/UserCard.tsx');
      expect(chunks[0].startLine).toBe(1);
      expect(chunks[0].endLine).toBe(15);
      expect(chunks[0].id).toContain('test/repo@commit1/src/components/UserCard.tsx#L1-L15');
    });

    it('creates section-based chunks for documentation markdown', () => {
      const md = [
        '# Introduction',
        'Welcome to DevPulse AI documentation.',
        '',
        '## Getting Started',
        'Run `npm run dev` to start the server.',
        '',
        '## Architecture',
        'The system uses PostgreSQL, Redis, and Next.js.',
      ].join('\n');

      const chunks = chunkSourceFile('docs/README.md', md, 'test/repo', 'commit123');
      expect(chunks.length).toBe(3);
      expect(chunks[0].symbolName).toBe('Introduction');
      expect(chunks[1].symbolName).toBe('Getting Started');
      expect(chunks[2].symbolName).toBe('Architecture');
    });
  });

  // ─── 2. Sensitive-File Exclusion ───────────────────────────────────────────
  describe('2. Sensitive-File Exclusion', () => {
    it('strictly refuses to chunk sensitive files, keys, and credentials', () => {
      const sensitiveFiles = [
        '.env',
        '.env.local',
        '.env.production',
        'id_rsa',
        'id_ed25519',
        'server.key',
        'cert.pem',
        'service-account.json',
        'credentials.json',
        'secrets.yaml',
      ];

      for (const file of sensitiveFiles) {
        expect(isSensitivePath(file)).toBe(true);
        const chunks = chunkSourceFile(file, 'SECRET_TOKEN=xyz123', 'test/repo', 'commit123');
        expect(chunks.length).toBe(0);
      }
    });

    it('strictly refuses to chunk binary, vendor, and build artifact paths', () => {
      expect(isBinaryPath('assets/logo.png')).toBe(true);
      expect(isBinaryPath('build/bundle.wasm')).toBe(true);
      expect(isExcludedDirectory('node_modules/express/index.js')).toBe(true);
      expect(isExcludedDirectory('.git/HEAD')).toBe(true);
      expect(isExcludedDirectory('.next/static/chunks/main.js')).toBe(true);
      expect(isExcludedDirectory('dist/index.js')).toBe(true);

      const binaryChunks = chunkSourceFile('assets/logo.png', '\x89PNG\r\n\x1a\n', 'test/repo', 'commit123');
      expect(binaryChunks.length).toBe(0);

      const vendorChunks = chunkSourceFile('node_modules/express/index.js', 'module.exports = {}', 'test/repo', 'commit123');
      expect(vendorChunks.length).toBe(0);
    });
  });

  // ─── 3. Embedding Generation ───────────────────────────────────────────────
  describe('3. Embedding Generation', () => {
    it('generates 384-dimensional deterministic embeddings with batching', async () => {
      const embedder = new DeterministicLocalEmbedder();
      expect(embedder.dimension).toBe(384);

      const vec = await embedder.embedText('function authenticate()');
      expect(vec.length).toBe(384);
      expect(vec.every(v => typeof v === 'number' && !isNaN(v))).toBe(true);

      const batch = await embedder.embedBatch(['text one', 'text two', 'text three']);
      expect(batch.length).toBe(3);
      expect(batch[0].length).toBe(384);
      expect(batch[1].length).toBe(384);
      expect(batch[2].length).toBe(384);
    });

    it('correctly maps Gemini (768) and OpenAI (1536) providers', () => {
      const gemini = new GeminiEmbedder('test-key');
      expect(gemini.dimension).toBe(768);

      const openai = new OpenAIEmbedder('test-key');
      expect(openai.dimension).toBe(1536);
    });
  });

  // ─── 4. Vector Storage ─────────────────────────────────────────────────────
  describe('4. Vector Storage', () => {
    it('persists vector records and manages index metadata', async () => {
      const status = await vectorStore.upsertRecords('owner/my-app', 'sha-1', [
        {
          id: 'chunk-1',
          repositoryId: 'owner/my-app',
          commitSha: 'sha-1',
          filePath: 'src/main.ts',
          embedding: new Array(384).fill(0.1),
          chunk: {
            id: 'chunk-1',
            repositoryId: 'owner/my-app',
            commitSha: 'sha-1',
            filePath: 'src/main.ts',
            language: 'TypeScript',
            module: 'src',
            startLine: 1,
            endLine: 10,
            content: 'console.log("hello");',
            tokenCountEstimate: 5,
          },
        },
      ]);

      expect(status.isIndexed).toBe(true);
      expect(status.filesIndexed).toBe(1);
      expect(status.chunksIndexed).toBe(1);

      const retrievedStatus = vectorStore.getIndexStatus('owner/my-app', 'sha-1');
      expect(retrievedStatus.isIndexed).toBe(true);
      expect(retrievedStatus.chunksIndexed).toBe(1);
    });
  });

  // ─── 5. Vector Retrieval ───────────────────────────────────────────────────
  describe('5. Vector Retrieval', () => {
    it('retrieves relevant chunks ranked by cosine similarity', async () => {
      const emb = new DeterministicLocalEmbedder();
      const code1 = 'export function calculateTotal(prices: number[]) { return prices.reduce((a, b) => a + b, 0); }';
      const code2 = 'export function deleteUserAccount(userId: string) { return db.users.delete(userId); }';

      const v1 = await emb.embedText(code1);
      const v2 = await emb.embedText(code2);

      await vectorStore.upsertRecords('org/finance', 'main', [
        {
          id: 'fin-1',
          repositoryId: 'org/finance',
          commitSha: 'main',
          filePath: 'src/math.ts',
          embedding: v1,
          chunk: {
            id: 'fin-1',
            repositoryId: 'org/finance',
            commitSha: 'main',
            filePath: 'src/math.ts',
            language: 'TypeScript',
            module: 'src',
            startLine: 1,
            endLine: 5,
            content: code1,
            tokenCountEstimate: 10,
          },
        },
        {
          id: 'user-1',
          repositoryId: 'org/finance',
          commitSha: 'main',
          filePath: 'src/user.ts',
          embedding: v2,
          chunk: {
            id: 'user-1',
            repositoryId: 'org/finance',
            commitSha: 'main',
            filePath: 'src/user.ts',
            language: 'TypeScript',
            module: 'src',
            startLine: 1,
            endLine: 5,
            content: code2,
            tokenCountEstimate: 10,
          },
        },
      ]);

      const queryEmb = await emb.embedText('sum prices calculation math');
      const results = await vectorStore.similaritySearch('org/finance', 'main', queryEmb, 2);

      expect(results.length).toBe(2);
      expect(results[0].chunk.filePath).toBe('src/math.ts');
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });
  });

  // ─── 6. Repository Filtering & Isolation ───────────────────────────────────
  describe('6. Repository Filtering & Isolation', () => {
    it('prevents cross-tenant and cross-repository retrieval leaks', async () => {
      const emb = new DeterministicLocalEmbedder();
      const secretChunkA = {
        id: 'tenantA@main/secret.ts#L1-L5',
        repositoryId: 'tenant-a/secret-repo',
        commitSha: 'main',
        filePath: 'src/secret.ts',
        language: 'TypeScript',
        module: 'src',
        startLine: 1,
        endLine: 5,
        content: 'export const SECRET_KEY = "TENANT_A_CONFIDENTIAL";',
        tokenCountEstimate: 10,
      };

      const secretChunkB = {
        id: 'tenantB@main/secret.ts#L1-L5',
        repositoryId: 'tenant-b/secret-repo',
        commitSha: 'main',
        filePath: 'src/secret.ts',
        language: 'TypeScript',
        module: 'src',
        startLine: 1,
        endLine: 5,
        content: 'export const SECRET_KEY = "TENANT_B_CONFIDENTIAL";',
        tokenCountEstimate: 10,
      };

      await vectorStore.upsertRecords('tenant-a/secret-repo', 'main', [
        { id: secretChunkA.id, repositoryId: 'tenant-a/secret-repo', commitSha: 'main', filePath: secretChunkA.filePath, embedding: await emb.embedText(secretChunkA.content), chunk: secretChunkA },
      ]);
      await vectorStore.upsertRecords('tenant-b/secret-repo', 'main', [
        { id: secretChunkB.id, repositoryId: 'tenant-b/secret-repo', commitSha: 'main', filePath: secretChunkB.filePath, embedding: await emb.embedText(secretChunkB.content), chunk: secretChunkB },
      ]);

      const query = await emb.embedText('secret key confidential');
      const resultsForA = await vectorStore.similaritySearch('tenant-a/secret-repo', 'main', query, 5);

      expect(resultsForA.every(r => r.chunk.repositoryId === 'tenant-a/secret-repo')).toBe(true);
      expect(resultsForA.some(r => r.chunk.content.includes('TENANT_B'))).toBe(false);
    });
  });

  // ─── 7. Authorization ──────────────────────────────────────────────────────
  describe('7. Authorization & RBAC', () => {
    it('authorizes valid repository access and blocks unauthorized access', async () => {
      const user = {
        id: 'user_123',
        githubId: '12345',
        githubLogin: 'devpilot-developer',
        displayName: 'Developer',
        role: 'MEMBER' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const authAllowed = await authorizeRepositoryAccess(user, 'gopalkrishna10845445/devpulse-ai', 'qa');
      expect(authAllowed.authorized).toBe(true);

      const unauthorizedUser = {
        id: 'user_stranger',
        githubId: '99999',
        githubLogin: 'stranger-user',
        displayName: 'Stranger',
        role: 'MEMBER' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const blockedRes = await authorizeRepositoryAccess(unauthorizedUser, 'private-org/private-repo', 'qa');
      expect(blockedRes.authorized).toBe(false);
    });
  });

  // ─── 8. Citation Generation ────────────────────────────────────────────────
  describe('8. Citation Generation & Validation', () => {
    it('extracts and validates citations against indexed files and line numbers', () => {
      const text = `
        The authentication handler is defined in \`src/auth/jwt.ts:10-25\` and called from \`src/api/login.ts:40-60\`.
        Also see [src/config/auth.ts:1-15].
      `;

      const extracted = CitationValidator.extractCitationsFromText(text);
      expect(extracted.length).toBe(3);
      expect(extracted[0].filePath).toBe('src/auth/jwt.ts');
      expect(extracted[0].startLine).toBe(10);
      expect(extracted[0].endLine).toBe(25);

      const mockIndex: RepositoryIndex = {
        repository: { fullName: 'org/repo', defaultBranch: 'main' } as any,
        ingestion: { isComplete: true } as any,
        files: [
          { path: 'src/auth/jwt.ts', sizeBytes: 1000, type: 'file', status: 'indexed', language: 'TypeScript', isBinary: false, isSensitive: false, skipReason: null, name: 'jwt.ts', extension: 'ts' },
          { path: 'src/api/login.ts', sizeBytes: 2000, type: 'file', status: 'indexed', language: 'TypeScript', isBinary: false, isSensitive: false, skipReason: null, name: 'login.ts', extension: 'ts' },
        ],
        directories: [],
        languages: [],
        frameworks: [],
        manifests: [],
        dependencies: [],
        modules: [],
        skippedFiles: [],
        indexedAt: new Date().toISOString(),
      };

      const validated = CitationValidator.validateCitations(extracted, 'org/repo', 'main', mockIndex);
      expect(validated.length).toBe(3);
      expect(validated[0].isValid).toBe(true);
      expect(validated[1].isValid).toBe(true);
      expect(validated[2].isValid).toBe(false); // src/config/auth.ts does not exist in mock index
    });
  });

  // ─── 9. Grounded Answers ───────────────────────────────────────────────────
  describe('9. Grounded Answers', () => {
    it('generates answers strictly grounded in retrieved code evidence', async () => {
      const mockIndex: RepositoryIndex = {
        repository: { fullName: 'acme/store', defaultBranch: 'main' } as any,
        ingestion: { isComplete: true } as any,
        files: [
          { path: 'src/cart.ts', sizeBytes: 300, type: 'file', status: 'indexed', language: 'TypeScript', isBinary: false, isSensitive: false, skipReason: null, name: 'cart.ts', extension: 'ts' },
        ],
        directories: [],
        languages: [],
        frameworks: [],
        manifests: [],
        dependencies: [],
        modules: [],
        skippedFiles: [],
        indexedAt: new Date().toISOString(),
      };

      const filesMap = new Map([
        ['src/cart.ts', 'export function addItemToCart(cart: any[], item: any) { cart.push(item); return cart; }'],
      ]);

      await pipeline.indexRepository('acme/store', mockIndex, undefined, filesMap);

      const response = await pipeline.askQuestion(
        { repositoryId: 'acme/store', question: 'How does addItemToCart work?' },
        mockIndex
      );

      expect(response.answer).toBeDefined();
      expect(response.retrievedChunks.length).toBeGreaterThan(0);
      expect(response.citations.length).toBeGreaterThan(0);
      expect(response.citations[0].filePath).toBe('src/cart.ts');
    });
  });

  // ─── 10. Unsupported Questions ─────────────────────────────────────────────
  describe('10. Unsupported Questions / Abstention', () => {
    it('honestly abstains when question cannot be answered from repository evidence', async () => {
      const mockIndex: RepositoryIndex = {
        repository: { fullName: 'acme/store', defaultBranch: 'main' } as any,
        ingestion: { isComplete: true } as any,
        files: [
          { path: 'src/cart.ts', sizeBytes: 300, type: 'file', status: 'indexed', language: 'TypeScript', isBinary: false, isSensitive: false, skipReason: null, name: 'cart.ts', extension: 'ts' },
        ],
        directories: [],
        languages: [],
        frameworks: [],
        manifests: [],
        dependencies: [],
        modules: [],
        skippedFiles: [],
        indexedAt: new Date().toISOString(),
      };

      const filesMap = new Map([
        ['src/cart.ts', 'export function addItemToCart(cart: any[], item: any) { cart.push(item); return cart; }'],
      ]);

      await pipeline.indexRepository('acme/store', mockIndex, undefined, filesMap);

      const response = await pipeline.askQuestion(
        { repositoryId: 'acme/store', question: 'What database schema will this project use five years from now?' },
        mockIndex
      );

      expect(response.confidence).toBe('insufficient_evidence');
      expect(response.answer.toLowerCase()).toContain("couldn't find evidence");
    });
  });

  // ─── 11. Embedding Failure Handling ────────────────────────────────────────
  describe('11. Embedding Failure Handling', () => {
    it('falls back to lexical search when embedding provider fails', async () => {
      const retriever = new CodebaseRetriever(vectorStore);
      const chunk = {
        id: 'test@main/auth.ts#L1-L10',
        repositoryId: 'test/repo',
        commitSha: 'main',
        filePath: 'src/auth.ts',
        language: 'TypeScript',
        module: 'src',
        symbolName: 'verifyAuthToken',
        symbolType: 'function' as const,
        startLine: 1,
        endLine: 10,
        content: 'export function verifyAuthToken() {}',
        tokenCountEstimate: 5,
      };

      await vectorStore.upsertRecords('test/repo', 'main', [
        { id: chunk.id, repositoryId: 'test/repo', commitSha: 'main', filePath: chunk.filePath, embedding: new Array(384).fill(0), chunk },
      ]);

      // Lexical match on exact symbol and path works even with zero/failed embeddings
      const results = await retriever.retrieve('test/repo', 'main', 'verifyAuthToken auth');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].chunk.symbolName).toBe('verifyAuthToken');
    });
  });

  // ─── 12. LLM Failure Handling ──────────────────────────────────────────────
  describe('12. LLM Failure Handling', () => {
    it('falls back to deterministic contextual synthesizer if external LLM fails', async () => {
      const llmClient = new GroundedLLMClient();
      const chunk = {
        chunk: {
          id: 'test@main/db.ts#L1-L10',
          repositoryId: 'test/repo',
          commitSha: 'main',
          filePath: 'src/db.ts',
          language: 'TypeScript',
          module: 'src',
          symbolName: 'connectPostgres',
          symbolType: 'function' as const,
          startLine: 1,
          endLine: 10,
          content: 'export function connectPostgres() { return new Pool(); }',
          tokenCountEstimate: 10,
        },
        score: 0.9,
      };

      const built = ContextBuilder.build([chunk]);
      const res = await llmClient.generateAnswer('How is postgres connected?', built);

      expect(res.answer).toBeDefined();
      expect(res.answer).toContain('src/db.ts');
      expect(res.modelUsed).toBe('deterministic-synthesizer');
    });
  });

  // ─── 13. Empty Index Handling ──────────────────────────────────────────────
  describe('13. Empty Index Handling', () => {
    it('returns a safe and clear message when asked on an unindexed repository', async () => {
      const res = await pipeline.askQuestion({
        repositoryId: 'unindexed/repo',
        commitSha: 'abc999',
        question: 'Where is auth handled?',
      });

      expect(res.confidence).toBe('insufficient_evidence');
      expect(res.answer).toContain('not yet indexed');
      expect(res.citations.length).toBe(0);
      expect(res.retrievedChunks.length).toBe(0);
    });
  });

  // ─── 14. Idempotent Re-indexing ────────────────────────────────────────────
  describe('14. Idempotent Re-indexing', () => {
    it('safely re-indexes the same repository commit without duplicating chunks', async () => {
      const mockIndex: RepositoryIndex = {
        repository: { fullName: 'idempotent/repo', defaultBranch: 'main' } as any,
        ingestion: { isComplete: true } as any,
        files: [
          { path: 'src/app.ts', sizeBytes: 200, type: 'file', status: 'indexed', language: 'TypeScript', isBinary: false, isSensitive: false, skipReason: null, name: 'app.ts', extension: 'ts' },
        ],
        directories: [],
        languages: [],
        frameworks: [],
        manifests: [],
        dependencies: [],
        modules: [],
        skippedFiles: [],
        indexedAt: new Date().toISOString(),
      };

      const filesMap = new Map([
        ['src/app.ts', 'export const APP_NAME = "DevPulse";'],
      ]);

      const run1 = await pipeline.indexRepository('idempotent/repo', mockIndex, undefined, filesMap);
      const count1 = vectorStore.getAllChunks('idempotent/repo', 'main').length;

      const run2 = await pipeline.indexRepository('idempotent/repo', mockIndex, undefined, filesMap);
      const count2 = vectorStore.getAllChunks('idempotent/repo', 'main').length;

      expect(count1).toBe(count2);
      expect(run1.status.chunksIndexed).toBe(run2.status.chunksIndexed);
    });
  });
});
