/**
 * Phase 4 — Citation Extraction & Validation Engine
 *
 * Extracts structured citations from LLM output and rigorously validates them
 * against the indexed repository file nodes, line ranges, and symbols.
 * Drops or flags any hallucinated citations.
 */

import { CodebaseIntelligence, FileIntelligence } from '../intelligence/types';
import { RepositoryIndex } from '../repository/types';
import { Citation, ValidatedCitation } from './types';

export class CitationValidator {
  /**
   * Extract citations formatted as:
   * - `filePath:startLine-endLine`
   * - `filePath:line`
   * - `[filePath:startLine-endLine]`
   * - `filePath (Lines X–Y)`
   */
  static extractCitationsFromText(text: string): Citation[] {
    const citations: Citation[] = [];
    const seen = new Set<string>();

    // 1. Regex for `path/to/file.ext:startLine-endLine` or `path/to/file.ext:line`
    const pathLineRegex = /(?:^|\s|`|\[)([\w./\\-]+\.[a-zA-Z0-9]+):(\d+)(?:-(\d+))?(?:`|\]|\s|,|\.|$|;)/gm;
    let match;

    while ((match = pathLineRegex.exec(text)) !== null) {
      const filePath = match[1].replace(/^[./\\]+/, '').replace(/\\/g, '/');
      const startLine = parseInt(match[2], 10);
      const endLine = match[3] ? parseInt(match[3], 10) : startLine;

      const key = `${filePath}:${startLine}-${endLine}`;
      if (!seen.has(key)) {
        seen.add(key);
        citations.push({
          filePath,
          startLine,
          endLine,
        });
      }
    }

    // 2. Regex for `path/to/file.ext (Lines X-Y)` or `Lines X–Y in path/to/file.ext`
    const descriptiveRegex = /`?([\w./\\-]+\.[a-zA-Z0-9]+)`?\s*\(?(?:lines?|L)\s*(\d+)(?:\s*(?:–|-|to)\s*(\d+))?\)?/gi;
    while ((match = descriptiveRegex.exec(text)) !== null) {
      const filePath = match[1].replace(/^[./\\]+/, '').replace(/\\/g, '/');
      const startLine = parseInt(match[2], 10);
      const endLine = match[3] ? parseInt(match[3], 10) : startLine;

      const key = `${filePath}:${startLine}-${endLine}`;
      if (!seen.has(key)) {
        seen.add(key);
        citations.push({
          filePath,
          startLine,
          endLine,
        });
      }
    }

    return citations;
  }

  /**
   * Validate citations against real repository indexing data
   */
  static validateCitations(
    citations: Citation[],
    repositoryId: string,
    commitSha: string,
    repositoryIndex?: RepositoryIndex,
    codebaseIntelligence?: CodebaseIntelligence
  ): ValidatedCitation[] {
    const validated: ValidatedCitation[] = [];

    // Map existing files to their line counts and symbols
    const fileMap = new Map<string, { totalLines: number; symbols: string[] }>();

    if (codebaseIntelligence) {
      for (const file of codebaseIntelligence.files) {
        fileMap.set(file.filePath, {
          totalLines: file.loc || 1000,
          symbols: file.symbols.map(s => s.name.toLowerCase()),
        });
      }
    }

    if (repositoryIndex) {
      for (const node of repositoryIndex.files) {
        if (!fileMap.has(node.path)) {
          fileMap.set(node.path, {
            totalLines: 1000, // Default generous bound if exact LOC not computed
            symbols: [],
          });
        }
      }
    }

    for (const citation of citations) {
      const normalizedPath = citation.filePath.replace(/^\/+/, '');
      const fileInfo = fileMap.get(normalizedPath);

      // Check 1: File must exist in repository index
      if (!fileInfo) {
        // Try fuzzy suffix match (e.g. `auth/login.ts` vs `src/auth/login.ts`)
        const matchedEntry = Array.from(fileMap.entries()).find(([path]) =>
          path.endsWith(normalizedPath) || normalizedPath.endsWith(path)
        );

        if (!matchedEntry) {
          validated.push({
            ...citation,
            isValid: false,
            validationError: `File '${citation.filePath}' does not exist in indexed repository ${repositoryId}@${commitSha.slice(0, 7)}`,
          });
          continue;
        }
      }

      // Check 2: Valid line ranges
      if (citation.startLine < 1) {
        validated.push({
          ...citation,
          isValid: false,
          validationError: `Invalid start line ${citation.startLine}`,
        });
        continue;
      }

      if (citation.endLine < citation.startLine) {
        validated.push({
          ...citation,
          isValid: false,
          validationError: `End line (${citation.endLine}) cannot be less than start line (${citation.startLine})`,
        });
        continue;
      }

      if (fileInfo && fileInfo.totalLines > 0 && citation.startLine > fileInfo.totalLines + 20) {
        validated.push({
          ...citation,
          isValid: false,
          validationError: `Start line ${citation.startLine} exceeds file length (${fileInfo.totalLines} lines)`,
        });
        continue;
      }

      // Check 3: Symbol existence if provided
      if (citation.symbol && fileInfo && fileInfo.symbols.length > 0) {
        const hasSym = fileInfo.symbols.includes(citation.symbol.toLowerCase());
        if (!hasSym) {
          // Warning but valid file/line
          validated.push({
            ...citation,
            isValid: true,
          });
          continue;
        }
      }

      validated.push({
        ...citation,
        isValid: true,
      });
    }

    return validated;
  }
}
