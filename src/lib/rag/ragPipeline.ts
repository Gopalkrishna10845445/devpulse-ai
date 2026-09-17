/**
 * Phase 4 — Unified Codebase RAG Pipeline
 *
 * Orchestrates repository indexing, chunking, vector storage, hybrid retrieval,
 * context building, grounded LLM generation, and citation validation.
 */

import { analyzeCodebase } from '../intelligence/codebaseAnalyzer';
import { CodebaseIntelligence } from '../intelligence/types';
import { ingestRepository } from '../repository/repositoryIngestor';
import { RepositoryFileNode, RepositoryIndex } from '../repository/types';
import { chunkSourceFile } from './chunker';
import { CitationValidator } from './citationValidator';
import { ContextBuilder } from './contextBuilder';
import { getEmbeddingProvider } from './embeddings';
import { GroundedLLMClient } from './llm';
import { CodebaseRetriever } from './retriever';
import { CodeChunk, IndexStatus, QARequest, QAResponse, VectorRecord } from './types';
import { globalVectorStore, RepositoryVectorStore } from './vectorStore';

export class CodebaseRAGPipeline {
  private vectorStore: RepositoryVectorStore;
  private retriever: CodebaseRetriever;
  private llmClient: GroundedLLMClient;

  constructor(vectorStore: RepositoryVectorStore = globalVectorStore) {
    this.vectorStore = vectorStore;
    this.retriever = new CodebaseRetriever(vectorStore);
    this.llmClient = new GroundedLLMClient();
  }

  /**
   * Index a repository's source files into the vector store
   */
  async indexRepository(
    repoFullName: string,
    preloadedIndex?: RepositoryIndex,
    preloadedIntelligence?: CodebaseIntelligence,
    fileContentsMap?: Map<string, string>
  ): Promise<{ status: IndexStatus; chunks: CodeChunk[] }> {
    const token = process.env.GITHUB_TOKEN;

    // 1. Ensure RepositoryIndex is loaded
    let repoIndex: RepositoryIndex;
    if (preloadedIndex) {
      repoIndex = preloadedIndex;
    } else {
      repoIndex = await ingestRepository({ fullName: repoFullName });
    }

    const commitSha = repoIndex.repository?.defaultBranch || 'main';

    // 2. Check if already indexed for this exact commit
    const existingStatus = this.vectorStore.getIndexStatus(repoFullName, commitSha);
    if (existingStatus.isIndexed && existingStatus.chunksIndexed > 0 && !fileContentsMap) {
      const existingChunks = this.vectorStore.getAllChunks(repoFullName, commitSha);
      return { status: existingStatus, chunks: existingChunks };
    }

    // 3. Ensure CodebaseIntelligence is loaded
    let intelligence = preloadedIntelligence;
    if (!intelligence) {
      intelligence = await analyzeCodebase({ index: repoIndex, providedContents: fileContentsMap });
    }

    // 4. Collect file contents
    const contents = fileContentsMap || new Map<string, string>();
    if (contents.size === 0) {
      // If no preloaded contents map, fetch blobs for top files
      const eligibleFiles: RepositoryFileNode[] = (repoIndex.files || [])
        .filter(n => n.type === 'file' && n.status === 'indexed')
        .slice(0, 100);

      const fetchHeaders: Record<string, string> = {
        Accept: 'application/vnd.github.v3.raw',
        'User-Agent': 'DevPulse-AI-RAG',
      };
      if (token) fetchHeaders.Authorization = `token ${token}`;

      await Promise.all(
        eligibleFiles.map(async (fileNode: RepositoryFileNode) => {
          try {
            const rawUrl = `https://raw.githubusercontent.com/${repoFullName}/${commitSha}/${fileNode.path}`;
            const res = await fetch(rawUrl, { headers: fetchHeaders });
            if (res.ok) {
              const text = await res.text();
              contents.set(fileNode.path, text);
            }
          } catch (e) {
            // Ignore individual fetch failure
          }
        })
      );
    }

    // 5. Generate Structural Chunks
    const allChunks: CodeChunk[] = [];
    const filesIntelMap = new Map(intelligence.files.map(f => [f.filePath, f]));

    for (const [filePath, content] of Array.from(contents.entries())) {
      const fileIntel = filesIntelMap.get(filePath);
      const fileChunks = chunkSourceFile(filePath, content, repoFullName, commitSha, fileIntel);
      allChunks.push(...fileChunks);
    }

    // 6. Generate Embeddings (batch)
    const embedder = getEmbeddingProvider();
    const textsToEmbed = allChunks.map(
      c => `${c.filePath} ${c.symbolName || ''} ${c.content.slice(0, 500)}`
    );

    const embeddings = await embedder.embedBatch(textsToEmbed);

    const vectorRecords: VectorRecord[] = allChunks.map((chunk, idx) => ({
      id: chunk.id,
      repositoryId: repoFullName,
      commitSha,
      filePath: chunk.filePath,
      embedding: embeddings[idx] || new Array(embedder.dimension).fill(0),
      chunk,
    }));

    // 7. Store in isolated vector store
    const status = await this.vectorStore.upsertRecords(repoFullName, commitSha, vectorRecords);

    return { status, chunks: allChunks };
  }

  /**
   * Answer a natural language question about an indexed repository
   */
  async askQuestion(
    request: QARequest,
    repositoryIndex?: RepositoryIndex,
    codebaseIntelligence?: CodebaseIntelligence
  ): Promise<QAResponse> {
    const startTime = Date.now();
    const { repositoryId, question, conversationHistory = [] } = request;
    const commitSha = request.commitSha || repositoryIndex?.repository?.defaultBranch || this.vectorStore.findIndexedCommit(repositoryId) || 'main';

    // 1. Check if repository is indexed
    const indexStatus = this.vectorStore.getIndexStatus(repositoryId, commitSha);
    if (!indexStatus.isIndexed || indexStatus.chunksIndexed === 0) {
      return {
        answer: `Repository ${repositoryId} is not yet indexed for commit ${commitSha.slice(0, 7)}. Please index the repository first.`,
        citations: [],
        retrievedChunks: [],
        confidence: 'insufficient_evidence',
        repositoryId,
        commitSha,
        latencyMs: Date.now() - startTime,
      };
    }

    // 2. Hybrid Retrieval (Semantic + Lexical + Structural Graph)
    const retrievedResults = await this.retriever.retrieve(
      repositoryId,
      commitSha,
      question,
      codebaseIntelligence,
      { topK: 8 }
    );

    // 3. Build Grounded Context
    const builtContext = ContextBuilder.build(retrievedResults, {
      maxTokens: 4000,
      architecture: codebaseIntelligence?.architecture,
    });

    // 4. Generate Grounded Answer with LLM
    const llmResult = await this.llmClient.generateAnswer(
      question,
      builtContext,
      conversationHistory
    );

    // 5. Extract & Validate Citations
    const extractedCitations = CitationValidator.extractCitationsFromText(llmResult.answer);
    
    // Add citations for top retrieved chunks if LLM forgot to list them explicitly
    if (extractedCitations.length === 0 && builtContext.includedChunks.length > 0) {
      for (const res of builtContext.includedChunks.slice(0, 3)) {
        extractedCitations.push({
          filePath: res.chunk.filePath,
          startLine: res.chunk.startLine,
          endLine: res.chunk.endLine,
          symbol: res.chunk.symbolName,
        });
      }
    }

    const validatedCitations = CitationValidator.validateCitations(
      extractedCitations,
      repositoryId,
      commitSha,
      repositoryIndex,
      codebaseIntelligence
    );

    const latencyMs = Date.now() - startTime;

    return {
      answer: llmResult.answer,
      citations: validatedCitations.filter(c => c.isValid),
      retrievedChunks: retrievedResults.map(r => ({
        filePath: r.chunk.filePath,
        startLine: r.chunk.startLine,
        endLine: r.chunk.endLine,
        symbolName: r.chunk.symbolName,
        score: Math.round(r.score * 100) / 100,
        matchReason: r.matchReason,
      })),
      confidence: llmResult.confidence,
      repositoryId,
      commitSha,
      latencyMs,
    };
  }
}

export const globalRAGPipeline = new CodebaseRAGPipeline();
