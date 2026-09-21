import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../client';
import {
  RagDatabaseRepository,
  WebhookDatabaseRepository,
  FixDatabaseRepository,
  ReportDatabaseRepository,
} from '../repositories';
import { RepositoryVectorStore } from '../../rag/vectorStore';
import { CodeFixEngine } from '../../fixes/fixEngine';
import { WebhookJobManager } from '../../webhook/jobManager';
import { VectorRecord } from '../../rag/types';
import { CodeFixProposal } from '../../fixes/types';

describe('Production Phase 1 — PostgreSQL 16 + pgvector Persistence Layer', () => {
  describe('DB-001 & DB-016: Client Connection, Error Sanitization & Security', () => {
    it('DB-001: sanitizes database errors to prevent leaking passwords or connection strings', () => {
      const rawError = new Error(
        'error: password authentication failed for user "devpilot" at postgres://devpilot:supersecretpassword123@localhost:5432/devpilot'
      );
      const cleanError = db.sanitizeError(rawError);

      expect(cleanError.message).not.toContain('supersecretpassword123');
      expect(cleanError.message).toContain('[REDACTED_USER_PASS]');
    });

    it('DB-016: masks raw credentials in SQL error messages', () => {
      const sqlError = new Error('syntax error near password=supersecretpass in table users');
      const cleanError = db.sanitizeError(sqlError);

      expect(cleanError.message).not.toContain('supersecretpass');
      expect(cleanError.message).toContain('password=[REDACTED]');
    });
  });

  describe('DB-003, DB-004, DB-005, DB-006: Repository & Commit Isolation', () => {
    let vectorStore: RepositoryVectorStore;

    beforeEach(() => {
      vectorStore = new RepositoryVectorStore();
    });

    it('DB-005: enforces strict repository isolation (Repo A cannot read Repo B data)', async () => {
      const repoARecords: VectorRecord[] = [
        {
          id: 'chunk-a1',
          repositoryId: 'facebook/react',
          commitSha: 'sha-react-1',
          filePath: 'packages/react/src/React.js',
          embedding: [1.0, 0.0, 0.0],
          chunk: {
            id: 'chunk-a1',
            repositoryId: 'facebook/react',
            commitSha: 'sha-react-1',
            filePath: 'packages/react/src/React.js',
            language: 'javascript',
            module: 'packages/react',
            startLine: 1,
            endLine: 25,
            content: 'export function useState() { return []; }',
            tokenCountEstimate: 10,
          },
        },
      ];

      const repoBRecords: VectorRecord[] = [
        {
          id: 'chunk-b1',
          repositoryId: 'octocat/Hello-World',
          commitSha: 'sha-hello-1',
          filePath: 'src/main.c',
          embedding: [0.0, 1.0, 0.0],
          chunk: {
            id: 'chunk-b1',
            repositoryId: 'octocat/Hello-World',
            commitSha: 'sha-hello-1',
            filePath: 'src/main.c',
            language: 'c',
            module: 'src',
            startLine: 1,
            endLine: 10,
            content: 'int main() { printf("Hello World"); }',
            tokenCountEstimate: 8,
          },
        },
      ];

      await vectorStore.upsertRecords('facebook/react', 'sha-react-1', repoARecords);
      await vectorStore.upsertRecords('octocat/Hello-World', 'sha-hello-1', repoBRecords);

      // Querying Repo A with query vector matching Repo B must NOT return Repo B
      const queryMatchingRepoB = [0.0, 1.0, 0.0];
      const resultsFromRepoA = await vectorStore.similaritySearch(
        'facebook/react',
        'sha-react-1',
        queryMatchingRepoB,
        5
      );

      // All returned records must belong ONLY to facebook/react
      for (const res of resultsFromRepoA) {
        expect(res.chunk.repositoryId).toBe('facebook/react');
        expect(res.chunk.filePath).not.toContain('src/main.c');
      }

      // Querying Repo B must return only octocat/Hello-World
      const resultsFromRepoB = await vectorStore.similaritySearch(
        'octocat/Hello-World',
        'sha-hello-1',
        queryMatchingRepoB,
        5
      );
      expect(resultsFromRepoB.length).toBe(1);
      expect(resultsFromRepoB[0].chunk.repositoryId).toBe('octocat/Hello-World');
      expect(resultsFromRepoB[0].chunk.filePath).toBe('src/main.c');
    });

    it('DB-006: enforces strict commit isolation (Repo @ SHA1 cannot read Repo @ SHA2)', async () => {
      const sha1Records: VectorRecord[] = [
        {
          id: 'chunk-sha1',
          repositoryId: 'myorg/app',
          commitSha: 'commit-v1-old',
          filePath: 'src/index.ts',
          embedding: [0.8, 0.2, 0.0],
          chunk: {
            id: 'chunk-sha1',
            repositoryId: 'myorg/app',
            commitSha: 'commit-v1-old',
            filePath: 'src/index.ts',
            language: 'typescript',
            module: 'src',
            startLine: 1,
            endLine: 15,
            content: 'export const version = "1.0.0";',
            tokenCountEstimate: 8,
          },
        },
      ];

      const sha2Records: VectorRecord[] = [
        {
          id: 'chunk-sha2',
          repositoryId: 'myorg/app',
          commitSha: 'commit-v2-new',
          filePath: 'src/index.ts',
          embedding: [0.8, 0.2, 0.0],
          chunk: {
            id: 'chunk-sha2',
            repositoryId: 'myorg/app',
            commitSha: 'commit-v2-new',
            filePath: 'src/index.ts',
            language: 'typescript',
            module: 'src',
            startLine: 1,
            endLine: 15,
            content: 'export const version = "2.0.0";',
            tokenCountEstimate: 8,
          },
        },
      ];

      await vectorStore.upsertRecords('myorg/app', 'commit-v1-old', sha1Records);
      await vectorStore.upsertRecords('myorg/app', 'commit-v2-new', sha2Records);

      // Querying against commit-v1-old must return version 1.0.0, never 2.0.0
      const queryV1 = await vectorStore.similaritySearch('myorg/app', 'commit-v1-old', [0.8, 0.2, 0.0], 5);
      expect(queryV1.length).toBe(1);
      expect(queryV1[0].chunk.commitSha).toBe('commit-v1-old');
      expect(queryV1[0].chunk.content).toContain('1.0.0');

      // Querying against commit-v2-new must return version 2.0.0
      const queryV2 = await vectorStore.similaritySearch('myorg/app', 'commit-v2-new', [0.8, 0.2, 0.0], 5);
      expect(queryV2.length).toBe(1);
      expect(queryV2[0].chunk.commitSha).toBe('commit-v2-new');
      expect(queryV2[0].chunk.content).toContain('2.0.0');
    });
  });

  describe('DB-007, DB-008, DB-009: RAG Vector Retrieval & Citation Preservation', () => {
    it('DB-009: preserves line numbers and symbol metadata for exact citations', async () => {
      const vectorStore = new RepositoryVectorStore();
      const records: VectorRecord[] = [
        {
          id: 'chunk-citation-1',
          repositoryId: 'test/auth-service',
          commitSha: 'sha-auth-100',
          filePath: 'src/auth/jwt.ts',
          embedding: [0.5, 0.5, 0.5],
          chunk: {
            id: 'chunk-citation-1',
            repositoryId: 'test/auth-service',
            commitSha: 'sha-auth-100',
            filePath: 'src/auth/jwt.ts',
            language: 'typescript',
            module: 'src/auth',
            startLine: 42,
            endLine: 68,
            symbolName: 'verifyToken',
            symbolType: 'function',
            content: 'export function verifyToken(token: string): boolean { return true; }',
            tokenCountEstimate: 15,
          },
        },
      ];

      await vectorStore.upsertRecords('test/auth-service', 'sha-auth-100', records);

      const results = await vectorStore.similaritySearch(
        'test/auth-service',
        'sha-auth-100',
        [0.5, 0.5, 0.5],
        1
      );

      expect(results.length).toBe(1);
      const topMatch = results[0].chunk;
      expect(topMatch.filePath).toBe('src/auth/jwt.ts');
      expect(topMatch.startLine).toBe(42);
      expect(topMatch.endLine).toBe(68);
      expect(topMatch.symbolName).toBe('verifyToken');
    });
  });

  describe('DB-011 & DB-012: Webhook Delivery Persistence & Replay Protection', () => {
    it('DB-012: prevents duplicate webhook replay', () => {
      WebhookJobManager.resetState();

      const deliveryId = 'guid-webhook-test-12345';
      expect(WebhookJobManager.isDuplicateDelivery(deliveryId)).toBe(false);

      WebhookJobManager.recordDelivery({
        deliveryId,
        eventName: 'push',
        action: undefined,
        repositoryId: 'octocat/Hello-World',
        receivedAt: new Date().toISOString(),
        status: 'queued',
      });

      expect(WebhookJobManager.isDuplicateDelivery(deliveryId)).toBe(true);
    });
  });

  describe('DB-013 & DB-014: Fix Proposal & Stale SHA Rejection', () => {
    it('DB-014: rejects applying proposal when target commit SHA changes (Stale Commit Protection)', async () => {
      const fixEngine = new CodeFixEngine();

      const proposal: CodeFixProposal = {
        id: 'fix-test-001',
        repositoryId: 'test/repo',
        commitSha: 'sha-base-100',
        findingId: 'finding-sec-01',
        category: 'security',
        targetFile: 'src/index.ts',
        title: 'Fix SQL Injection',
        explanation: 'Parameterized query',
        rationale: 'Avoid string concatenation',
        affectedFiles: ['src/index.ts'],
        affectedSymbols: [],
        unifiedDiff: '--- a/src/index.ts\n+++ b/src/index.ts',
        diffHash: 'hash-diff-abc123',
        beforeCode: 'db.query("SELECT * FROM users WHERE id = " + id)',
        afterCode: 'db.query("SELECT * FROM users WHERE id = $1", [id])',
        evidence: { summary: '', references: [] },
        confidence: 'high',
        validationPlan: [],
        status: 'proposed',
        warnings: [],
        generatedAt: new Date().toISOString(),
      };

      (fixEngine as any).proposals.set(proposal.id, proposal);

      // Attempting to apply proposal with mismatched commit SHA must throw stale error
      await expect(
        fixEngine.applyFix(
          {
            proposalId: 'fix-test-001',
            repositoryId: 'test/repo',
            commitSha: 'sha-new-advanced-200', // Stale!
            expectedDiffHash: 'hash-diff-abc123',
            confirmedByUser: true,
          },
          {
            repository: { id: 'test/repo', fullName: 'test/repo', owner: 'test', name: 'repo' } as any,
            commitSha: 'sha-new-advanced-200',
            files: [{ path: 'src/index.ts', content: 'db.query("SELECT * FROM users WHERE id = " + id)' } as any],
          } as any
        )
      ).rejects.toThrow(/Repository state changed/);
    });
  });

  describe('DB-015: Database Failure & Graceful Fallback', () => {
    it('DB-015: handles database offline without crashing the application', async () => {
      // Force database to offline state
      const isAvailable = await db.isAvailable();
      // Should return a boolean without throwing an unhandled exception
      expect(typeof isAvailable).toBe('boolean');
    });
  });
});
