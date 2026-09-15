import { describe, it, expect } from 'vitest';
import { detectModules } from '../moduleDetector';
import { RepositoryFileNode } from '../types';

describe('detectModules', () => {
  it('identifies structural modules with file counts and byte sizes', () => {
    const files: RepositoryFileNode[] = [
      {
        path: 'src/app/page.tsx',
        name: 'page.tsx',
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
        path: 'src/app/api/analyze/route.ts',
        name: 'route.ts',
        type: 'file',
        sizeBytes: 1500,
        extension: 'ts',
        language: 'TypeScript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
      {
        path: 'src/components/Sidebar.tsx',
        name: 'Sidebar.tsx',
        type: 'file',
        sizeBytes: 4000,
        extension: 'tsx',
        language: 'TypeScript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
      {
        path: 'src/lib/githubAnalyzer.ts',
        name: 'githubAnalyzer.ts',
        type: 'file',
        sizeBytes: 8000,
        extension: 'ts',
        language: 'TypeScript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
      {
        path: 'src/lib/__tests__/githubAnalyzer.test.ts',
        name: 'githubAnalyzer.test.ts',
        type: 'file',
        sizeBytes: 3000,
        extension: 'ts',
        language: 'TypeScript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
    ];

    const modules = detectModules(files);
    const roles = modules.map(m => m.detectedRole);

    expect(roles).toContain('app_router');
    expect(roles).toContain('components');
    expect(roles).toContain('lib_utilities');

    const appModule = modules.find(m => m.path === 'src/app')!;
    expect(appModule.fileCount).toBe(2);
    expect(appModule.totalBytes).toBe(3500);
    expect(appModule.primaryLanguage).toBe('TypeScript');
  });

  it('handles flat repositories without crashing', () => {
    const files: RepositoryFileNode[] = [
      {
        path: 'main.py',
        name: 'main.py',
        type: 'file',
        sizeBytes: 500,
        extension: 'py',
        language: 'Python',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
    ];

    const modules = detectModules(files);
    expect(modules).toEqual([]);
  });
});
