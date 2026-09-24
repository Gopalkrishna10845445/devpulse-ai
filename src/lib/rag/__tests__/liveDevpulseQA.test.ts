/**
 * Live Verification Test against Gopalkrishna10845445/devpulse-ai
 *
 * Verifies real questions:
 * 1. "Where is authentication handled?"
 * 2. "How does repository ingestion work?"
 * 3. "Where is PostgreSQL configured?"
 * 4. "How does the application handle GitHub OAuth?"
 * 5. "What are the major architectural modules?"
 *
 * And unsupported question:
 * 6. "What database schema will this project use five years from now?"
 */

import { describe, it, expect } from 'vitest';
import { ingestRepository } from '../../repository/repositoryIngestor';
import { analyzeCodebase } from '../../intelligence/codebaseAnalyzer';
import { CodebaseRAGPipeline } from '../ragPipeline';
import { RepositoryVectorStore } from '../vectorStore';

describe('Live Q&A Verification against Gopalkrishna10845445/devpulse-ai', () => {
  it('accurately answers real architectural questions with grounded citations and abstains on unsupported future questions', async () => {
    const vectorStore = new RepositoryVectorStore();
    const pipeline = new CodebaseRAGPipeline(vectorStore);

    const repoFullName = 'Gopalkrishna10845445/devpulse-ai';

    let repoIndex;
    try {
      repoIndex = await ingestRepository({ fullName: repoFullName });
    } catch (err: any) {
      if (
        err?.code === 'RATE_LIMITED' ||
        err?.code === 'GITHUB_UNAVAILABLE' ||
        err?.message?.includes('rate limit') ||
        err?.message?.includes('fetch failed')
      ) {
        console.warn('GitHub API unavailable or rate limited — skipping network fetch:', err?.message);
        return;
      }
      throw err;
    }

    expect(repoIndex.repository.fullName).toBe(repoFullName);
    expect(repoIndex.files.length).toBeGreaterThan(0);

    const intel = await analyzeCodebase({ index: repoIndex });
    expect(intel.architecture).toBeDefined();

    const indexResult = await pipeline.indexRepository(repoFullName, repoIndex, intel);
    expect(indexResult.status.isIndexed).toBe(true);
    expect(indexResult.status.chunksIndexed).toBeGreaterThan(0);

    // Q1: "Where is authentication handled?"
    const q1 = await pipeline.askQuestion(
      { repositoryId: repoFullName, question: 'Where is authentication handled?' },
      repoIndex,
      intel
    );
    expect(q1.retrievedChunks.length).toBeGreaterThan(0);
    expect(q1.citations.length).toBeGreaterThan(0);
    expect(q1.citations.every(c => c.isValid)).toBe(true);
    expect(q1.retrievedChunks.some(c => c.filePath.toLowerCase().includes('auth'))).toBe(true);

    // Q2: "How does repository ingestion work?"
    const q2 = await pipeline.askQuestion(
      { repositoryId: repoFullName, question: 'How does repository ingestion work?' },
      repoIndex,
      intel
    );
    expect(q2.retrievedChunks.length).toBeGreaterThan(0);
    expect(q2.citations.length).toBeGreaterThan(0);
    expect(q2.citations.every(c => c.isValid)).toBe(true);
    expect(q2.retrievedChunks.some(c => c.filePath.toLowerCase().includes('ingest') || c.filePath.toLowerCase().includes('repository'))).toBe(true);

    // Q3: "Where is PostgreSQL configured?"
    const q3 = await pipeline.askQuestion(
      { repositoryId: repoFullName, question: 'Where is PostgreSQL configured?' },
      repoIndex,
      intel
    );
    expect(q3.retrievedChunks.length).toBeGreaterThan(0);
    expect(q3.citations.length).toBeGreaterThan(0);
    expect(q3.citations.every(c => c.isValid)).toBe(true);
    expect(q3.retrievedChunks.some(c => c.filePath.toLowerCase().includes('db') || c.filePath.toLowerCase().includes('schema'))).toBe(true);

    // Q4: "How does the application handle GitHub OAuth?"
    const q4 = await pipeline.askQuestion(
      { repositoryId: repoFullName, question: 'How does the application handle GitHub OAuth?' },
      repoIndex,
      intel
    );
    expect(q4.retrievedChunks.length).toBeGreaterThan(0);
    expect(q4.citations.length).toBeGreaterThan(0);
    expect(q4.citations.every(c => c.isValid)).toBe(true);

    // Q5: "What are the major architectural modules?"
    const q5 = await pipeline.askQuestion(
      { repositoryId: repoFullName, question: 'What are the major architectural modules?' },
      repoIndex,
      intel
    );
    expect(q5.retrievedChunks.length).toBeGreaterThan(0);
    expect(q5.citations.length).toBeGreaterThan(0);
    expect(q5.citations.every(c => c.isValid)).toBe(true);

    // Q6: Unsupported Question — "What database schema will this project use five years from now?"
    const q6 = await pipeline.askQuestion(
      { repositoryId: repoFullName, question: 'What database schema will this project use five years from now?' },
      repoIndex,
      intel
    );
    expect(q6.confidence).toBe('insufficient_evidence');
    expect(q6.answer.toLowerCase()).toContain("couldn't find evidence");
  }, 45000);
});
