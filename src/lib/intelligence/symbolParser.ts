/**
 * Phase 3 — Deterministic Language-Aware Symbol Parser
 *
 * Extracts structural symbols (functions, classes, interfaces, types, components,
 * structs, enums, endpoints) from source file contents across TypeScript, JavaScript,
 * Python, Go, Rust, and Java.
 */

import { CodeSymbol, SymbolKind } from './types';

export function parseSymbols(filePath: string, content: string, language: string | null): CodeSymbol[] {
  if (!content || !content.trim()) return [];

  const lang = (language || '').toLowerCase();
  const fileName = filePath.split('/').pop() || '';
  const lines = content.split('\n');

  if (lang.includes('typescript') || lang.includes('javascript')) {
    return parseTypeScriptSymbols(filePath, lines);
  }
  if (lang.includes('python')) {
    return parsePythonSymbols(filePath, lines);
  }
  if (lang.includes('go')) {
    return parseGoSymbols(filePath, lines);
  }
  if (lang.includes('rust')) {
    return parseRustSymbols(filePath, lines);
  }
  if (lang.includes('java')) {
    return parseJavaSymbols(filePath, lines);
  }

  // Fallback for general C-style languages
  return parseGenericSymbols(filePath, lines);
}

// ─── TypeScript / JavaScript Parser ───────────────────────────────────────────

function parseTypeScriptSymbols(filePath: string, lines: string[]): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const isComponentFile = /\.(?:tsx|jsx)$/i.test(filePath) || /components|app|pages/i.test(filePath);
  const isApiRoute = /(?:api|routes?)\/.*route\.[jt]s$/i.test(filePath) || /route\.[jt]sx?$/i.test(filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    const isExported = line.startsWith('export ');

    // 1. API Route handlers: export async function GET / POST / etc.
    if (isApiRoute && /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/.test(line)) {
      const match = line.match(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/);
      if (match) {
        symbols.push({
          name: match[1],
          kind: 'endpoint',
          filePath,
          line: i + 1,
          isExported: true,
          signature: line.replace(/\{.*$/, '').trim(),
        });
        continue;
      }
    }

    // 2. Interfaces: (export)? interface InterfaceName<T>?
    const interfaceMatch = line.match(/(?:export\s+)?interface\s+([A-Za-z0-9_$]+)/);
    if (interfaceMatch) {
      symbols.push({
        name: interfaceMatch[1],
        kind: 'interface',
        filePath,
        line: i + 1,
        isExported,
        signature: line.replace(/\{.*$/, '').trim(),
      });
      continue;
    }

    // 3. Types: (export)? type TypeName = ...
    const typeMatch = line.match(/(?:export\s+)?type\s+([A-Za-z0-9_$]+)\s*(?:<[^>]+>)?\s*=/);
    if (typeMatch) {
      symbols.push({
        name: typeMatch[1],
        kind: 'type_alias',
        filePath,
        line: i + 1,
        isExported,
        signature: line.slice(0, 80).trim(),
      });
      continue;
    }

    // 4. Classes: (export)? (abstract)? class ClassName
    const classMatch = line.match(/(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)/);
    if (classMatch) {
      symbols.push({
        name: classMatch[1],
        kind: 'class',
        filePath,
        line: i + 1,
        isExported,
        signature: line.replace(/\{.*$/, '').trim(),
      });
      continue;
    }

    // 5. Enums: (export)? enum EnumName
    const enumMatch = line.match(/(?:export\s+)?enum\s+([A-Za-z0-9_$]+)/);
    if (enumMatch) {
      symbols.push({
        name: enumMatch[1],
        kind: 'enum',
        filePath,
        line: i + 1,
        isExported,
        signature: line.replace(/\{.*$/, '').trim(),
      });
      continue;
    }

    // 6. Functions: (export)? (async)? function functionName(params)
    const funcMatch = line.match(/(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)/);
    if (funcMatch) {
      const name = funcMatch[1];
      const isCapitalized = /^[A-Z]/.test(name);
      const kind: SymbolKind = isComponentFile && isCapitalized ? 'component' : 'function';
      symbols.push({
        name,
        kind,
        filePath,
        line: i + 1,
        isExported,
        signature: `${name}(${funcMatch[2]})`,
      });
      continue;
    }

    // 7. Arrow Functions / Components: (export)? const FunctionName = (async)? (params) =>
    const arrowMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)(?:\s*:\s*[^=]+)?\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/);
    if (arrowMatch) {
      const name = arrowMatch[1];
      const isCapitalized = /^[A-Z]/.test(name);
      const kind: SymbolKind = isComponentFile && isCapitalized ? 'component' : 'function';
      symbols.push({
        name,
        kind,
        filePath,
        line: i + 1,
        isExported,
        signature: `${name}(${arrowMatch[2]}) => ...`,
      });
      continue;
    }

    // 8. Class Methods / Member Functions: (public|private|protected|static)? (async)? methodName(params)
    const methodMatch = line.match(/^(?:public\s+|private\s+|protected\s+|static\s+|override\s+)?(?:async\s+)?([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*(?::\s*[^;{]+)?\s*\{?/);
    if (methodMatch && !['if', 'for', 'while', 'switch', 'catch', 'constructor', 'function', 'return'].includes(methodMatch[1])) {
      const name = methodMatch[1];
      symbols.push({
        name,
        kind: 'function',
        filePath,
        line: i + 1,
        isExported: false,
        signature: `${name}(${methodMatch[2]})`,
      });
      continue;
    }
  }

  return symbols;
}

// ─── Python Parser ────────────────────────────────────────────────────────────

function parsePythonSymbols(filePath: string, lines: string[]): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Functions / Async Functions: (async)? def func_name(params):
    const funcMatch = line.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/);
    if (funcMatch) {
      const name = funcMatch[1];
      const isPrivate = name.startsWith('_') && !name.startsWith('__init__');
      symbols.push({
        name,
        kind: 'function',
        filePath,
        line: i + 1,
        isExported: !isPrivate,
        signature: `def ${name}(${funcMatch[2]})${funcMatch[3] ? ` -> ${funcMatch[3]}` : ''}`,
      });
      continue;
    }

    // Classes: class ClassName(Base):
    const classMatch = line.match(/^class\s+([a-zA-Z0-9_]+)(?:\s*\(([^)]*)\))?:/);
    if (classMatch) {
      symbols.push({
        name: classMatch[1],
        kind: 'class',
        filePath,
        line: i + 1,
        isExported: !classMatch[1].startsWith('_'),
        signature: `class ${classMatch[1]}${classMatch[2] ? `(${classMatch[2]})` : ''}`,
      });
      continue;
    }
  }

  return symbols;
}

// ─── Go Parser ────────────────────────────────────────────────────────────────

function parseGoSymbols(filePath: string, lines: string[]): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//')) continue;

    // Functions: func (r *Receiver)? FuncName(params) (returns)?
    const funcMatch = line.match(/^func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)\s*\(([^)]*)\)/);
    if (funcMatch) {
      const name = funcMatch[1];
      const isExported = /^[A-Z]/.test(name);
      symbols.push({
        name,
        kind: 'function',
        filePath,
        line: i + 1,
        isExported,
        signature: line.replace(/\{.*$/, '').trim(),
      });
      continue;
    }

    // Structs / Interfaces: type TypeName struct / interface
    const typeMatch = line.match(/^type\s+([A-Za-z0-9_]+)\s+(struct|interface)\b/);
    if (typeMatch) {
      const name = typeMatch[1];
      const kind: SymbolKind = typeMatch[2] === 'struct' ? 'struct' : 'interface';
      symbols.push({
        name,
        kind,
        filePath,
        line: i + 1,
        isExported: /^[A-Z]/.test(name),
        signature: `type ${name} ${typeMatch[2]}`,
      });
      continue;
    }
  }

  return symbols;
}

// ─── Rust Parser ──────────────────────────────────────────────────────────────

function parseRustSymbols(filePath: string, lines: string[]): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//')) continue;

    const isPub = line.startsWith('pub ');

    // Functions: (pub)? (async)? fn func_name(params)
    const fnMatch = line.match(/(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      symbols.push({
        name: fnMatch[1],
        kind: 'function',
        filePath,
        line: i + 1,
        isExported: isPub,
        signature: line.replace(/\{.*$/, '').trim(),
      });
      continue;
    }

    // Structs: (pub)? struct StructName
    const structMatch = line.match(/(?:pub\s+)?struct\s+([a-zA-Z0-9_]+)/);
    if (structMatch) {
      symbols.push({
        name: structMatch[1],
        kind: 'struct',
        filePath,
        line: i + 1,
        isExported: isPub,
        signature: `struct ${structMatch[1]}`,
      });
      continue;
    }

    // Traits: (pub)? trait TraitName
    const traitMatch = line.match(/(?:pub\s+)?trait\s+([a-zA-Z0-9_]+)/);
    if (traitMatch) {
      symbols.push({
        name: traitMatch[1],
        kind: 'trait',
        filePath,
        line: i + 1,
        isExported: isPub,
        signature: `trait ${traitMatch[1]}`,
      });
      continue;
    }

    // Enums: (pub)? enum EnumName
    const enumMatch = line.match(/(?:pub\s+)?enum\s+([a-zA-Z0-9_]+)/);
    if (enumMatch) {
      symbols.push({
        name: enumMatch[1],
        kind: 'enum',
        filePath,
        line: i + 1,
        isExported: isPub,
        signature: `enum ${enumMatch[1]}`,
      });
      continue;
    }
  }

  return symbols;
}

// ─── Java Parser ──────────────────────────────────────────────────────────────

function parseJavaSymbols(filePath: string, lines: string[]): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('*')) continue;

    const isPublic = line.startsWith('public ');

    // Classes / Interfaces / Enums
    const classMatch = line.match(/(?:public|protected|private)?\s*(?:static\s+)?(?:final\s+)?(class|interface|enum)\s+([A-Za-z0-9_]+)/);
    if (classMatch) {
      const kindStr = classMatch[1];
      const name = classMatch[2];
      const kind: SymbolKind = kindStr === 'class' ? 'class' : kindStr === 'interface' ? 'interface' : 'enum';
      symbols.push({
        name,
        kind,
        filePath,
        line: i + 1,
        isExported: isPublic,
        signature: line.replace(/\{.*$/, '').trim(),
      });
      continue;
    }

    // Methods
    const methodMatch = line.match(/(?:public|protected|private)\s+(?:static\s+)?(?:final\s+)?(?:[\w<>[\],]+\s+)+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+)?\s*\{?/);
    if (methodMatch && !['if', 'for', 'while', 'switch', 'catch'].includes(methodMatch[1])) {
      symbols.push({
        name: methodMatch[1],
        kind: 'function',
        filePath,
        line: i + 1,
        isExported: isPublic,
        signature: `${methodMatch[1]}(${methodMatch[2]})`,
      });
      continue;
    }
  }

  return symbols;
}

// ─── Generic Fallback Parser ──────────────────────────────────────────────────

function parseGenericSymbols(filePath: string, lines: string[]): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const funcMatch = line.match(/(?:function|def|fn)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/);
    if (funcMatch) {
      symbols.push({
        name: funcMatch[1],
        kind: 'function',
        filePath,
        line: i + 1,
        isExported: true,
        signature: line.slice(0, 80),
      });
    }
  }
  return symbols;
}
