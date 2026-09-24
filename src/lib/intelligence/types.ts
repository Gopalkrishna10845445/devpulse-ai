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
  type: 'web_page' | 'api_endpoint' | 'main_binary' | 'config' | 'service_root' | 'cli';
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

// ─── Technology Stack Intelligence ─────────────────────────────────────────────

import {
  RepositoryDependency,
  RepositoryFramework,
  RepositoryLanguageSummary,
  RepositoryManifest,
} from '../repository/types';

export interface DatabaseUsageIntelligence {
  detected: boolean;
  type: string;
  ormOrDriver?: string;
  evidence: string[];
}

export interface AuthPatternIntelligence {
  detected: boolean;
  mechanism: string;
  evidence: string[];
}

export interface TestingIntelligence {
  detected: boolean;
  frameworks: string[];
  testFileCount: number;
  evidence: string[];
}

export interface BuildAndDeploymentIntelligence {
  detected: boolean;
  tools: string[];
  configFiles: string[];
  evidence: string[];
}

export interface TechnologyStackIntelligence {
  languages: RepositoryLanguageSummary[];
  frameworks: RepositoryFramework[];
  dependencies: RepositoryDependency[];
  manifests: RepositoryManifest[];
  database: DatabaseUsageIntelligence;
  authentication: AuthPatternIntelligence;
  testing: TestingIntelligence;
  buildAndDeployment: BuildAndDeploymentIntelligence;
}

// ─── Architecture Patterns Summary ─────────────────────────────────────────────

export interface ArchitecturePatternsSummary {
  frontend: string;
  backend: string;
  api: string;
  database: string;
  authentication: string;
  services: string;
  utilities: string;
  components: string;
  hooks: string;
  tests: string;
  configuration: string;
  infrastructure: string;
  deployment: string;
}

// ─── Engineering Metrics ───────────────────────────────────────────────────────

export interface LanguageDistributionItem {
  language: string;
  percentage: number;
  filesCount: number;
  bytes: number;
}

export interface EngineeringMetrics {
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  totalLinesOfCode: number;
  totalBytes: number;
  languagesCount: number;
  modulesCount: number;
  dependenciesCount: number;
  devDependenciesCount: number;
  testFilesCount: number;
  configFilesCount: number;
  apiRoutesCount: number;
  componentsCount: number;
  servicesCount: number;
  modelsCount: number;
  symbolsCount: number;
  internalCouplingScore: number;
  modularityScore: number;
  languageDistribution: LanguageDistributionItem[];
}

// ─── Codebase Summary ──────────────────────────────────────────────────────────

export interface CodebaseSummary {
  overview: string;
  technologies: string;
  structure: string;
  majorModules: string;
  executionModel: string;
  entrypoints: string;
  engineeringObservations: string[];
}

// ─── Repository Structure ──────────────────────────────────────────────────────

export interface MajorDirectoryEntry {
  path: string;
  name: string;
  purpose: string;
  fileCount: number;
  bytes: number;
}

export interface ImportantFileEntry {
  path: string;
  role: string;
  description: string;
  loc?: number;
  sizeBytes?: number;
}

export interface ApiEndpointEntry {
  path: string;
  method?: string;
  description: string;
  symbols: string[];
}

export interface FrontendComponentEntry {
  name: string;
  filePath: string;
  isExported: boolean;
  line?: number;
}

export interface ServiceEntry {
  name: string;
  filePath: string;
  keyFunctions: string[];
}

export interface RepositoryStructure {
  majorDirectories: MajorDirectoryEntry[];
  importantFiles: ImportantFileEntry[];
  entrypoints: KeyEntrypoint[];
  apiEndpoints: ApiEndpointEntry[];
  frontendComponents: FrontendComponentEntry[];
  services: ServiceEntry[];
  models: { name: string; filePath: string }[];
  configFiles: string[];
  testFiles: string[];
}

// ─── Root Codebase Intelligence Object ─────────────────────────────────────────

export interface CodebaseIntelligence {
  repository: RepositoryRef;
  projectType?: string;
  summary?: CodebaseSummary;
  metrics?: EngineeringMetrics;
  technologyStack?: TechnologyStackIntelligence;
  patterns?: ArchitecturePatternsSummary;
  structure?: RepositoryStructure;
  architecture: ArchitectureModel;
  files: FileIntelligence[];
  symbols: CodeSymbol[];
  imports: CodeImport[];
  exports: CodeExport[];
  relationships: ModuleRelationship[];
  analyzedAt: string;
  status: 'complete' | 'partial' | 'failed';
  durationMs: number;
}

export interface CompleteCodebaseIntelligence extends CodebaseIntelligence {
  projectType: string;
  summary: CodebaseSummary;
  metrics: EngineeringMetrics;
  technologyStack: TechnologyStackIntelligence;
  patterns: ArchitecturePatternsSummary;
  structure: RepositoryStructure;
}



