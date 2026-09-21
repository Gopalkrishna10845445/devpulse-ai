/**
 * Phase 4 & Production Phase 1 — Repository-Isolated Vector Store
 *
 * Provides hybrid PostgreSQL 16 + pgvector persistent vector storage with in-memory
 * caching for sub-millisecond hot-path access and strict repository/commit isolation.
 * Guarantees that query retrieval in Repo A never returns records from Repo B.
 */

import { CodeChunk, IndexStatus, VectorRecord } from './types';
import { cosineSimilarity } from './embeddings';
import { RagDatabaseRepository } from '../db/repositories';
import { db } from '../db/client';
import { Logger } from '../logger';

export const CURRENT_INDEX_VERSION = 1;

export class RepositoryVectorStore {
  // Key: `${repositoryId}:${commitSha}` -> Array of VectorRecord
  private store: Map<string, VectorRecord[]> = new Map();
  // Key: `${repositoryId}:${commitSha}` -> Index Metadata
  private metadata: Map<string, IndexStatus> = new Map();

  private getNamespaceKey(repositoryId: string, commitSha: string): string {
    return `${repositoryId.toLowerCase().trim()}@${commitSha.trim()}`;
  }

  /**
   * Store or overwrite vector records for a repository commit scope
   */
  async upsertRecords(
    repositoryId: string,
    commitSha: string,
    records: VectorRecord[]
  ): Promise<IndexStatus> {
    const key = this.getNamespaceKey(repositoryId, commitSha);

    // Ensure all records have repository and commit explicitly stamped
    const sanitizedRecords = records.map((r) => ({
      ...r,
      repositoryId,
      commitSha,
      chunk: {
        ...r.chunk,
        repositoryId,
        commitSha,
      },
    }));

    // Cache in RAM for instant lookup
    this.store.set(key, sanitizedRecords);

    // Count unique files indexed
    const uniqueFiles = new Set(sanitizedRecords.map((r) => r.filePath)).size;

    const status: IndexStatus = {
      repositoryId,
      commitSha,
      isIndexed: true,
      indexedAt: new Date().toISOString(),
      filesIndexed: uniqueFiles,
      chunksIndexed: sanitizedRecords.length,
      indexVersion: CURRENT_INDEX_VERSION,
    };

    this.metadata.set(key, status);

    // Persist to PostgreSQL + pgvector if database is available
    try {
      if (await db.isAvailable()) {
        await RagDatabaseRepository.upsertChunks(repositoryId, commitSha, sanitizedRecords);
      }
    } catch (err: any) {
      Logger.warn('Database chunk persistence skipped or failed; using in-memory store', {
        errorCategory: 'RETRIEVAL_ERROR',
      }, err);
    }

    return status;
  }

  /**
   * Retrieve index status for a repository and commit
   */
  getIndexStatus(repositoryId: string, commitSha: string): IndexStatus {
    const key = this.getNamespaceKey(repositoryId, commitSha);
    const meta = this.metadata.get(key);
    if (meta) return meta;

    return {
      repositoryId,
      commitSha,
      isIndexed: false,
      filesIndexed: 0,
      chunksIndexed: 0,
      indexVersion: CURRENT_INDEX_VERSION,
    };
  }

  /**
   * Find any active indexed commit for a repositoryId
   */
  findIndexedCommit(repositoryId: string): string | null {
    const prefix = `${repositoryId.toLowerCase().trim()}@`;
    for (const [key, status] of Array.from(this.metadata.entries())) {
      if (key.startsWith(prefix) && status.isIndexed && status.chunksIndexed > 0) {
        return status.commitSha;
      }
    }
    return null;
  }

  /**
   * Search for top-K similar chunks within the strict repository + commit boundary
   */
  async similaritySearch(
    repositoryId: string,
    commitSha: string,
    queryEmbedding: number[],
    topK = 10,
    filter?: {
      filePathPrefix?: string;
      module?: string;
      symbolKind?: string;
    }
  ): Promise<{ chunk: CodeChunk; score: number }[]> {
    const key = this.getNamespaceKey(repositoryId, commitSha);
    let records = this.store.get(key) || [];

    // If not in RAM, try fetching from PostgreSQL + pgvector
    if (records.length === 0) {
      try {
        if (await db.isAvailable()) {
          const dbRecords = await RagDatabaseRepository.similaritySearch(
            repositoryId,
            commitSha,
            queryEmbedding,
            topK
          );
          if (dbRecords.length > 0) {
            return dbRecords.map((r) => ({
              chunk: r.chunk,
              score: r.score || 0,
            }));
          }
        }
      } catch (err) {
        Logger.warn('pgvector similarity search failed; falling back', {
          errorCategory: 'RETRIEVAL_ERROR',
        }, err);
      }
    }

    if (records.length === 0) {
      return [];
    }

    const scored: { chunk: CodeChunk; score: number }[] = [];

    for (const record of records) {
      // 1. Strict Isolation Check: never allow cross-repository data leak
      if (
        record.repositoryId.toLowerCase() !== repositoryId.toLowerCase() ||
        record.commitSha !== commitSha
      ) {
        continue;
      }

      // 2. Metadata filtering if provided
      if (filter?.filePathPrefix && !record.filePath.startsWith(filter.filePathPrefix)) {
        continue;
      }
      if (filter?.module && record.chunk.module !== filter.module) {
        continue;
      }
      if (filter?.symbolKind && record.chunk.symbolType !== filter.symbolKind) {
        continue;
      }

      // 3. Compute cosine similarity
      const sim = cosineSimilarity(queryEmbedding, record.embedding);
      scored.push({
        chunk: record.chunk,
        score: Math.max(0, Math.min(1, sim)),
      });
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }

  /**
   * Get all stored chunks for a repository + commit (used for lexical search)
   */
  getAllChunks(repositoryId: string, commitSha: string): CodeChunk[] {
    const key = this.getNamespaceKey(repositoryId, commitSha);
    const records = this.store.get(key) || [];
    return records
      .filter(
        (r) =>
          r.repositoryId.toLowerCase() === repositoryId.toLowerCase() &&
          r.commitSha === commitSha
      )
      .map((r) => r.chunk);
  }

  /**
   * Clear repository index
   */
  clearRepository(repositoryId: string, commitSha?: string): void {
    if (commitSha) {
      const key = this.getNamespaceKey(repositoryId, commitSha);
      this.store.delete(key);
      this.metadata.delete(key);
    } else {
      const prefix = `${repositoryId.toLowerCase().trim()}@`;
      for (const key of Array.from(this.store.keys())) {
        if (key.startsWith(prefix)) {
          this.store.delete(key);
          this.metadata.delete(key);
        }
      }
    }
  }

  /**
   * Clear all records (testing only)
   */
  clearAll(): void {
    this.store.clear();
    this.metadata.clear();
  }
}

// Global Singleton for the Next.js process
export const globalVectorStore = new RepositoryVectorStore();
