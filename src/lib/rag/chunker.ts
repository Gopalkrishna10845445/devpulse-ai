/**
 * Phase 4 — Structural Code Chunker
 *
 * Extracts semantic, symbol-aligned chunks rather than arbitrary text slices.
 * Respects function, class, component, and configuration boundaries.
 */

import { FileIntelligence } from '../intelligence/types';
import { CodeChunk } from './types';

// Deterministic chunk ID generator
export function createChunkId(
  repositoryId: string,
  commitSha: string,
  filePath: string,
  startLine: number,
  endLine: number,
  symbolName?: string
): string {
  const symPart = symbolName ? `:${symbolName}` : '';
  return `${repositoryId}@${commitSha.slice(0, 7)}/${filePath}#L${startLine}-L${endLine}${symPart}`;
}

export function chunkSourceFile(
  filePath: string,
  content: string,
  repositoryId: string,
  commitSha: string,
  fileIntelligence?: FileIntelligence
): CodeChunk[] {
  if (!content || !content.trim()) return [];

  const lines = content.split('\n');
  const totalLines = lines.length;
  const chunks: CodeChunk[] = [];
  const moduleName = filePath.split('/')[0] || 'root';
  const language = fileIntelligence?.language || detectLanguageFromPath(filePath);

  // 1. Markdown file chunking by section headers
  if (filePath.endsWith('.md') || filePath.endsWith('.mdx')) {
    const mdChunks = chunkMarkdown(filePath, lines, repositoryId, commitSha, language, moduleName);
    if (mdChunks.length > 0) return mdChunks;
  }

  // 2. If file is small (< 40 lines), keep as a single atomic file chunk
  if (totalLines <= 40) {
    chunks.push({
      id: createChunkId(repositoryId, commitSha, filePath, 1, totalLines),
      repositoryId,
      commitSha,
      filePath,
      language,
      module: moduleName,
      symbolName: fileIntelligence?.symbols?.[0]?.name,
      symbolType: fileIntelligence?.role || 'code_section',
      startLine: 1,
      endLine: totalLines,
      content: content.trim(),
      tokenCountEstimate: Math.ceil(content.length / 4),
    });
    return chunks;
  }

  // 2. If Phase 3 symbols exist with line numbers, chunk around symbols
  const symbols = fileIntelligence?.symbols || [];
  const sortedSymbols = [...symbols]
    .filter(s => typeof s.line === 'number' && s.line > 0)
    .sort((a, b) => (a.line || 0) - (b.line || 0));

  if (sortedSymbols.length > 0) {
    // 2a. Header / module overview chunk (lines 1 to first symbol)
    const firstSymbolLine = sortedSymbols[0].line || 1;
    if (firstSymbolLine > 3) {
      const headerEnd = Math.min(firstSymbolLine - 1, 40);
      const headerContent = lines.slice(0, headerEnd).join('\n').trim();
      if (headerContent.length > 20) {
        chunks.push({
          id: createChunkId(repositoryId, commitSha, filePath, 1, headerEnd, 'module_header'),
          repositoryId,
          commitSha,
          filePath,
          language,
          module: moduleName,
          symbolName: 'module_header',
          symbolType: 'module_overview',
          startLine: 1,
          endLine: headerEnd,
          content: headerContent,
          tokenCountEstimate: Math.ceil(headerContent.length / 4),
        });
      }
    }

    // 2b. Symbol chunks
    for (let i = 0; i < sortedSymbols.length; i++) {
      const currentSym = sortedSymbols[i];
      const startLine = currentSym.line || 1;
      const nextSym = sortedSymbols[i + 1];
      
      // Determine end line: either before next symbol, or brace-bounded, or cap at 80 lines
      let endLine = nextSym && nextSym.line ? nextSym.line - 1 : Math.min(totalLines, startLine + 60);
      if (endLine < startLine) endLine = startLine;
      if (endLine - startLine > 100) {
        endLine = startLine + 100; // Cap single symbol chunk to 100 lines
      }

      const symbolLines = lines.slice(startLine - 1, endLine);
      const symbolContent = symbolLines.join('\n').trim();

      if (symbolContent.length > 10) {
        chunks.push({
          id: createChunkId(repositoryId, commitSha, filePath, startLine, endLine, currentSym.name),
          repositoryId,
          commitSha,
          filePath,
          language,
          module: moduleName,
          symbolName: currentSym.name,
          symbolType: currentSym.kind,
          startLine,
          endLine,
          content: symbolContent,
          tokenCountEstimate: Math.ceil(symbolContent.length / 4),
        });
      }
    }

    return chunks;
  }

  // 3. Fallback for Markdown or Config / Non-symbol files: Section & Window chunking
  if (filePath.endsWith('.md') || filePath.endsWith('.mdx')) {
    return chunkMarkdown(filePath, lines, repositoryId, commitSha, language, moduleName);
  }

  // 4. Default sliding window chunking with 40-line blocks and 10-line overlap
  const windowSize = 40;
  const overlap = 10;
  let start = 0;

  while (start < totalLines) {
    const end = Math.min(totalLines, start + windowSize);
    const chunkLines = lines.slice(start, end);
    const chunkContent = chunkLines.join('\n').trim();

    if (chunkContent.length > 15) {
      chunks.push({
        id: createChunkId(repositoryId, commitSha, filePath, start + 1, end),
        repositoryId,
        commitSha,
        filePath,
        language,
        module: moduleName,
        symbolType: 'code_section',
        startLine: start + 1,
        endLine: end,
        content: chunkContent,
        tokenCountEstimate: Math.ceil(chunkContent.length / 4),
      });
    }

    if (end >= totalLines) break;
    start += windowSize - overlap;
  }

  return chunks;
}

function chunkMarkdown(
  filePath: string,
  lines: string[],
  repositoryId: string,
  commitSha: string,
  language: string,
  moduleName: string
): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  let currentHeader = 'Introduction';
  let sectionStart = 1;
  let sectionLines: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineNum = idx + 1;

    if (line.startsWith('#') && sectionLines.length > 0) {
      // Flush previous section
      const content = sectionLines.join('\n').trim();
      if (content.length > 15) {
        chunks.push({
          id: createChunkId(repositoryId, commitSha, filePath, sectionStart, lineNum - 1, currentHeader),
          repositoryId,
          commitSha,
          filePath,
          language,
          module: moduleName,
          symbolName: currentHeader,
          symbolType: 'code_section',
          startLine: sectionStart,
          endLine: lineNum - 1,
          content,
          tokenCountEstimate: Math.ceil(content.length / 4),
        });
      }

      currentHeader = line.replace(/^#+\s*/, '').trim() || 'Section';
      sectionStart = lineNum;
      sectionLines = [line];
    } else {
      sectionLines.push(line);
    }
  }

  if (sectionLines.length > 0) {
    const content = sectionLines.join('\n').trim();
    if (content.length > 15) {
      chunks.push({
        id: createChunkId(repositoryId, commitSha, filePath, sectionStart, lines.length, currentHeader),
        repositoryId,
        commitSha,
        filePath,
        language,
        module: moduleName,
        symbolName: currentHeader,
        symbolType: 'code_section',
        startLine: sectionStart,
        endLine: lines.length,
        content,
        tokenCountEstimate: Math.ceil(content.length / 4),
      });
    }
  }

  return chunks;
}

function detectLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'TypeScript';
    case 'js':
    case 'jsx':
      return 'JavaScript';
    case 'py':
      return 'Python';
    case 'go':
      return 'Go';
    case 'rs':
      return 'Rust';
    case 'java':
      return 'Java';
    case 'json':
      return 'JSON';
    case 'yaml':
    case 'yml':
      return 'YAML';
    case 'md':
      return 'Markdown';
    default:
      return 'Unknown';
  }
}
