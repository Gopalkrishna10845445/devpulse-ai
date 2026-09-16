import { describe, it, expect, beforeEach } from 'vitest';
import { RepositoryVectorStore } from '../vectorStore';
import { VectorRecord } from '../types';

describe('Repository-Isolated Vector Store', () => {
  let store: RepositoryVectorStore;

  beforeEach(() => {
    store = new RepositoryVectorStore();
  });

  it('guarantees strict repository isolation between Repo A and Repo B', async () => {
    // Record for Repo A
    const recordA: VectorRecord = {
      id: 'repoA-1',
      repositoryId: 'org/repo-a',
      commitSha: 'commit-111',
      filePath: 'src/auth.ts',
      embedding: [1, 0, 0, 0],
      chunk: {
        id: 'repoA-1',
        repositoryId: 'org/repo-a',
        commitSha: 'commit-111',
        filePath: 'src/auth.ts',
        language: 'TypeScript',
        module: 'src',
        startLine: 1,
        endLine: 20,
        content: 'export function login() {}',
        tokenCountEstimate: 5,
      },
    };

    // Record for Repo B
    const recordB: VectorRecord = {
      id: 'repoB-1',
      repositoryId: 'org/repo-b',
      commitSha: 'commit-222',
      filePath: 'src/auth.ts',
      embedding: [1, 0, 0, 0],
      chunk: {
        id: 'repoB-1',
        repositoryId: 'org/repo-b',
        commitSha: 'commit-222',
        filePath: 'src/auth.ts',
        language: 'TypeScript',
        module: 'src',
        startLine: 1,
        endLine: 20,
        content: 'export function loginSecretB() {}',
        tokenCountEstimate: 5,
      },
    };

    await store.upsertRecords('org/repo-a', 'commit-111', [recordA]);
    await store.upsertRecords('org/repo-b', 'commit-222', [recordB]);

    // Query Repo A
    const resultsA = await store.similaritySearch('org/repo-a', 'commit-111', [1, 0, 0, 0]);
    expect(resultsA.length).toBe(1);
    expect(resultsA[0].chunk.content).toContain('login()');
    expect(resultsA[0].chunk.repositoryId).toBe('org/repo-a');

    // Query Repo B
    const resultsB = await store.similaritySearch('org/repo-b', 'commit-222', [1, 0, 0, 0]);
    expect(resultsB.length).toBe(1);
    expect(resultsB[0].chunk.content).toContain('loginSecretB');
    expect(resultsB[0].chunk.repositoryId).toBe('org/repo-b');

    // Cross Query — Repo A with commit from B should return nothing
    const emptyResults = await store.similaritySearch('org/repo-a', 'commit-222', [1, 0, 0, 0]);
    expect(emptyResults.length).toBe(0);
  });

  it('computes accurate cosine similarity scores', async () => {
    const record: VectorRecord = {
      id: 'rec-1',
      repositoryId: 'owner/repo',
      commitSha: 'sha-1',
      filePath: 'src/test.ts',
      embedding: [0.6, 0.8],
      chunk: {
        id: 'rec-1',
        repositoryId: 'owner/repo',
        commitSha: 'sha-1',
        filePath: 'src/test.ts',
        language: 'TypeScript',
        module: 'src',
        startLine: 1,
        endLine: 10,
        content: 'test',
        tokenCountEstimate: 1,
      },
    };

    await store.upsertRecords('owner/repo', 'sha-1', [record]);

    // Exact identical vector should yield ~1.0
    const exactMatch = await store.similaritySearch('owner/repo', 'sha-1', [0.6, 0.8]);
    expect(exactMatch[0].score).toBeCloseTo(1.0, 3);

    // Orthogonal vector should yield ~0.0
    const orthogonalMatch = await store.similaritySearch('owner/repo', 'sha-1', [-0.8, 0.6]);
    expect(orthogonalMatch[0].score).toBeCloseTo(0.0, 3);
  });
});
