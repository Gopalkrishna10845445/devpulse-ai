import { describe, it, expect } from 'vitest';
import { CitationValidator } from '../citationValidator';
import { CodebaseIntelligence } from '../../intelligence/types';
import { RepositoryIndex } from '../../repository/types';

describe('Citation Validator', () => {
  it('extracts citations from formatted text', () => {
    const text = `
      Authentication is handled in \`src/auth/login.ts:20-48\`.
      Token verification occurs in [src/middleware/auth.ts:12-39].
      Also check src/routes/user.ts:8.
    `;

    const citations = CitationValidator.extractCitationsFromText(text);
    expect(citations.length).toBe(3);
    expect(citations[0]).toEqual({ filePath: 'src/auth/login.ts', startLine: 20, endLine: 48 });
    expect(citations[1]).toEqual({ filePath: 'src/middleware/auth.ts', startLine: 12, endLine: 39 });
    expect(citations[2]).toEqual({ filePath: 'src/routes/user.ts', startLine: 8, endLine: 8 });
  });

  it('validates citations against actual repository files and flags hallucinated files', () => {
    const mockIntelligence: CodebaseIntelligence = {
      repository: { fullName: 'test/repo' } as any,
      architecture: {
        pattern: 'Modular Layered Architecture',
        summary: 'Test',
        layers: [],
        dataFlow: [],
        entrypoints: [],
        metrics: {} as any,
      },
      files: [
        {
          filePath: 'src/auth/login.ts',
          language: 'TypeScript',
          role: 'service',
          loc: 100,
          sizeBytes: 2000,
          symbols: [{ name: 'loginUser', kind: 'function', filePath: 'src/auth/login.ts', isExported: true }],
          imports: [],
          exports: [],
          internalDependencies: [],
          dependents: [],
        },
      ],
      symbols: [],
      imports: [],
      exports: [],
      relationships: [],
      analyzedAt: new Date().toISOString(),
      status: 'complete',
      durationMs: 10,
    };

    const validCitation = { filePath: 'src/auth/login.ts', startLine: 10, endLine: 40 };
    const fakeFileCitation = { filePath: 'src/nonexistent/fake.ts', startLine: 1, endLine: 20 };
    const invalidLineCitation = { filePath: 'src/auth/login.ts', startLine: 400, endLine: 450 }; // Exceeds 100 loc

    const results = CitationValidator.validateCitations(
      [validCitation, fakeFileCitation, invalidLineCitation],
      'test/repo',
      'sha123',
      undefined,
      mockIntelligence
    );

    expect(results.length).toBe(3);
    expect(results[0].isValid).toBe(true);
    expect(results[1].isValid).toBe(false);
    expect(results[1].validationError).toContain('does not exist');
    expect(results[2].isValid).toBe(false);
    expect(results[2].validationError).toContain('exceeds file length');
  });
});
