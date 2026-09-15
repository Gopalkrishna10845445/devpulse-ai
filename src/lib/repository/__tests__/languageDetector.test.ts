import { describe, it, expect } from 'vitest';
import { detectFileLanguage, aggregateLanguages } from '../languageDetector';
import { RepositoryFileNode } from '../types';

describe('detectFileLanguage', () => {
  it('detects common programming languages', () => {
    expect(detectFileLanguage('src/index.ts')).toBe('TypeScript');
    expect(detectFileLanguage('src/app.tsx')).toBe('TypeScript');
    expect(detectFileLanguage('app.js')).toBe('JavaScript');
    expect(detectFileLanguage('server.py')).toBe('Python');
    expect(detectFileLanguage('main.go')).toBe('Go');
    expect(detectFileLanguage('lib.rs')).toBe('Rust');
    expect(detectFileLanguage('Application.java')).toBe('Java');
    expect(detectFileLanguage('main.cpp')).toBe('C++');
    expect(detectFileLanguage('script.sh')).toBe('Shell');
    expect(detectFileLanguage('style.css')).toBe('CSS');
    expect(detectFileLanguage('App.vue')).toBe('Vue');
    expect(detectFileLanguage('App.svelte')).toBe('Svelte');
  });

  it('detects special filenames', () => {
    expect(detectFileLanguage('Dockerfile')).toBe('Dockerfile');
    expect(detectFileLanguage('Makefile')).toBe('Makefile');
    expect(detectFileLanguage('Gemfile')).toBe('Ruby');
  });

  it('returns null for unknown extensions', () => {
    expect(detectFileLanguage('data.xyz123')).toBeNull();
  });
});

describe('aggregateLanguages', () => {
  it('calculates exact byte totals and percentages', () => {
    const files: RepositoryFileNode[] = [
      {
        path: 'src/index.ts',
        name: 'index.ts',
        type: 'file',
        sizeBytes: 6000,
        extension: 'ts',
        language: 'TypeScript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
      {
        path: 'src/app.tsx',
        name: 'app.tsx',
        type: 'file',
        sizeBytes: 2000,
        extension: 'tsx',
        language: 'TypeScript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
      {
        path: 'script.py',
        name: 'script.py',
        type: 'file',
        sizeBytes: 2000,
        extension: 'py',
        language: 'Python',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
      {
        path: 'hero.png',
        name: 'hero.png',
        type: 'file',
        sizeBytes: 50000,
        extension: 'png',
        language: null,
        isBinary: true,
        isSensitive: false,
        status: 'skipped',
        skipReason: 'binary_file',
      },
    ];

    const result = aggregateLanguages(files);
    // Total indexed bytes = 6000 + 2000 + 2000 = 10000
    // TypeScript = 8000 bytes (80%), Python = 2000 bytes (20%)
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('TypeScript');
    expect(result[0].bytes).toBe(8000);
    expect(result[0].fileCount).toBe(2);
    expect(result[0].percentage).toBe(80);

    expect(result[1].name).toBe('Python');
    expect(result[1].bytes).toBe(2000);
    expect(result[1].fileCount).toBe(1);
    expect(result[1].percentage).toBe(20);
  });

  it('returns empty array when no indexed files have languages', () => {
    expect(aggregateLanguages([])).toEqual([]);
  });
});
