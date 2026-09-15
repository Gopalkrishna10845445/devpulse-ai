import { describe, it, expect } from 'vitest';
import {
  parseImports,
  parseExports,
  resolveImportPath,
  buildModuleRelationships,
} from '../importResolver';
import { CodeImport } from '../types';

describe('parseImports & parseExports - TypeScript', () => {
  it('extracts named, default, and namespace imports', () => {
    const code = `
import React, { useState, useEffect as useMount } from 'react';
import * as Lucide from 'lucide-react';
import { analyzeProfile } from '@/lib/profileEvaluator';
import '../globals.css';
`;
    const imports = parseImports('src/components/Dashboard.tsx', code, 'TypeScript');
    expect(imports).toHaveLength(4);

    const reactImp = imports.find(i => i.importPath === 'react')!;
    expect(reactImp.importedSymbols).toContain('React');
    expect(reactImp.importedSymbols).toContain('useState');
    expect(reactImp.importedSymbols).toContain('useEffect');

    const evalImp = imports.find(i => i.importPath === '@/lib/profileEvaluator')!;
    expect(evalImp.isRelative).toBe(true);
    expect(evalImp.importedSymbols).toEqual(['analyzeProfile']);
  });

  it('extracts named and default exports', () => {
    const code = `
export const API_URL = 'https://api.github.com';
export function calculateScore() {}
export default function MainApp() {}
export { helperA, helperB };
`;
    const exports = parseExports('src/lib/engine.ts', code, 'TypeScript');
    const names = exports.map(e => e.name);

    expect(names).toContain('API_URL');
    expect(names).toContain('calculateScore');
    expect(names).toContain('MainApp');
    expect(names).toContain('helperA');
    expect(names).toContain('helperB');
  });
});

describe('resolveImportPath', () => {
  const allFiles = [
    'src/app/page.tsx',
    'src/components/Sidebar.tsx',
    'src/components/TopBar.tsx',
    'src/lib/utils.ts',
    'src/lib/profileEvaluator.ts',
  ];

  it('resolves alias @/ path to real src file', () => {
    const resolved = resolveImportPath('src/components/Sidebar.tsx', '@/lib/utils', allFiles);
    expect(resolved).toBe('src/lib/utils.ts');
  });

  it('resolves relative path ../ to sibling directory', () => {
    const resolved = resolveImportPath('src/components/Sidebar.tsx', '../lib/profileEvaluator', allFiles);
    expect(resolved).toBe('src/lib/profileEvaluator.ts');
  });

  it('returns undefined for external node_modules packages', () => {
    const resolved = resolveImportPath('src/components/Sidebar.tsx', 'react', allFiles);
    expect(resolved).toBeUndefined();
  });
});

describe('buildModuleRelationships', () => {
  it('aggregates inter-module imports into directional relationship edges', () => {
    const imports: CodeImport[] = [
      {
        sourcePath: 'src/app/page.tsx',
        importPath: '@/components/Sidebar',
        importedSymbols: ['Sidebar'],
        isDefault: false,
        isNamespace: false,
        isRelative: true,
        resolvedFilePath: 'src/components/Sidebar.tsx',
      },
      {
        sourcePath: 'src/app/page.tsx',
        importPath: '@/components/TopBar',
        importedSymbols: ['TopBar'],
        isDefault: false,
        isNamespace: false,
        isRelative: true,
        resolvedFilePath: 'src/components/TopBar.tsx',
      },
      {
        sourcePath: 'src/components/Sidebar.tsx',
        importPath: '@/lib/utils',
        importedSymbols: ['formatScore'],
        isDefault: false,
        isNamespace: false,
        isRelative: true,
        resolvedFilePath: 'src/lib/utils.ts',
      },
    ];

    const fileModuleMap = new Map([
      ['src/app/page.tsx', 'src/app'],
      ['src/components/Sidebar.tsx', 'src/components'],
      ['src/components/TopBar.tsx', 'src/components'],
      ['src/lib/utils.ts', 'src/lib'],
    ]);

    const relationships = buildModuleRelationships(imports, fileModuleMap);

    expect(relationships).toHaveLength(2);
    expect(relationships[0].fromModule).toBe('src/app');
    expect(relationships[0].toModule).toBe('src/components');
    expect(relationships[0].importCount).toBe(2);

    expect(relationships[1].fromModule).toBe('src/components');
    expect(relationships[1].toModule).toBe('src/lib');
    expect(relationships[1].importCount).toBe(1);
  });
});
