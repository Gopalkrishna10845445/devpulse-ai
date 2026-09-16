/**
 * Real Public GitHub Repository Ingestion & Live Pipeline Verification
 *
 * Tests:
 * 1. Live repository ingestion via GitHub REST API (octocat/Hello-World or public repo)
 * 2. Real Codebase Intelligence synthesis
 * 3. Real Structural Chunking & Vector Indexing
 * 4. Grounded Q&A with strict line citations against live downloaded files
 */

import { describe, it, expect } from 'vitest';
import { ingestRepository } from '../../repository/repositoryIngestor';
import { analyzeCodebase } from '../../intelligence/codebaseAnalyzer';
import { CodebaseRAGPipeline } from '../ragPipeline';
import { RepositoryVectorStore } from '../vectorStore';

describe('Real Live GitHub Repository End-to-End Verification', () => {
  it('ingests, indexes, and answers grounded questions for a real public GitHub repo (octocat/Hello-World)', async () => {
    const vectorStore = new RepositoryVectorStore();
    const pipeline = new CodebaseRAGPipeline(vectorStore);

    // 1. Ingest real repository
    const repoIndex = await ingestRepository({ fullName: 'octocat/Hello-World' });
    expect(repoIndex.repository.fullName).toBe('octocat/Hello-World');
    expect(repoIndex.files.length).toBeGreaterThan(0);

    // 2. Analyze real codebase
    const intel = await analyzeCodebase({ index: repoIndex });
    expect(intel.architecture).toBeDefined();

    // 3. Index into vector store
    const indexResult = await pipeline.indexRepository('octocat/Hello-World', repoIndex, intel);
    expect(indexResult.status.isIndexed).toBe(true);
    expect(indexResult.status.filesIndexed).toBeGreaterThan(0);

    // 4. Ask real question
    const res = await pipeline.askQuestion(
      {
        repositoryId: 'octocat/Hello-World',
        question: 'What is the content and purpose of this repository?',
      },
      repoIndex,
      intel
    );

    console.log('IndexResult status:', indexResult.status);
    console.log('IndexResult chunks:', indexResult.chunks.length);
    console.log('QAResponse:', JSON.stringify(res, null, 2));

    expect(res.confidence).not.toBe('insufficient_evidence');
    expect(res.retrievedChunks.length).toBeGreaterThan(0);
    expect(res.citations.every(c => c.isValid)).toBe(true);
    expect(res.repositoryId).toBe('octocat/Hello-World');
  }, 30000);
});
