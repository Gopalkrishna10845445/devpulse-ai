/**
 * Phase 3 — Import & Export Resolver and Module Dependency Graph
 *
 * Extracts import/export declarations across languages and resolves internal
 * file paths and architectural module coupling edges.
 */

import { CodeExport, CodeImport, ModuleRelationship } from './types';

// ─── Extract Imports ──────────────────────────────────────────────────────────

export function parseImports(filePath: string, content: string, language: string | null): CodeImport[] {
  if (!content || !content.trim()) return [];

  const lang = (language || '').toLowerCase();
  const lines = content.split('\n');
  const imports: CodeImport[] = [];

  if (lang.includes('typescript') || lang.includes('javascript')) {
    // 1. ES Modules: import ... from '...'
    const esImportRegex = /import\s+(?:([\w*\s{},$]+)\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = esImportRegex.exec(content)) !== null) {
      const clause = match[1]?.trim() || '';
      const importPath = match[2].trim();
      const isRelative = importPath.startsWith('.') || importPath.startsWith('@/');
      const isNamespace = clause.includes('* as ');
      const isDefault = !clause.includes('{') && !isNamespace && clause.length > 0;

      const importedSymbols: string[] = [];
      if (clause.includes('{')) {
        const beforeBrace = clause.split('{')[0].replace(/,/g, '').trim();
        if (beforeBrace && !beforeBrace.startsWith('*')) {
          importedSymbols.push(beforeBrace);
        }
        const inside = clause.match(/\{([^}]+)\}/);
        if (inside) {
          inside[1].split(',').forEach(s => {
            const clean = s.trim().split(/\s+as\s+/)[0].trim();
            if (clean) importedSymbols.push(clean);
          });
        }
      } else if (isDefault) {
        importedSymbols.push(clause.trim());
      } else if (isNamespace) {
        const nsMatch = clause.match(/\*\s+as\s+([\w$]+)/);
        if (nsMatch) importedSymbols.push(nsMatch[1]);
      }

      imports.push({
        sourcePath: filePath,
        importPath,
        importedSymbols,
        isDefault,
        isNamespace,
        isRelative,
      });
    }

    // 2. CommonJS: const ... = require('...')
    const cjsRegex = /(?:const|let|var)\s+([\w\s{},$]+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
    while ((match = cjsRegex.exec(content)) !== null) {
      const clause = match[1].trim();
      const importPath = match[2].trim();
      const isRelative = importPath.startsWith('.') || importPath.startsWith('@/');

      imports.push({
        sourcePath: filePath,
        importPath,
        importedSymbols: [clause],
        isDefault: true,
        isNamespace: false,
        isRelative,
      });
    }
  } else if (lang.includes('python')) {
    // 1. from x import y, z
    const fromImportRegex = /^from\s+([a-zA-Z0-9_.]+)\s+import\s+([^#\n]+)/gm;
    let match;
    while ((match = fromImportRegex.exec(content)) !== null) {
      const importPath = match[1].trim();
      const rawSymbols = match[2].trim();
      const isRelative = importPath.startsWith('.');
      const importedSymbols = rawSymbols.split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);

      imports.push({
        sourcePath: filePath,
        importPath,
        importedSymbols,
        isDefault: false,
        isNamespace: rawSymbols === '*',
        isRelative,
      });
    }

    // 2. import x
    const directImportRegex = /^import\s+([a-zA-Z0-9_.,\s]+)/gm;
    while ((match = directImportRegex.exec(content)) !== null) {
      const raw = match[1].trim();
      raw.split(',').forEach(item => {
        const clean = item.trim().split(/\s+as\s+/)[0].trim();
        if (clean) {
          imports.push({
            sourcePath: filePath,
            importPath: clean,
            importedSymbols: [clean],
            isDefault: true,
            isNamespace: false,
            isRelative: clean.startsWith('.'),
          });
        }
      });
    }
  } else if (lang.includes('go')) {
    // Go single & block imports
    const goBlockMatch = content.match(/import\s*\(([\s\S]*?)\)/);
    if (goBlockMatch) {
      const lines = goBlockMatch[1].split('\n');
      for (const l of lines) {
        const m = l.trim().match(/(?:[\w.]+\s+)?["']([^"']+)["']/);
        if (m) {
          imports.push({
            sourcePath: filePath,
            importPath: m[1],
            importedSymbols: [],
            isDefault: false,
            isNamespace: false,
            isRelative: m[1].startsWith('.'),
          });
        }
      }
    }
    const goSingleMatches = content.matchAll(/^import\s+["']([^"']+)["']/gm);
    for (const m of goSingleMatches) {
      imports.push({
        sourcePath: filePath,
        importPath: m[1],
        importedSymbols: [],
        isDefault: false,
        isNamespace: false,
        isRelative: m[1].startsWith('.'),
      });
    }
  }

  return imports;
}

// ─── Extract Exports ──────────────────────────────────────────────────────────

export function parseExports(filePath: string, content: string, language: string | null): CodeExport[] {
  if (!content || !content.trim()) return [];

  const lang = (language || '').toLowerCase();
  const exports: CodeExport[] = [];

  if (lang.includes('typescript') || lang.includes('javascript')) {
    // 1. export default (function|class|identifier)
    const defaultMatch = content.match(/export\s+default\s+(?:(?:async\s+)?function\s+([A-Za-z0-9_$]+)|class\s+([A-Za-z0-9_$]+)|([A-Za-z0-9_$]+))/);
    if (defaultMatch) {
      const name = defaultMatch[1] || defaultMatch[2] || defaultMatch[3] || 'default';
      exports.push({
        sourcePath: filePath,
        name,
        isDefault: true,
      });
    }

    // 2. export const / function / class / interface / type / enum
    const namedExportRegex = /export\s+(?:(?:async\s+)?function|class|interface|type|enum|const|let|var)\s+([A-Za-z0-9_$]+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push({
        sourcePath: filePath,
        name: match[1],
        isDefault: false,
      });
    }

    // 3. export { a, b, c }
    const bracketExportRegex = /export\s+\{([^}]+)\}/g;
    while ((match = bracketExportRegex.exec(content)) !== null) {
      const inside = match[1];
      inside.split(',').forEach(item => {
        const clean = item.trim().split(/\s+as\s+/)[0].trim();
        if (clean && !exports.some(e => e.name === clean)) {
          exports.push({
            sourcePath: filePath,
            name: clean,
            isDefault: false,
          });
        }
      });
    }
  }

  return exports;
}

// ─── Resolve File Import Paths ─────────────────────────────────────────────────

export function resolveImportPath(
  sourcePath: string,
  importPath: string,
  allFilePaths: string[]
): string | undefined {
  const fileSet = new Set(allFilePaths);

  // 1. Alias @/* resolution (maps @/ -> src/ or root)
  if (importPath.startsWith('@/')) {
    const withoutAlias = importPath.slice(2);
    const candidates = [
      `src/${withoutAlias}`,
      `src/${withoutAlias}.ts`,
      `src/${withoutAlias}.tsx`,
      `src/${withoutAlias}.js`,
      `src/${withoutAlias}.jsx`,
      `src/${withoutAlias}/index.ts`,
      `src/${withoutAlias}/index.tsx`,
      `src/${withoutAlias}/index.js`,
      withoutAlias,
      `${withoutAlias}.ts`,
      `${withoutAlias}.tsx`,
      `${withoutAlias}.js`,
      `${withoutAlias}/index.ts`,
      `${withoutAlias}/index.tsx`,
    ];
    for (const c of candidates) {
      if (fileSet.has(c)) return c;
    }
  }

  // 2. Relative resolution (./ or ../)
  if (importPath.startsWith('.')) {
    const sourceDirParts = sourcePath.split('/');
    sourceDirParts.pop(); // remove file name

    const importParts = importPath.split('/');
    const resolvedParts = [...sourceDirParts];

    for (const part of importParts) {
      if (part === '.') continue;
      if (part === '..') {
        resolvedParts.pop();
      } else {
        resolvedParts.push(part);
      }
    }

    const basePath = resolvedParts.join('/');
    const candidates = [
      basePath,
      `${basePath}.ts`,
      `${basePath}.tsx`,
      `${basePath}.js`,
      `${basePath}.jsx`,
      `${basePath}.py`,
      `${basePath}/index.ts`,
      `${basePath}/index.tsx`,
      `${basePath}/index.js`,
      `${basePath}/__init__.py`,
    ];

    for (const c of candidates) {
      if (fileSet.has(c)) return c;
    }
  }

  return undefined;
}

// ─── Build Module Relationships Graph ──────────────────────────────────────────

export function buildModuleRelationships(
  imports: CodeImport[],
  fileModuleMap: Map<string, string>
): ModuleRelationship[] {
  const edgeMap = new Map<string, { importCount: number; sampleImports: Set<string> }>();

  for (const imp of imports) {
    if (!imp.resolvedFilePath) continue;

    const fromModule = fileModuleMap.get(imp.sourcePath) || getRootModule(imp.sourcePath);
    const toModule = fileModuleMap.get(imp.resolvedFilePath) || getRootModule(imp.resolvedFilePath);

    if (fromModule && toModule && fromModule !== toModule) {
      const key = `${fromModule} -> ${toModule}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { importCount: 0, sampleImports: new Set() });
      }
      const data = edgeMap.get(key)!;
      data.importCount += 1;
      if (data.sampleImports.size < 4) {
        data.sampleImports.add(`${imp.sourcePath.split('/').pop()} → ${imp.resolvedFilePath.split('/').pop()}`);
      }
    }
  }

  const relationships: ModuleRelationship[] = [];
  for (const [key, data] of edgeMap.entries()) {
    const [fromModule, toModule] = key.split(' -> ');
    relationships.push({
      fromModule,
      toModule,
      importCount: data.importCount,
      sampleImports: Array.from(data.sampleImports),
    });
  }

  return relationships.sort((a, b) => b.importCount - a.importCount);
}

function getRootModule(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length > 2 && parts[0] === 'src') {
    return `src/${parts[1]}`;
  }
  return parts[0] || 'root';
}
