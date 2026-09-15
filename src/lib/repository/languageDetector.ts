/**
 * Phase 2 — Deterministic Language Detector
 *
 * Detects programming languages and configuration formats from file paths,
 * extensions, and filenames.
 *
 * Aggregates file counts and exact byte weights across indexed files.
 * Zero fabricated percentages — computed directly from real byte totals.
 */

import { RepositoryFileNode, RepositoryLanguageSummary } from './types';

export const LANGUAGE_EXTENSION_MAP: Record<string, string> = {
  // TypeScript / JavaScript
  ts: 'TypeScript',
  tsx: 'TypeScript',
  mts: 'TypeScript',
  cts: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',

  // Python
  py: 'Python',
  pyi: 'Python',
  pyx: 'Python',

  // Go
  go: 'Go',

  // Rust
  rs: 'Rust',

  // Java / JVM
  java: 'Java',
  kt: 'Kotlin',
  kts: 'Kotlin',
  scala: 'Scala',
  sc: 'Scala',
  groovy: 'Groovy',

  // C / C++
  c: 'C',
  h: 'C',
  cpp: 'C++',
  hpp: 'C++',
  cc: 'C++',
  cxx: 'C++',
  hh: 'C++',

  // C# / .NET
  cs: 'C#',
  fs: 'F#',

  // Systems / Scripts
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Shell',
  ps1: 'PowerShell',
  rb: 'Ruby',
  rake: 'Ruby',
  php: 'PHP',
  phtml: 'PHP',
  swift: 'Swift',
  dart: 'Dart',
  lua: 'Lua',
  r: 'R',
  ex: 'Elixir',
  exs: 'Elixir',
  clj: 'Clojure',
  cljs: 'Clojure',

  // Web / Markup / Styles
  html: 'HTML',
  htm: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'Sass',
  less: 'Less',
  vue: 'Vue',
  svelte: 'Svelte',
  sql: 'SQL',

  // Config & Data (classified when part of source repo)
  json: 'JSON',
  json5: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  xml: 'XML',
  md: 'Markdown',
  mdx: 'MDX',
  graphql: 'GraphQL',
  gql: 'GraphQL',
  proto: 'Protocol Buffers',
  dockerfile: 'Dockerfile',
};

export const FILENAME_LANGUAGE_MAP: Record<string, string> = {
  dockerfile: 'Dockerfile',
  'dockerfile.dev': 'Dockerfile',
  'dockerfile.prod': 'Dockerfile',
  makefile: 'Makefile',
  gnumakefile: 'Makefile',
  cmakelists: 'CMake',
  gemfile: 'Ruby',
  rakefile: 'Ruby',
  vagranfile: 'Ruby',
};

export const LANGUAGE_HEX_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Go: '#00add8',
  Rust: '#dea584',
  Java: '#b07219',
  'C++': '#f34b7d',
  'C#': '#178600',
  C: '#555555',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Shell: '#89e051',
  PowerShell: '#012456',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#ffac45',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Scala: '#c22d40',
  Elixir: '#6e4a7e',
  Clojure: '#db5855',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  SQL: '#e38c00',
  Markdown: '#083fa1',
  MDX: '#fcb32c',
  JSON: '#292929',
  YAML: '#cb171e',
  TOML: '#9c4221',
  Dockerfile: '#384d54',
};

/**
 * Detect language for an individual file path.
 * Returns null if no recognized programming/config language applies.
 */
export function detectFileLanguage(filePath: string): string | null {
  const fileName = filePath.split('/').pop()?.toLowerCase() || '';

  // Check exact filename mapping first
  if (FILENAME_LANGUAGE_MAP[fileName]) {
    return FILENAME_LANGUAGE_MAP[fileName];
  }

  // Check extension mapping
  const parts = fileName.split('.');
  if (parts.length > 1) {
    const ext = parts.pop() || '';
    if (LANGUAGE_EXTENSION_MAP[ext]) {
      return LANGUAGE_EXTENSION_MAP[ext];
    }
  }

  return null;
}

/**
 * Aggregates language distribution from a list of indexed files.
 * Calculates exact file counts and byte weights.
 */
export function aggregateLanguages(files: RepositoryFileNode[]): RepositoryLanguageSummary[] {
  const languageStats: Record<string, { fileCount: number; bytes: number }> = {};
  let totalIndexedBytes = 0;

  for (const file of files) {
    // Only count indexed or parsed manifest files
    if (file.status === 'skipped') continue;

    const lang = file.language;
    if (!lang) continue;

    if (!languageStats[lang]) {
      languageStats[lang] = { fileCount: 0, bytes: 0 };
    }

    languageStats[lang].fileCount += 1;
    languageStats[lang].bytes += file.sizeBytes;
    totalIndexedBytes += file.sizeBytes;
  }

  const summaries: RepositoryLanguageSummary[] = Object.entries(languageStats)
    .map(([name, stats]) => {
      const percentage = totalIndexedBytes > 0
        ? Math.round((stats.bytes / totalIndexedBytes) * 100)
        : 0;

      return {
        name,
        fileCount: stats.fileCount,
        bytes: stats.bytes,
        percentage,
        color: LANGUAGE_HEX_COLORS[name] || '#94a3b8',
      };
    })
    .sort((a, b) => b.bytes - a.bytes);

  return summaries;
}
