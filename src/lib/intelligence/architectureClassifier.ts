/**
 * Phase 3 — Architecture Model Classifier & Synthesizer
 *
 * Deterministically constructs the architectural pattern, structural layers,
 * system entrypoints, and data flow arcs from detected modules, frameworks, and symbols.
 */

import { RepositoryFramework, RepositoryModule, RepositoryRef } from '../repository/types';
import {
  ArchitecturalLayer,
  ArchitectureModel,
  ArchitecturePattern,
  CodeSymbol,
  DataFlowArc,
  FileIntelligence,
  KeyEntrypoint,
  ModuleRelationship,
} from './types';

export function classifyArchitecture(params: {
  repository: RepositoryRef;
  frameworks: RepositoryFramework[];
  modules: RepositoryModule[];
  files: FileIntelligence[];
  symbols: CodeSymbol[];
  relationships: ModuleRelationship[];
}): ArchitectureModel {
  const { repository, frameworks, modules, files, symbols, relationships } = params;

  const frameworkNames = new Set(frameworks.map(f => f.name.toLowerCase()));
  const moduleRoles = new Set(modules.map(m => m.detectedRole));
  const filePaths = files.map(f => f.filePath);

  // ── 1. Determine Architectural Pattern ──────────────────────────────────────
  let pattern: ArchitecturePattern = 'Modular Layered Architecture';
  let summary = 'A structured multi-tiered modular architecture with separated concerns.';

  if (frameworkNames.has('next.js') && (moduleRoles.has('app_router') || filePaths.some(p => p.includes('app/page.')))) {
    pattern = 'Next.js App Router Monolith';
    summary = 'Modern full-stack Next.js App Router architecture leveraging React Server Components, server actions, and localized route handlers.';
  } else if (frameworkNames.has('fastapi') || (frameworkNames.has('express') && !frameworkNames.has('react'))) {
    pattern = 'API Microservice';
    summary = 'High-throughput backend API service focused on REST endpoints and business service dispatching.';
  } else if (frameworkNames.has('react') || frameworkNames.has('vue.js') || frameworkNames.has('svelte / sveltekit')) {
    pattern = 'Single Page Application';
    summary = 'Client-side component-driven reactive web application architecture.';
  } else if (modules.some(m => m.name === 'lib' || m.name === 'pkg') && files.length < 25) {
    pattern = 'Library / Utility Package';
    summary = 'Specialized software library exposing modular public APIs and utility heuristics.';
  } else if (moduleRoles.has('components') && moduleRoles.has('api_routes')) {
    pattern = 'Full-Stack Web Architecture';
    summary = 'Integrated full-stack system uniting frontend UI components with backend API endpoints.';
  }

  // ── 2. Synthesize Architectural Layers ──────────────────────────────────────
  const layers: ArchitecturalLayer[] = [];

  // Presentation Layer
  const presentationFiles = files.filter(f => f.role === 'component' || f.role === 'page' || f.role === 'layout');
  if (presentationFiles.length > 0) {
    const layerSymbols = presentationFiles.flatMap(f => f.symbols.map(s => s.name)).slice(0, 6);
    layers.push({
      name: 'Presentation & UI Layer',
      path: 'src/components',
      role: 'Client & Server UI Components, Dashboard Layouts, Modals',
      fileCount: presentationFiles.length,
      symbolCount: presentationFiles.reduce((acc, f) => acc + f.symbols.length, 0),
      keySymbols: layerSymbols,
      description: 'Renders reactive widgets, charts, navigation sidebars, and user interface panels.',
    });
  }

  // API & Routing Layer
  const routingFiles = files.filter(f => f.role === 'api_route' || f.role === 'controller');
  if (routingFiles.length > 0) {
    const layerSymbols = routingFiles.flatMap(f => f.symbols.map(s => s.name)).slice(0, 6);
    layers.push({
      name: 'API & Route Handler Layer',
      path: 'src/app/api',
      role: 'REST API Request Dispatchers, Route Endpoints & Handlers',
      fileCount: routingFiles.length,
      symbolCount: routingFiles.reduce((acc, f) => acc + f.symbols.length, 0),
      keySymbols: layerSymbols,
      description: 'Processes incoming HTTP requests, performs coordinate validation, and dispatches to domain services.',
    });
  }

  // Domain & Logic Layer
  const domainFiles = files.filter(f => f.role === 'service' || f.role === 'util' || f.role === 'type_definition');
  if (domainFiles.length > 0) {
    const layerSymbols = domainFiles.flatMap(f => f.symbols.map(s => s.name)).slice(0, 6);
    layers.push({
      name: 'Domain Logic & Heuristics Layer',
      path: 'src/lib',
      role: 'Core Algorithms, Heuristics, Parsers & Analyzers',
      fileCount: domainFiles.length,
      symbolCount: domainFiles.reduce((acc, f) => acc + f.symbols.length, 0),
      keySymbols: layerSymbols,
      description: 'Encapsulates pure deterministic business logic, telemetry analyzers, and score aggregators.',
    });
  }

  // Data / Schema Layer
  const modelFiles = files.filter(f => f.role === 'model');
  if (modelFiles.length > 0) {
    const layerSymbols = modelFiles.flatMap(f => f.symbols.map(s => s.name)).slice(0, 6);
    layers.push({
      name: 'Data & Schema Layer',
      path: 'src/models',
      role: 'Database Models, Entity Definitions & Storage Schemas',
      fileCount: modelFiles.length,
      symbolCount: modelFiles.reduce((acc, f) => acc + f.symbols.length, 0),
      keySymbols: layerSymbols,
      description: 'Defines schema definitions, entity structures, and data access contracts.',
    });
  }

  // Fallback default layer if files were not individually categorized
  if (layers.length === 0) {
    layers.push({
      name: 'Core Application Structure',
      path: 'src',
      role: 'Application Source Roots',
      fileCount: files.length,
      symbolCount: symbols.length,
      keySymbols: symbols.slice(0, 5).map(s => s.name),
      description: 'Primary source tree containing application modules and logic.',
    });
  }

  // ── 3. Map Key Entrypoints ──────────────────────────────────────────────────
  const entrypoints: KeyEntrypoint[] = [];

  for (const file of files) {
    const path = file.filePath;
    if (/page\.[jt]sx?$/i.test(path)) {
      entrypoints.push({
        path,
        type: 'web_page',
        description: `Main user interface view (${path.replace(/^src\//, '')})`,
      });
    } else if (/(?:api|routes?)\/.*route\.[jt]s$/i.test(path)) {
      entrypoints.push({
        path,
        type: 'api_endpoint',
        description: `REST API Endpoint (${path.replace(/^src\//, '')})`,
      });
    } else if (/(?:main|server|index)\.[jt]s$/i.test(path)) {
      entrypoints.push({
        path,
        type: 'service_root',
        description: 'Primary runtime server initialization entrypoint',
      });
    }
  }

  // ── 4. Generate Data Flow Arcs ──────────────────────────────────────────────
  const dataFlow: DataFlowArc[] = [
    {
      from: 'Client UI Components',
      to: 'API Route Handlers',
      description: 'User actions trigger asynchronous JSON requests to server route handlers',
      flowType: 'api_call',
    },
    {
      from: 'API Route Handlers',
      to: 'Domain Logic & Heuristic Analyzers',
      description: 'Validated inputs are forwarded to deterministic analysis engines',
      flowType: 'import',
    },
    {
      from: 'Telemetry & Ingestor Engines',
      to: 'External GitHub REST API',
      description: 'Server queries GitHub API for repository trees, manifests, and commit telemetry',
      flowType: 'data_transfer',
    },
    {
      from: 'Domain Analyzers',
      to: 'Structured Intelligence Response',
      description: 'Aggregated metrics and indexes are returned to the client dashboard',
      flowType: 'data_transfer',
    },
  ];

  // ── 5. Calculate Metrics ────────────────────────────────────────────────────
  const totalFilesAnalyzed = files.length;
  const totalSymbolsFound = symbols.length;
  const totalImportsResolved = files.reduce((acc, f) => acc + f.internalDependencies.length, 0);

  // Coupling & Modularity heuristics (0–100)
  const internalCouplingScore = totalFilesAnalyzed > 0
    ? Math.min(100, Math.round((totalImportsResolved / (totalFilesAnalyzed * 1.5)) * 100))
    : 0;

  const modularityScore = layers.length >= 3 ? 92 : layers.length === 2 ? 78 : 60;

  return {
    pattern,
    summary,
    layers,
    dataFlow,
    entrypoints: entrypoints.slice(0, 10),
    metrics: {
      totalFilesAnalyzed,
      totalSymbolsFound,
      totalImportsResolved,
      internalCouplingScore,
      modularityScore,
    },
  };
}
