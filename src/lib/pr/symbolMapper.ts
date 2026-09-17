/**
 * Phase 8 — Changed Symbol Mapper
 *
 * Correlates modified line numbers from diff hunks with structural symbols
 * (functions, classes, interfaces, components, endpoints) from Phase 3 AST intelligence.
 */

import { ChangedSymbol, ParsedDiffFile } from './types';
import { CodebaseIntelligence, CodeSymbol } from '../intelligence/types';
import { parseSymbols } from '../intelligence/symbolParser';

export function mapChangedSymbols(
  parsedFiles: ParsedDiffFile[],
  intelligence?: CodebaseIntelligence | null,
  fileContents?: Record<string, string>
): ChangedSymbol[] {
  const changedSymbols: ChangedSymbol[] = [];
  const symbolMap = new Map<string, ChangedSymbol>();

  // Extract known symbols from CodebaseIntelligence if available
  const existingSymbolsByFile = new Map<string, CodeSymbol[]>();
  if (intelligence && intelligence.symbols) {
    for (const sym of intelligence.symbols) {
      const existing = existingSymbolsByFile.get(sym.filePath) || [];
      existing.push(sym);
      existingSymbolsByFile.set(sym.filePath, existing);
    }
  }

  for (const file of parsedFiles) {
    if (file.status === 'deleted') continue;

    // Get symbols either from intelligence or by parsing file/added content
    let symbols = existingSymbolsByFile.get(file.filePath) || [];

    if (symbols.length === 0 && fileContents && fileContents[file.filePath]) {
      symbols = parseSymbols(file.filePath, fileContents[file.filePath], 'typescript');
    }

    let isFromHunkFallback = false;
    // If still empty, parse directly from hunk lines in the diff
    if (symbols.length === 0) {
      const hunkText = file.hunks
        .flatMap(h => h.lines.map(l => l.content))
        .join('\n');
      if (hunkText.trim()) {
        symbols = parseSymbols(file.filePath, hunkText, 'typescript');
        isFromHunkFallback = true;
      }
    }

    const addedLinesSet = new Set(file.addedLineNumbers);
    const deletedLinesSet = new Set(file.deletedLineNumbers);

    for (const sym of symbols) {
      const symLine = sym.line || 1;
      // Symbol line is considered touched if it falls within or near the changed line range (+/- 5 lines)
      const isAdded = isFromHunkFallback || addedLinesSet.has(symLine) || Array.from(addedLinesSet).some(l => Math.abs(l - symLine) <= 5);
      const isDeleted = deletedLinesSet.has(symLine);

      // Only include symbols that are touched by the diff
      if (!isAdded && !isDeleted && file.status !== 'added') {
        continue;
      }

      let changeType: 'added' | 'modified' | 'deleted' = 'modified';
      if (file.status === 'added' || (isAdded && !isDeleted)) {
        changeType = 'added';
      } else if (isDeleted && !isAdded) {
        changeType = 'deleted';
      }

      const key = `${file.filePath}:${sym.name}:${sym.kind}`;
      if (!symbolMap.has(key)) {
        const changedSym: ChangedSymbol = {
          name: sym.name,
          kind: sym.kind,
          filePath: file.filePath,
          newLineRange: { start: symLine, end: symLine + 10 },
          changeType,
          signature: sym.signature,
        };
        symbolMap.set(key, changedSym);
        changedSymbols.push(changedSym);
      }
    }
  }

  return changedSymbols;
}
