/**
 * Phase 3 — Codebase Intelligence Types
 *
 * Defines the structural code symbols, import/export graphs, module relationships,
 * and architectural models extracted deterministically from repository source code.
 */

import { RepositoryRef } from '../repository/types';

export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type_alias'
  | 'variable'
  | 'component'
  | 'enum'
  | 'endpoint'
  | 'struct'
  | 'trait';

export type FileRole =
  | 'component'
  | 'page'
  | 'layout'
  | 'api_route'
  | 'util'
  | 'model'
  | 'service'
  | 'controller'
  | 'test'
  | 'config'
  | 'hook'
  | 'type_definition'
  | 'unknown';

export type ArchitecturePattern =
  | 'Next.js App Router Monolith'
  | 'Modular Layered Architecture'
  | 'API Microservice'
  | 'Single Page Application'
  | 'Library / Utility Package'
  | 'Full-Stack Web Architecture'
  | 'CLI / Script Tool';

// ─── Code Symbols ──────────────────────────────────────────────────────────────

export interface CodeSymbol {
  name: string;
  kind: SymbolKind;
  filePath: string;
  line?: number;
  isExported: boolean;
  signature?: string;
  docComment?: string;
}

// ─── Imports & Exports ─────────────────────────────────────────────────────────

export interface CodeImport {
  sourcePath: string;
  importPath: string;
  importedSymbols: string[];
  isDefault: boolean;
  isNamespace: boolean;
  isRelative: boolean;
  resolvedFilePath?: string;
}

export interface CodeExport {
  sourcePath: string;
  name: string;
  isDefault: boolean;
  kind?: SymbolKind;
}

// ─── File Intelligence Node ───────────────────────────────────────────────────

export interface FileIntelligence {
  filePath: string;
  language: string | null;
  role: FileRole;
  loc: number;
  sizeBytes: number;
  symbols: CodeSymbol[];
  imports: CodeImport[];
  exports: CodeExport[];
  internalDependencies: string[]; // local file paths this file imports
  dependents: string[];           // local file paths that import this file
}

// ─── Module Relationships ─────────────────────────────────────────────────────

export interface ModuleRelationship {
  fromModule: string;
  toModule: string;
  importCount: number;
  sampleImports: string[];
}

// ─── Architecture Model ────────────────────────────────────────────────────────

export interface ArchitecturalLayer {
  name: string;
  path: string;
  role: string;
  fileCount: number;
  symbolCount: number;
  keySymbols: string[];
  description: string;
}

export interface DataFlowArc {
  from: string;
  to: string;
  description: string;
  flowType: 'import' | 'api_call' | 'data_transfer';
}

export interface KeyEntrypoint {
  path: string;
  type: 'web_page' | 'api_endpoint' | 'main_binary' | 'config' | 'service_root';
  description: string;
}

export interface ArchitectureModel {
  pattern: ArchitecturePattern;
  summary: string;
  layers: ArchitecturalLayer[];
  dataFlow: DataFlowArc[];
  entrypoints: KeyEntrypoint[];
  metrics: {
    totalFilesAnalyzed: number;
    totalSymbolsFound: number;
    totalImportsResolved: number;
    internalCouplingScore: number; // 0–100 score representing internal cohesion vs coupling
    modularityScore: number;       // 0–100 score representing module separation
  };
}

// ─── Root Codebase Intelligence Object ─────────────────────────────────────────

export interface CodebaseIntelligence {
  repository: RepositoryRef;
  files: FileIntelligence[];
  symbols: CodeSymbol[];
  imports: CodeImport[];
  exports: CodeExport[];
  relationships: ModuleRelationship[];
  architecture: ArchitectureModel;
  analyzedAt: string;
  status: 'complete' | 'partial' | 'failed';
  durationMs: number;
}
