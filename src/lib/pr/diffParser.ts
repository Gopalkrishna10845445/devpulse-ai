/**
 * Phase 8 — Diff Parser
 *
 * Deterministically parses unified diffs into structured file representations,
 * hunks, and individual line mappings (with precise old/new line numbers).
 */

import { DiffHunk, DiffLine, ParsedDiffFile } from './types';

/**
 * Parses a complete multi-file unified diff string into structured file representations.
 */
export function parseUnifiedDiff(rawDiff: string): ParsedDiffFile[] {
  if (!rawDiff || !rawDiff.trim()) {
    return [];
  }

  const files: ParsedDiffFile[] = [];
  const lines = rawDiff.split(/\r?\n/);
  let currentFile: ParsedDiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineCounter = 0;
  let newLineCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect file header: "diff --git a/... b/..."
    if (line.startsWith('diff --git ')) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
        currentHunk = null;
      }
      if (currentFile) {
        files.push(currentFile);
      }

      const match = line.match(/diff --git a\/(.+?) b\/(.+)/);
      const oldPath = match ? match[1] : '';
      const newPath = match ? match[2] : '';
      const filePath = newPath || oldPath || 'unknown';

      currentFile = {
        filePath,
        oldPath: oldPath !== newPath ? oldPath : undefined,
        status: 'modified',
        hunks: [],
        addedLinesCount: 0,
        deletedLinesCount: 0,
        addedLineNumbers: [],
        deletedLineNumbers: [],
      };
      continue;
    }

    if (!currentFile) continue;

    // Detect status flags
    if (line.startsWith('new file mode ')) {
      currentFile.status = 'added';
      continue;
    }
    if (line.startsWith('deleted file mode ')) {
      currentFile.status = 'deleted';
      continue;
    }
    if (line.startsWith('rename from ')) {
      currentFile.status = 'renamed';
      currentFile.oldPath = line.substring('rename from '.length).trim();
      continue;
    }
    if (line.startsWith('rename to ')) {
      currentFile.filePath = line.substring('rename to '.length).trim();
      continue;
    }

    // Detect hunk header: "@@ -oldStart,oldLines +newStart,newLines @@ optional context"
    if (line.startsWith('@@ ')) {
      if (currentHunk) {
        currentFile.hunks.push(currentHunk);
      }

      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/);
      if (hunkMatch) {
        const oldStart = parseInt(hunkMatch[1], 10);
        const oldLines = hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1;
        const newStart = parseInt(hunkMatch[3], 10);
        const newLines = hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1;

        oldLineCounter = oldStart;
        newLineCounter = newStart;

        currentHunk = {
          header: line,
          oldStart,
          oldLines,
          newStart,
          newLines,
          lines: [],
        };
      }
      continue;
    }

    // Process hunk lines
    if (currentHunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        const diffLine: DiffLine = {
          type: 'add',
          content: line.substring(1),
          newLineNumber: newLineCounter,
        };
        currentHunk.lines.push(diffLine);
        currentFile.addedLineNumbers.push(newLineCounter);
        currentFile.addedLinesCount++;
        newLineCounter++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        const diffLine: DiffLine = {
          type: 'del',
          content: line.substring(1),
          oldLineNumber: oldLineCounter,
        };
        currentHunk.lines.push(diffLine);
        currentFile.deletedLineNumbers.push(oldLineCounter);
        currentFile.deletedLinesCount++;
        oldLineCounter++;
      } else if (line.startsWith(' ') || line === '') {
        const diffLine: DiffLine = {
          type: 'context',
          content: line.startsWith(' ') ? line.substring(1) : line,
          oldLineNumber: oldLineCounter,
          newLineNumber: newLineCounter,
        };
        currentHunk.lines.push(diffLine);
        oldLineCounter++;
        newLineCounter++;
      }
    }
  }

  if (currentHunk && currentFile) {
    currentFile.hunks.push(currentHunk);
  }
  if (currentFile) {
    files.push(currentFile);
  }

  return files;
}

/**
 * Extracts added code content for a given file as a string.
 */
export function extractAddedCode(parsedFile: ParsedDiffFile): string {
  const addedLines: string[] = [];
  for (const hunk of parsedFile.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add') {
        addedLines.push(line.content);
      }
    }
  }
  return addedLines.join('\n');
}

/**
 * Extracts unified diff snippet for a specific line range in a parsed file.
 */
export function extractSnippetForLine(parsedFile: ParsedDiffFile, targetLine: number, contextLines: number = 3): string {
  for (const hunk of parsedFile.hunks) {
    const matchingIdx = hunk.lines.findIndex(
      l => l.newLineNumber === targetLine || l.oldLineNumber === targetLine
    );

    if (matchingIdx !== -1) {
      const start = Math.max(0, matchingIdx - contextLines);
      const end = Math.min(hunk.lines.length, matchingIdx + contextLines + 1);
      return hunk.lines
        .slice(start, end)
        .map(l => {
          const prefix = l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' ';
          const num = l.newLineNumber || l.oldLineNumber || ' ';
          return `${num.toString().padStart(4, ' ')} ${prefix} ${l.content}`;
        })
        .join('\n');
    }
  }
  return '';
}
