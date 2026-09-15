/**
 * Phase 2 — Deterministic Architectural Module Detector
 *
 * Scans directory structure to identify structural roles and modules
 * (app routing, UI components, business logic, api routes, database models, tests, utils).
 *
 * Computes exact file counts, byte sizes, and primary language per module.
 */

import { ModuleRole, RepositoryFileNode, RepositoryModule } from './types';

interface ModuleDefinition {
  pattern: RegExp;
  role: ModuleRole;
  description: string;
}

const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    pattern: /^(?:src\/)?app(?:\/|$)/i,
    role: 'app_router',
    description: 'Application Routing & Server Page Architecture',
  },
  {
    pattern: /^(?:src\/)?pages(?:\/|$)/i,
    role: 'pages_router',
    description: 'Pages Directory Routing & View Templates',
  },
  {
    pattern: /^(?:src\/)?components(?:\/|$)/i,
    role: 'components',
    description: 'Reusable UI Component Library & Widgets',
  },
  {
    pattern: /^(?:src\/)?lib(?:\/|$)/i,
    role: 'lib_utilities',
    description: 'Core Library Functions, Heuristics & Helpers',
  },
  {
    pattern: /^(?:src\/)?utils?(?:\/|$)/i,
    role: 'lib_utilities',
    description: 'Shared Utility Functions & Helpers',
  },
  {
    pattern: /^(?:src\/)?(?:app\/)?api(?:\/|$)/i,
    role: 'api_routes',
    description: 'REST / GraphQL API Endpoints & Route Handlers',
  },
  {
    pattern: /^(?:src\/)?routes?(?:\/|$)/i,
    role: 'api_routes',
    description: 'API & Application Routing Handlers',
  },
  {
    pattern: /^(?:src\/)?services?(?:\/|$)/i,
    role: 'services',
    description: 'Business Logic & Backend Services Layer',
  },
  {
    pattern: /^(?:src\/)?controllers?(?:\/|$)/i,
    role: 'controllers',
    description: 'Request Controllers & Request Dispatchers',
  },
  {
    pattern: /^(?:src\/)?(?:models|entities|schema|db|database)(?:\/|$)/i,
    role: 'database_models',
    description: 'Database Models, Schemas & Entity Definitions',
  },
  {
    pattern: /^(?:src\/)?(?:tests?|__tests__|specs?)(?:\/|$)/i,
    role: 'tests',
    description: 'Unit, Integration & Regression Test Suites',
  },
  {
    pattern: /^(?:docs|documentation)(?:\/|$)/i,
    role: 'documentation',
    description: 'Project Documentation & Architectural Guides',
  },
  {
    pattern: /^(?:config|configuration)(?:\/|$)/i,
    role: 'configuration',
    description: 'Application Configuration & Environment Setups',
  },
  {
    pattern: /^(?:src\/)?hooks(?:\/|$)/i,
    role: 'components',
    description: 'Stateful Custom Hooks & State Composables',
  },
];

/**
 * Detects structural architectural modules across the repository tree.
 */
export function detectModules(files: RepositoryFileNode[]): RepositoryModule[] {
  // Collect candidate directories
  const dirFilesMap = new Map<string, RepositoryFileNode[]>();

  for (const file of files) {
    if (file.status === 'skipped') continue;

    const parts = file.path.split('/');
    if (parts.length > 1) {
      // Top-level directory (e.g. "src" or "components")
      const topDir = parts[0];
      if (!dirFilesMap.has(topDir)) dirFilesMap.set(topDir, []);
      dirFilesMap.get(topDir)!.push(file);

      // Sub-level directory (e.g. "src/components" or "src/app")
      if (parts.length > 2) {
        const subDir = `${parts[0]}/${parts[1]}`;
        if (!dirFilesMap.has(subDir)) dirFilesMap.set(subDir, []);
        dirFilesMap.get(subDir)!.push(file);
      }
    }
  }

  const detectedModules: RepositoryModule[] = [];
  const processedPaths = new Set<string>();

  // Evaluate candidate directory paths against definitions
  for (const [dirPath, dirFiles] of dirFilesMap.entries()) {
    for (const def of MODULE_DEFINITIONS) {
      if (def.pattern.test(dirPath) && !processedPaths.has(dirPath)) {
        processedPaths.add(dirPath);

        const totalBytes = dirFiles.reduce((acc, f) => acc + f.sizeBytes, 0);

        // Determine primary language
        const langCounts: Record<string, number> = {};
        for (const f of dirFiles) {
          if (f.language) {
            langCounts[f.language] = (langCounts[f.language] || 0) + f.sizeBytes;
          }
        }
        const topLang = Object.entries(langCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null;

        const name = dirPath.split('/').pop() || dirPath;

        detectedModules.push({
          name,
          path: dirPath,
          fileCount: dirFiles.length,
          totalBytes,
          detectedRole: def.role,
          description: def.description,
          primaryLanguage: topLang,
        });

        break;
      }
    }
  }

  // Sort modules alphabetically by path
  return detectedModules.sort((a, b) => a.path.localeCompare(b.path));
}
