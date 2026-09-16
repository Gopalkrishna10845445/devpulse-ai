/**
 * Phase 4 — Multi-Provider & Deterministic Embeddings Engine
 *
 * Provides vector embeddings for code chunks and search queries.
 * Supports Gemini / OpenAI when configured, and falls back to a deterministic
 * 384-dimensional semantic-hashing vectorizer for zero-dependency offline/testing operation.
 */

export interface EmbeddingProvider {
  name: string;
  dimension: number;
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// ─── Deterministic Feature-Hash Embedder (384-dim) ───────────────────────────

export class DeterministicLocalEmbedder implements EmbeddingProvider {
  name = 'deterministic-local-384';
  dimension = 384;

  async embedText(text: string): Promise<number[]> {
    return this.vectorize(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(t => this.vectorize(t));
  }

  private vectorize(text: string): number[] {
    const vec = new Array(this.dimension).fill(0);
    if (!text || !text.trim()) return vec;

    const normalized = text.toLowerCase();
    // Tokenize into words, camelCase fragments, and character trigrams
    const tokens = normalized
      .replace(/[^\w\s$@_-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);

    // Add subword n-grams for code symbols
    const subgrams: string[] = [];
    for (const token of tokens) {
      if (token.length >= 3 && token.length <= 15) {
        for (let i = 0; i <= token.length - 3; i++) {
          subgrams.push(token.substring(i, i + 3));
        }
      }
    }

    const allFeatures = [...tokens, ...subgrams];

    for (const feature of allFeatures) {
      const h1 = this.hashString(feature, 0);
      const h2 = this.hashString(feature, 42);
      
      const idx = Math.abs(h1) % this.dimension;
      const sign = h2 % 2 === 0 ? 1 : -1;
      
      // Weight longer tokens slightly higher than trigrams
      const weight = feature.length > 3 ? 1.5 : 1.0;
      vec[idx] += sign * weight;
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < this.dimension; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) {
        vec[i] /= norm;
      }
    }

    return vec;
  }

  private hashString(str: string, seed: number): number {
    let h = seed ^ 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h;
  }
}

// ─── Gemini Embeddings Provider ──────────────────────────────────────────────

export class GeminiEmbedder implements EmbeddingProvider {
  name = 'gemini-text-embedding-004';
  dimension = 768;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async embedText(text: string): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: text.slice(0, 8000) }] },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini embedding error: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.embedding.values;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    // Process sequentially or small batches to respect rate limits
    for (const text of texts) {
      results.push(await this.embedText(text));
    }
    return results;
  }
}

// ─── OpenAI Embeddings Provider ──────────────────────────────────────────────

export class OpenAIEmbedder implements EmbeddingProvider {
  name = 'openai-text-embedding-3-small';
  dimension = 1536;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async embedText(text: string): Promise<number[]> {
    const batch = await this.embedBatch([text]);
    return batch[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts.map(t => t.slice(0, 8000)),
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI embedding error: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.data.map((item: any) => item.embedding);
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function getEmbeddingProvider(): EmbeddingProvider {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (geminiKey && !geminiKey.startsWith('mock-')) {
    return new GeminiEmbedder(geminiKey);
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey && !openAiKey.startsWith('mock-')) {
    return new OpenAIEmbedder(openAiKey);
  }

  // Deterministic local embedder by default (pure TS, fast, testable)
  return new DeterministicLocalEmbedder();
}

// ─── Cosine Similarity ───────────────────────────────────────────────────────

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
