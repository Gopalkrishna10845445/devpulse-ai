/**
 * Phase 2 — Dependency Manifest Detector & Extractor
 *
 * Deterministically parses dependency manifests across multiple ecosystems:
 *   - npm: package.json
 *   - Python: requirements.txt, pyproject.toml, Pipfile
 *   - Go: go.mod
 *   - Rust: Cargo.toml
 *   - Java: pom.xml, build.gradle, build.gradle.kts
 *   - Ruby: Gemfile
 *   - PHP: composer.json
 *
 * Extracts dependency names and optional version constraints into typed records.
 */

import { ManifestEcosystem, RepositoryDependency, RepositoryManifest } from './types';

export function detectEcosystem(manifestPath: string): ManifestEcosystem {
  const fileName = manifestPath.split('/').pop()?.toLowerCase() || '';

  if (fileName === 'package.json') return 'npm';
  if (['requirements.txt', 'pyproject.toml', 'pipfile'].includes(fileName)) return 'pypi';
  if (fileName === 'go.mod') return 'go';
  if (fileName === 'cargo.toml') return 'cargo';
  if (fileName === 'pom.xml') return 'maven';
  if (fileName.startsWith('build.gradle')) return 'gradle';
  if (fileName === 'gemfile') return 'rubygems';
  if (fileName === 'composer.json') return 'composer';
  if (fileName === 'mix.exs') return 'hex';
  if (['project.clj', 'deps.edn'].includes(fileName)) return 'clojure';
  if (fileName === 'package.swift') return 'swift';

  return 'unknown';
}

// ─── Parsers for Each Manifest Format ─────────────────────────────────────────

/** Parse package.json (npm) */
export function parsePackageJson(content: string, manifestPath: string): {
  dependencies: RepositoryDependency[];
  devDependencies: RepositoryDependency[];
} {
  const dependencies: RepositoryDependency[] = [];
  const devDependencies: RepositoryDependency[] = [];

  try {
    const pkg = JSON.parse(content);

    if (pkg.dependencies && typeof pkg.dependencies === 'object') {
      for (const [name, ver] of Object.entries(pkg.dependencies)) {
        if (typeof name === 'string' && name.trim()) {
          dependencies.push({
            name: name.trim(),
            versionConstraint: typeof ver === 'string' ? ver.trim() : undefined,
            isDev: false,
            manifestPath,
            ecosystem: 'npm',
          });
        }
      }
    }

    if (pkg.devDependencies && typeof pkg.devDependencies === 'object') {
      for (const [name, ver] of Object.entries(pkg.devDependencies)) {
        if (typeof name === 'string' && name.trim()) {
          devDependencies.push({
            name: name.trim(),
            versionConstraint: typeof ver === 'string' ? ver.trim() : undefined,
            isDev: true,
            manifestPath,
            ecosystem: 'npm',
          });
        }
      }
    }
  } catch {
    // If JSON parsing fails, return empty collections safely
  }

  return { dependencies, devDependencies };
}

/** Parse requirements.txt (Python) */
export function parseRequirementsTxt(content: string, manifestPath: string): {
  dependencies: RepositoryDependency[];
  devDependencies: RepositoryDependency[];
} {
  const dependencies: RepositoryDependency[] = [];
  const lines = content.split('\n');

  for (let line of lines) {
    line = line.trim();
    // Ignore comments and pip flags (-r, -i, -f, --extra-index-url)
    if (!line || line.startsWith('#') || line.startsWith('-')) continue;

    // Strip inline comments
    line = line.split('#')[0].trim();

    // Match package name (with optional [extras]) and version specifier
    const match = line.match(/^([a-zA-Z0-9_\-.]+)(?:\[[^\]]+\])?\s*(?:([=><~!^].+))?$/);
    if (match) {
      const name = match[1];
      const versionConstraint = match[2]?.trim();
      dependencies.push({
        name,
        versionConstraint: versionConstraint || undefined,
        isDev: false,
        manifestPath,
        ecosystem: 'pypi',
      });
    }
  }

  return { dependencies, devDependencies: [] };
}

/** Parse pyproject.toml (Python) */
export function parsePyprojectToml(content: string, manifestPath: string): {
  dependencies: RepositoryDependency[];
  devDependencies: RepositoryDependency[];
} {
  const dependencies: RepositoryDependency[] = [];
  const devDependencies: RepositoryDependency[] = [];

  // Match dependencies in [project] dependencies = [...]
  const projectDepsMatch = content.match(/\[project\][\s\S]*?dependencies\s*=\s*\[([\s\S]*?)\]/);
  if (projectDepsMatch) {
    const rawDeps = projectDepsMatch[1];
    const depStrings = rawDeps.match(/"([^"]+)"|'([^']+)'/g) || [];
    for (const d of depStrings) {
      const cleaned = d.replace(/['"]/g, '').trim();
      const match = cleaned.match(/^([a-zA-Z0-9_\-.]+)\s*(?:([=><~!^].+))?$/);
      if (match) {
        dependencies.push({
          name: match[1],
          versionConstraint: match[2]?.trim(),
          isDev: false,
          manifestPath,
          ecosystem: 'pypi',
        });
      }
    }
  }

  // Match poetry dependencies [tool.poetry.dependencies]
  const poetryDepsMatch = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?:\[|$)/);
  if (poetryDepsMatch) {
    const section = poetryDepsMatch[1];
    const lines = section.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const m = trimmed.match(/^([a-zA-Z0-9_\-.]+)\s*=\s*(.+)$/);
      if (m && m[1].toLowerCase() !== 'python') {
        const name = m[1];
        const ver = m[2].replace(/['"]/g, '').trim();
        dependencies.push({
          name,
          versionConstraint: ver.startsWith('{') ? undefined : ver,
          isDev: false,
          manifestPath,
          ecosystem: 'pypi',
        });
      }
    }
  }

  return { dependencies, devDependencies };
}

/** Parse go.mod (Go) */
export function parseGoMod(content: string, manifestPath: string): {
  dependencies: RepositoryDependency[];
  devDependencies: RepositoryDependency[];
} {
  const dependencies: RepositoryDependency[] = [];

  // Match block requires: require ( ... )
  const blockMatch = content.match(/require\s*\(([\s\S]*?)\)/g);
  if (blockMatch) {
    for (const block of blockMatch) {
      const lines = block.split('\n');
      for (const line of lines) {
        const trimmed = line.replace(/require|\(|\)/g, '').trim();
        if (!trimmed || trimmed.startsWith('//')) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          dependencies.push({
            name: parts[0],
            versionConstraint: parts[1],
            isDev: false,
            manifestPath,
            ecosystem: 'go',
          });
        }
      }
    }
  }

  // Match single-line requires: require github.com/foo/bar v1.0.0
  const singleMatches = content.matchAll(/^require\s+([^\s(]+)\s+([^\s]+)/gm);
  for (const m of singleMatches) {
    dependencies.push({
      name: m[1],
      versionConstraint: m[2],
      isDev: false,
      manifestPath,
      ecosystem: 'go',
    });
  }

  return { dependencies, devDependencies: [] };
}

/** Parse Cargo.toml (Rust) */
export function parseCargoToml(content: string, manifestPath: string): {
  dependencies: RepositoryDependency[];
  devDependencies: RepositoryDependency[];
} {
  const dependencies: RepositoryDependency[] = [];
  const devDependencies: RepositoryDependency[] = [];

  let currentSection: 'deps' | 'dev-deps' | 'other' = 'other';
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('[')) {
      if (/^\[dependencies\]/i.test(trimmed)) {
        currentSection = 'deps';
      } else if (/^\[dev-dependencies\]/i.test(trimmed)) {
        currentSection = 'dev-deps';
      } else {
        currentSection = 'other';
      }
      continue;
    }

    if (currentSection === 'deps' || currentSection === 'dev-deps') {
      const match = trimmed.match(/^([a-zA-Z0-9_\-]+)\s*=\s*(.+)$/);
      if (match) {
        const name = match[1];
        const rawVer = match[2].trim();
        let versionConstraint: string | undefined;

        if (rawVer.startsWith('"') || rawVer.startsWith("'")) {
          versionConstraint = rawVer.replace(/['"]/g, '');
        } else if (rawVer.includes('version')) {
          const vMatch = rawVer.match(/version\s*=\s*["']([^"']+)["']/);
          if (vMatch) versionConstraint = vMatch[1];
        }

        const dep: RepositoryDependency = {
          name,
          versionConstraint,
          isDev: currentSection === 'dev-deps',
          manifestPath,
          ecosystem: 'cargo',
        };

        if (currentSection === 'deps') dependencies.push(dep);
        else devDependencies.push(dep);
      }
    }
  }

  return { dependencies, devDependencies };
}

/** Parse pom.xml (Java Maven) */
export function parsePomXml(content: string, manifestPath: string): {
  dependencies: RepositoryDependency[];
  devDependencies: RepositoryDependency[];
} {
  const dependencies: RepositoryDependency[] = [];
  const devDependencies: RepositoryDependency[] = [];

  const depBlockRegex = /<dependency>([\s\S]*?)<\/dependency>/g;
  const blocks = content.matchAll(depBlockRegex);

  for (const block of blocks) {
    const blockContent = block[1];
    const groupMatch = blockContent.match(/<groupId>([^<]+)<\/groupId>/);
    const artifactMatch = blockContent.match(/<artifactId>([^<]+)<\/artifactId>/);
    const versionMatch = blockContent.match(/<version>([^<]+)<\/version>/);
    const scopeMatch = blockContent.match(/<scope>([^<]+)<\/scope>/);

    if (artifactMatch) {
      const groupId = groupMatch ? groupMatch[1].trim() : '';
      const artifactId = artifactMatch[1].trim();
      const fullName = groupId ? `${groupId}:${artifactId}` : artifactId;
      const scope = scopeMatch ? scopeMatch[1].trim().toLowerCase() : 'compile';
      const isDev = scope === 'test' || scope === 'provided';

      const dep: RepositoryDependency = {
        name: fullName,
        versionConstraint: versionMatch ? versionMatch[1].trim() : undefined,
        isDev,
        category: scope,
        manifestPath,
        ecosystem: 'maven',
      };

      if (isDev) devDependencies.push(dep);
      else dependencies.push(dep);
    }
  }

  return { dependencies, devDependencies };
}

/** Parse composer.json (PHP) */
export function parseComposerJson(content: string, manifestPath: string): {
  dependencies: RepositoryDependency[];
  devDependencies: RepositoryDependency[];
} {
  const dependencies: RepositoryDependency[] = [];
  const devDependencies: RepositoryDependency[] = [];

  try {
    const pkg = JSON.parse(content);
    if (pkg.require && typeof pkg.require === 'object') {
      for (const [name, ver] of Object.entries(pkg.require)) {
        if (typeof name === 'string' && name.trim() && name.toLowerCase() !== 'php') {
          dependencies.push({
            name: name.trim(),
            versionConstraint: typeof ver === 'string' ? ver.trim() : undefined,
            isDev: false,
            manifestPath,
            ecosystem: 'composer',
          });
        }
      }
    }
    if (pkg['require-dev'] && typeof pkg['require-dev'] === 'object') {
      for (const [name, ver] of Object.entries(pkg['require-dev'])) {
        if (typeof name === 'string' && name.trim()) {
          devDependencies.push({
            name: name.trim(),
            versionConstraint: typeof ver === 'string' ? ver.trim() : undefined,
            isDev: true,
            manifestPath,
            ecosystem: 'composer',
          });
        }
      }
    }
  } catch {
    // Return empty on JSON failure
  }

  return { dependencies, devDependencies };
}

/** Parse Gemfile (Ruby) */
export function parseGemfile(content: string, manifestPath: string): {
  dependencies: RepositoryDependency[];
  devDependencies: RepositoryDependency[];
} {
  const dependencies: RepositoryDependency[] = [];
  const devDependencies: RepositoryDependency[] = [];

  const lines = content.split('\n');
  let inGroupDev = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('group')) {
      inGroupDev = /development|test/i.test(trimmed);
      continue;
    }
    if (trimmed === 'end') {
      inGroupDev = false;
      continue;
    }

    const gemMatch = trimmed.match(/^gem\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/);
    if (gemMatch) {
      const name = gemMatch[1];
      const ver = gemMatch[2];
      const dep: RepositoryDependency = {
        name,
        versionConstraint: ver,
        isDev: inGroupDev,
        manifestPath,
        ecosystem: 'rubygems',
      };
      if (inGroupDev) devDependencies.push(dep);
      else dependencies.push(dep);
    }
  }

  return { dependencies, devDependencies };
}

// ─── Main Manifest Dispatcher ──────────────────────────────────────────────────

export function parseManifestContent(manifestPath: string, content: string): RepositoryManifest {
  const ecosystem = detectEcosystem(manifestPath);
  const fileName = manifestPath.split('/').pop()?.toLowerCase() || '';

  let dependencies: RepositoryDependency[] = [];
  let devDependencies: RepositoryDependency[] = [];

  if (fileName === 'package.json') {
    ({ dependencies, devDependencies } = parsePackageJson(content, manifestPath));
  } else if (fileName === 'requirements.txt') {
    ({ dependencies, devDependencies } = parseRequirementsTxt(content, manifestPath));
  } else if (fileName === 'pyproject.toml') {
    ({ dependencies, devDependencies } = parsePyprojectToml(content, manifestPath));
  } else if (fileName === 'go.mod') {
    ({ dependencies, devDependencies } = parseGoMod(content, manifestPath));
  } else if (fileName === 'cargo.toml') {
    ({ dependencies, devDependencies } = parseCargoToml(content, manifestPath));
  } else if (fileName === 'pom.xml') {
    ({ dependencies, devDependencies } = parsePomXml(content, manifestPath));
  } else if (fileName === 'composer.json') {
    ({ dependencies, devDependencies } = parseComposerJson(content, manifestPath));
  } else if (fileName === 'gemfile') {
    ({ dependencies, devDependencies } = parseGemfile(content, manifestPath));
  }

  return {
    path: manifestPath,
    ecosystem,
    dependencyCount: dependencies.length,
    devDependencyCount: devDependencies.length,
    dependencies,
    devDependencies,
  };
}
