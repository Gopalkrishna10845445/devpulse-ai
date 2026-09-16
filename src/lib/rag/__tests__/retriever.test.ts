import { describe, it, expect } from 'vitest';
import { CodebaseRetriever } from '../retriever';
import { RepositoryVectorStore } from '../vectorStore';
import { VectorRecord } from '../types';
import { DeterministicLocalEmbedder } from '../embeddings';

describe('Hybrid Code Retriever', () => {
  it('analyzes question queries correctly', () => {
    const retriever = new CodebaseRetriever();
    
    const authIntent = retriever.analyzeQuery('How does login authentication work with JWT?');
    expect(authIntent.type).toBe('auth_flow');
    expect(authIntent.keywords).toContain('login');
    expect(authIntent.keywords).toContain('jwt');

    const routeIntent = retriever.analyzeQuery('Where are API routes and endpoint handlers?');
    expect(routeIntent.type).toBe('route_discovery');

    const symbolIntent = retriever.analyzeQuery('Explain the UserService class implementation');
    expect(symbolIntent.type).toBe('symbol_lookup');
    expect(symbolIntent.targetSymbols).toContain('UserService');
  });

  it('performs hybrid retrieval matching exact symbols and semantic intent', async () => {
    const store = new RepositoryVectorStore();
    const embedder = new DeterministicLocalEmbedder();

    const chunk1 = {
      id: 'c1',
      repositoryId: 'test/repo',
      commitSha: 'c-1',
      filePath: 'src/auth/login.ts',
      language: 'TypeScript',
      module: 'src',
      symbolName: 'loginUser',
      symbolType: 'function',
      startLine: 1,
      endLine: 30,
      content: 'export function loginUser(email, password) { return verifyCredentials(email, password); }',
      tokenCountEstimate: 10,
    };

    const chunk2 = {
      id: 'c2',
      repositoryId: 'test/repo',
      commitSha: 'c-1',
      filePath: 'src/utils/math.ts',
      language: 'TypeScript',
      module: 'src',
      symbolName: 'calculateTax',
      symbolType: 'function',
      startLine: 1,
      endLine: 15,
      content: 'export function calculateTax(amount) { return amount * 0.15; }',
      tokenCountEstimate: 10,
    };

    const emb1 = await embedder.embedText(`${chunk1.filePath} ${chunk1.symbolName} ${chunk1.content}`);
    const emb2 = await embedder.embedText(`${chunk2.filePath} ${chunk2.symbolName} ${chunk2.content}`);

    const record1: VectorRecord = { id: 'c1', repositoryId: 'test/repo', commitSha: 'c-1', filePath: chunk1.filePath, embedding: emb1, chunk: chunk1 as any };
    const record2: VectorRecord = { id: 'c2', repositoryId: 'test/repo', commitSha: 'c-1', filePath: chunk2.filePath, embedding: emb2, chunk: chunk2 as any };

    await store.upsertRecords('test/repo', 'c-1', [record1, record2]);

    const retriever = new CodebaseRetriever(store);
    const results = await retriever.retrieve('test/repo', 'c-1', 'How does loginUser authenticate passwords?');

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].chunk.filePath).toBe('src/auth/login.ts');
    expect(results[0].chunk.symbolName).toBe('loginUser');
    expect(results[0].score).toBeGreaterThan(0.3);
  });
});
