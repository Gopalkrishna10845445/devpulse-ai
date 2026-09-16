import { describe, it, expect } from 'vitest';
import { chunkSourceFile, createChunkId } from '../chunker';
import { FileIntelligence } from '../../intelligence/types';

describe('Structural Code Chunker', () => {
  it('creates deterministic chunk IDs', () => {
    const id = createChunkId('owner/repo', 'abc1234567', 'src/auth/login.ts', 10, 45, 'loginUser');
    expect(id).toBe('owner/repo@abc1234/src/auth/login.ts#L10-L45:loginUser');
  });

  it('keeps small files as atomic chunks', () => {
    const content = `import React from 'react';\nexport const Button = () => <button>Click</button>;`;
    const chunks = chunkSourceFile('src/Button.tsx', content, 'owner/repo', 'abc1234');

    expect(chunks.length).toBe(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(2);
    expect(chunks[0].filePath).toBe('src/Button.tsx');
  });

  it('chunks around Phase 3 discovered symbols with exact line numbers', () => {
    const lines = Array.from({ length: 80 }, (_, i) => `// line ${i + 1}`);
    lines[14] = `export function authenticateUser(token: string) {`;
    lines[15] = `  return token === 'secret';`;
    lines[16] = `}`;
    lines[44] = `export class SessionManager {`;
    lines[45] = `  validate() { return true; }`;
    lines[46] = `}`;

    const content = lines.join('\n');

    const fileIntel: FileIntelligence = {
      filePath: 'src/services/auth.ts',
      language: 'TypeScript',
      role: 'service',
      loc: 80,
      sizeBytes: content.length,
      symbols: [
        { name: 'authenticateUser', kind: 'function', filePath: 'src/services/auth.ts', line: 15, isExported: true },
        { name: 'SessionManager', kind: 'class', filePath: 'src/services/auth.ts', line: 45, isExported: true },
      ],
      imports: [],
      exports: [],
      internalDependencies: [],
      dependents: [],
    };

    const chunks = chunkSourceFile('src/services/auth.ts', content, 'owner/repo', 'abc1234', fileIntel);

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    
    const authChunk = chunks.find(c => c.symbolName === 'authenticateUser');
    expect(authChunk).toBeDefined();
    expect(authChunk?.startLine).toBe(15);
    expect(authChunk?.symbolType).toBe('function');
    expect(authChunk?.content).toContain('authenticateUser');

    const sessionChunk = chunks.find(c => c.symbolName === 'SessionManager');
    expect(sessionChunk).toBeDefined();
    expect(sessionChunk?.startLine).toBe(45);
    expect(sessionChunk?.symbolType).toBe('class');
    expect(sessionChunk?.content).toContain('SessionManager');
  });

  it('chunks markdown files by headers', () => {
    const md = `# Title\n\nIntro text\n\n## Section One\n\nDetails about one\n\n## Section Two\n\nDetails about two\n`;
    const chunks = chunkSourceFile('README.md', md, 'owner/repo', 'abc1234');

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.some(c => c.symbolName === 'Section One' || c.content.includes('Section One'))).toBe(true);
  });
});
