import { describe, it, expect } from 'vitest';
import { detectFrameworks } from '../frameworkDetector';
import { RepositoryDependency, RepositoryFileNode } from '../types';

describe('detectFrameworks', () => {
  it('detects Next.js and React from dependency and config evidence', () => {
    const files: RepositoryFileNode[] = [
      {
        path: 'next.config.js',
        name: 'next.config.js',
        type: 'file',
        sizeBytes: 250,
        extension: 'js',
        language: 'JavaScript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
      {
        path: 'src/app/page.tsx',
        name: 'page.tsx',
        type: 'file',
        sizeBytes: 1500,
        extension: 'tsx',
        language: 'TypeScript',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
    ];

    const dependencies: RepositoryDependency[] = [
      { name: 'next', versionConstraint: '^14.2.0', manifestPath: 'package.json', ecosystem: 'npm' },
      { name: 'react', versionConstraint: '^18.3.0', manifestPath: 'package.json', ecosystem: 'npm' },
      { name: 'tailwindcss', versionConstraint: '^3.4.0', manifestPath: 'package.json', ecosystem: 'npm' },
    ];

    const frameworks = detectFrameworks(files, dependencies);
    const names = frameworks.map(f => f.name);

    expect(names).toContain('Next.js');
    expect(names).toContain('React');
    expect(names).toContain('Tailwind CSS');

    const nextFw = frameworks.find(f => f.name === 'Next.js')!;
    expect(nextFw.confidence).toBe('high');
    expect(nextFw.evidence).toEqual(
      expect.arrayContaining([
        expect.stringContaining('package.json dependency: next'),
        expect.stringContaining('Configuration file: next.config.js'),
      ])
    );
  });

  it('detects FastAPI and Pytest for Python repository', () => {
    const files: RepositoryFileNode[] = [
      {
        path: 'app/main.py',
        name: 'main.py',
        type: 'file',
        sizeBytes: 800,
        extension: 'py',
        language: 'Python',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
      {
        path: 'pytest.ini',
        name: 'pytest.ini',
        type: 'file',
        sizeBytes: 120,
        extension: 'ini',
        language: null,
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
    ];

    const dependencies: RepositoryDependency[] = [
      { name: 'fastapi', versionConstraint: '==0.110.0', manifestPath: 'requirements.txt', ecosystem: 'pypi' },
      { name: 'pytest', manifestPath: 'requirements.txt', ecosystem: 'pypi' },
    ];

    const frameworks = detectFrameworks(files, dependencies);
    const names = frameworks.map(f => f.name);

    expect(names).toContain('FastAPI');
    expect(names).toContain('Pytest');
  });

  it('detects Docker configuration files', () => {
    const files: RepositoryFileNode[] = [
      {
        path: 'Dockerfile',
        name: 'Dockerfile',
        type: 'file',
        sizeBytes: 400,
        extension: 'dockerfile',
        language: 'Dockerfile',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
      {
        path: 'docker-compose.yml',
        name: 'docker-compose.yml',
        type: 'file',
        sizeBytes: 600,
        extension: 'yml',
        language: 'YAML',
        isBinary: false,
        isSensitive: false,
        status: 'indexed',
        skipReason: null,
      },
    ];

    const frameworks = detectFrameworks(files, []);
    expect(frameworks.map(f => f.name)).toContain('Docker');
  });
});
