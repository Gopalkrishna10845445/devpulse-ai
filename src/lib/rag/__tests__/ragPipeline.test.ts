import { describe, it, expect } from 'vitest';
import { CodebaseRAGPipeline } from '../ragPipeline';
import { RepositoryVectorStore } from '../vectorStore';
import { RepositoryIndex } from '../../repository/types';
import { CodebaseIntelligence } from '../../intelligence/types';

describe('Unified Codebase RAG Pipeline', () => {
  it('indexes repository and generates grounded answers with validated citations', async () => {
    const store = new RepositoryVectorStore();
    const pipeline = new CodebaseRAGPipeline(store);

    const mockIndex: RepositoryIndex = {
      repository: { fullName: 'owner/test-app', defaultBranch: 'main' } as any,
      ingestion: {
        status: 'complete',
        isComplete: true,
        totalFilesCounted: 2,
        indexedFilesCount: 2,
        skippedFilesCount: 0,
        directoryCount: 1,
        totalBytes: 1100,
        indexedBytes: 1100,
        treeTruncated: false,
        durationMs: 10,
        apiRequestsCount: 2,
        rateLimited: false,
      },
      files: [
        { path: 'src/auth/jwt.ts', name: 'jwt.ts', type: 'file', sizeBytes: 500, extension: 'ts', status: 'indexed', language: 'TypeScript', isBinary: false, isSensitive: false, skipReason: null },
        { path: 'src/routes/api.ts', name: 'api.ts', type: 'file', sizeBytes: 600, extension: 'ts', status: 'indexed', language: 'TypeScript', isBinary: false, isSensitive: false, skipReason: null },
      ],
      directories: [],
      frameworks: [],
      languages: [],
      manifests: [],
      dependencies: [],
      modules: [],
      skippedFiles: [],
      indexedAt: new Date().toISOString(),
    };

    const mockIntel: CodebaseIntelligence = {
      repository: mockIndex.repository,
      architecture: {
        pattern: 'Next.js App Router Monolith',
        summary: 'Test App Router Architecture',
        layers: [],
        entrypoints: [],
        dataFlow: [],
        metrics: {} as any,
      },
      files: [
        {
          filePath: 'src/auth/jwt.ts',
          language: 'TypeScript',
          role: 'service',
          loc: 40,
          sizeBytes: 500,
          symbols: [{ name: 'verifyToken', kind: 'function', filePath: 'src/auth/jwt.ts', line: 10, isExported: true }],
          imports: [],
          exports: [],
          internalDependencies: [],
          dependents: ['src/routes/api.ts'],
        },
        {
          filePath: 'src/routes/api.ts',
          language: 'TypeScript',
          role: 'api_route',
          loc: 50,
          sizeBytes: 600,
          symbols: [{ name: 'handleRequest', kind: 'endpoint', filePath: 'src/routes/api.ts', line: 5, isExported: true }],
          imports: [],
          exports: [],
          internalDependencies: ['src/auth/jwt.ts'],
          dependents: [],
        },
      ],
      symbols: [],
      imports: [],
      exports: [],
      relationships: [],
      analyzedAt: new Date().toISOString(),
      status: 'complete',
      durationMs: 15,
    };

    const fileMap = new Map<string, string>();
    fileMap.set(
      'src/auth/jwt.ts',
      `// JWT service\nexport function verifyToken(token: string) {\n  return token === 'valid';\n}`
    );
    fileMap.set(
      'src/routes/api.ts',
      `import { verifyToken } from '../auth/jwt';\nexport function handleRequest(req) {\n  return verifyToken(req.token);\n}`
    );

    // 1. Index
    const indexResult = await pipeline.indexRepository('owner/test-app', mockIndex, mockIntel, fileMap);
    expect(indexResult.status.isIndexed).toBe(true);
    expect(indexResult.status.chunksIndexed).toBeGreaterThanOrEqual(2);

    // 2. Ask Question with Evidence
    const response = await pipeline.askQuestion(
      { repositoryId: 'owner/test-app', commitSha: 'main', question: 'How is verifyToken used in authentication?' },
      mockIndex,
      mockIntel
    );

    expect(response.answer).toBeDefined();
    expect(response.retrievedChunks.length).toBeGreaterThan(0);
    expect(response.citations.length).toBeGreaterThan(0);
    expect(response.citations.every(c => c.isValid)).toBe(true);

    // 3. Ask Question with No Evidence (Out of Scope)
    const outOfScopeResponse = await pipeline.askQuestion(
      { repositoryId: 'owner/test-app', commitSha: 'main', question: 'What is the company stock price?' },
      mockIndex,
      mockIntel
    );

    expect(outOfScopeResponse.confidence).toBe('insufficient_evidence');
    expect(outOfScopeResponse.answer.toLowerCase()).toContain('couldn\'t find evidence');
  });
});
