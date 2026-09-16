/**
 * Phase 4 — Hybrid Code Retriever (Semantic + Lexical + Structural)
 *
 * Combines vector cosine similarity with BM25-like lexical token matching,
 * exact symbol resolution, and Phase 3 dependency graph expansion.
 */

import { CodebaseIntelligence, FileIntelligence } from '../intelligence/types';
import { getEmbeddingProvider } from './embeddings';
import { CodeChunk, RetrievalResult } from './types';
import { globalVectorStore, RepositoryVectorStore } from './vectorStore';

export interface RetrievalOptions {
  topK?: number;
  minScoreThreshold?: number;
  expandDependencies?: boolean;
}

export interface QueryIntent {
  type: 'overview' | 'auth_flow' | 'route_discovery' | 'data_access' | 'symbol_lookup' | 'relationship' | 'general';
  targetSymbols: string[];
  targetPaths: string[];
  keywords: string[];
}

export class CodebaseRetriever {
  private vectorStore: RepositoryVectorStore;

  constructor(vectorStore: RepositoryVectorStore = globalVectorStore) {
    this.vectorStore = vectorStore;
  }

  /**
   * Analyze question text to extract intent, symbol candidates, and keywords
   */
  analyzeQuery(question: string): QueryIntent {
    const q = question.toLowerCase();
    const keywords = q
      .replace(/[^\w\s/._-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Detect target symbols (camelCase, PascalCase, snake_case words)
    const rawTokens = question.match(/[a-zA-Z_$][a-zA-Z0-9_$]{2,}/g) || [];
    const stopWords = new Set(['what', 'where', 'which', 'explain', 'does', 'this', 'that', 'from', 'with', 'have', 'show', 'repository', 'project', 'codebase']);
    const targetSymbols = rawTokens.filter(t => !stopWords.has(t.toLowerCase()));

    // Detect target file paths
    const pathMatches = question.match(/[a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+/g) || [];

    let type: QueryIntent['type'] = 'general';
    if (q.includes('what does this') || q.includes('overview') || q.includes('architecture') || q.includes('summary')) {
      type = 'overview';
    } else if (q.includes('auth') || q.includes('login') || q.includes('jwt') || q.includes('token') || q.includes('session')) {
      type = 'auth_flow';
    } else if (q.includes('api') || q.includes('route') || q.includes('endpoint') || q.includes('handler')) {
      type = 'route_discovery';
    } else if (q.includes('db') || q.includes('database') || q.includes('sql') || q.includes('postgres') || q.includes('prisma') || q.includes('model')) {
      type = 'data_access';
    } else if (targetSymbols.length > 0 && (q.includes('class') || q.includes('function') || q.includes('interface') || q.includes('component'))) {
      type = 'symbol_lookup';
    } else if (q.includes('connect') || q.includes('flow') || q.includes('call') || q.includes('depend')) {
      type = 'relationship';
    }

    return {
      type,
      targetSymbols,
      targetPaths: pathMatches,
      keywords,
    };
  }

  /**
   * Perform hybrid retrieval across indexed repository code chunks
   */
  async retrieve(
    repositoryId: string,
    commitSha: string,
    question: string,
    intelligence?: CodebaseIntelligence,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult[]> {
    const topK = options.topK || 8;
    const minThreshold = options.minScoreThreshold ?? 0.15;
    const expand = options.expandDependencies !== false;

    const intent = this.analyzeQuery(question);
    const embedder = getEmbeddingProvider();

    // 1. Semantic Retrieval
    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = await embedder.embedText(question);
    } catch (e) {
      console.warn('[Retriever] Embedding generation failed, falling back to lexical search', e);
    }

    const semanticCandidates = queryEmbedding.length > 0
      ? await this.vectorStore.similaritySearch(repositoryId, commitSha, queryEmbedding, topK * 2)
      : [];

    // 2. Lexical Retrieval
    const allChunks = this.vectorStore.getAllChunks(repositoryId, commitSha);
    const lexicalCandidates = this.scoreLexical(allChunks, intent);

    // 3. Merge & Score Fusion
    const scoreMap = new Map<string, { chunk: CodeChunk; semanticScore: number; lexicalScore: number; matchReason: RetrievalResult['matchReason'] }>();

    for (const sem of semanticCandidates) {
      scoreMap.set(sem.chunk.id, {
        chunk: sem.chunk,
        semanticScore: sem.score,
        lexicalScore: 0,
        matchReason: 'semantic',
      });
    }

    for (const lex of lexicalCandidates) {
      const existing = scoreMap.get(lex.chunk.id);
      if (existing) {
        existing.lexicalScore = lex.score;
        if (lex.isExactSymbol) existing.matchReason = 'exact_symbol';
        else if (lex.isPathMatch) existing.matchReason = 'path_match';
      } else {
        scoreMap.set(lex.chunk.id, {
          chunk: lex.chunk,
          semanticScore: 0,
          lexicalScore: lex.score,
          matchReason: lex.isExactSymbol ? 'exact_symbol' : lex.isPathMatch ? 'path_match' : 'keyword',
        });
      }
    }

    // 4. Calculate Final Composite Scores
    const results: RetrievalResult[] = [];
    for (const entry of Array.from(scoreMap.values())) {
      // Weighted combination
      let composite = entry.semanticScore * 0.55 + entry.lexicalScore * 0.45;
      
      // Intent boosts
      if (intent.type === 'auth_flow' && entry.chunk.filePath.toLowerCase().includes('auth')) {
        composite += 0.15;
      }
      if (intent.type === 'route_discovery' && (entry.chunk.filePath.includes('/api/') || entry.chunk.filePath.includes('route'))) {
        composite += 0.15;
      }

      composite = Math.min(1, composite);

      if (composite >= minThreshold) {
        results.push({
          chunk: entry.chunk,
          score: composite,
          semanticScore: entry.semanticScore,
          lexicalScore: entry.lexicalScore,
          matchReason: entry.matchReason,
        });
      }
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);
    let topResults = results.slice(0, topK);

    // 5. Phase 3 Structural Graph Expansion
    if (expand && intelligence && topResults.length > 0) {
      const expandedChunks = this.expandStructuralContext(topResults, allChunks, intelligence);
      topResults = [...topResults, ...expandedChunks].slice(0, topK + 2);
    }

    return topResults;
  }

  /**
   * Lexical Scoring (Exact symbol + Path match + Token overlap)
   */
  private scoreLexical(
    chunks: CodeChunk[],
    intent: QueryIntent
  ): { chunk: CodeChunk; score: number; isExactSymbol: boolean; isPathMatch: boolean }[] {
    const scored: { chunk: CodeChunk; score: number; isExactSymbol: boolean; isPathMatch: boolean }[] = [];

    for (const chunk of chunks) {
      let score = 0;
      let isExactSymbol = false;
      let isPathMatch = false;

      // 1. Exact Symbol match
      if (chunk.symbolName) {
        for (const sym of intent.targetSymbols) {
          if (chunk.symbolName.toLowerCase() === sym.toLowerCase()) {
            score += 0.6;
            isExactSymbol = true;
          } else if (chunk.symbolName.toLowerCase().includes(sym.toLowerCase())) {
            score += 0.3;
          }
        }
      }

      // 2. Path match
      for (const targetPath of intent.targetPaths) {
        if (chunk.filePath.toLowerCase().includes(targetPath.toLowerCase())) {
          score += 0.5;
          isPathMatch = true;
        }
      }

      // 3. Keyword token overlap
      const contentLower = chunk.content.toLowerCase();
      let matchedKw = 0;
      for (const kw of intent.keywords) {
        if (contentLower.includes(kw)) {
          matchedKw++;
        }
      }

      if (intent.keywords.length > 0) {
        score += (matchedKw / intent.keywords.length) * 0.4;
      }

      if (score > 0.1) {
        scored.push({
          chunk,
          score: Math.min(1, score),
          isExactSymbol,
          isPathMatch,
        });
      }
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Expand retrieved chunks using Phase 3 dependency graph
   */
  private expandStructuralContext(
    currentResults: RetrievalResult[],
    allChunks: CodeChunk[],
    intelligence: CodebaseIntelligence
  ): RetrievalResult[] {
    const seenPaths = new Set(currentResults.map(r => r.chunk.filePath));
    const seenIds = new Set(currentResults.map(r => r.chunk.id));
    const expanded: RetrievalResult[] = [];

    for (const res of currentResults.slice(0, 3)) {
      const fileIntel = intelligence.files.find((f: FileIntelligence) => f.filePath === res.chunk.filePath);
      if (!fileIntel) continue;

      // Check direct internal dependencies
      const relatedPaths = [...fileIntel.internalDependencies, ...fileIntel.dependents].slice(0, 2);

      for (const relPath of relatedPaths) {
        if (seenPaths.has(relPath)) continue;
        seenPaths.add(relPath);

        // Find primary chunk of related file
        const relatedChunk = allChunks.find(c => c.filePath === relPath && (c.symbolType === 'component' || c.symbolType === 'function' || c.symbolType === 'class' || c.startLine === 1));

        if (relatedChunk && !seenIds.has(relatedChunk.id)) {
          seenIds.add(relatedChunk.id);
          expanded.push({
            chunk: relatedChunk,
            score: res.score * 0.75, // Scaled down structural bonus
            matchReason: 'structural_expansion',
          });
        }
      }
    }

    return expanded;
  }
}
