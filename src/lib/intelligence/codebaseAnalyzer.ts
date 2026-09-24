/**
 * Phase 3 — Codebase Intelligence Analyzer & Orchestrator
 *
 * Consumes the Phase 2 Repository Index, fetches source contents for primary files,
 * extracts language-aware symbols, resolves import dependency graphs, computes
 * module coupling relationships, synthesizes architectural patterns, and calculates
 * comprehensive deterministic engineering metrics and observations.
 *
 * Single-flight deduplication & 5-minute memory caching prevents repeated redundant analysis.
 * Automatically persists to PostgreSQL when configured.
 */

import { RepositoryFileNode, RepositoryIndex, RepositoryRef } from '../repository/types';
import { parseSymbols } from './symbolParser';
import {
  buildModuleRelationships,
  parseExports,
  parseImports,
  resolveImportPath,
} from './importResolver';
import { classifyArchitecture } from './architectureClassifier';
import {
  ApiEndpointEntry,
  ArchitecturePatternsSummary,
  CodeExport,
  CodeImport,
  CodeSymbol,
  CodebaseIntelligence,
  CompleteCodebaseIntelligence,
  CodebaseSummary,
  EngineeringMetrics,
  FileIntelligence,
  FileRole,
  FrontendComponentEntry,
  ImportantFileEntry,
  MajorDirectoryEntry,
  RepositoryStructure,
  ServiceEntry,
  TechnologyStackIntelligence,
} from './types';

const API_BASE = 'https://api.github.com';
const MAX_SOURCE_FETCH_LIMIT = 40;
const CODEBASE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

// ─── Single-Flight Coalescing & Memory Cache ───────────────────────────────────

const inFlightCodebaseAnalysis = new Map<string, Promise<CompleteCodebaseIntelligence>>();
const codebaseCache = new Map<string, { intelligence: CompleteCodebaseIntelligence; timestamp: number }>();

export function clearCodebaseAnalysisCache(): void {
  codebaseCache.clear();
  inFlightCodebaseAnalysis.clear();
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'DevPilot-Codebase-Intelligence/3.0',
    Accept: 'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

// ─── Fetch Source Content from GitHub ─────────────────────────────────────────

async function fetchSourceContent(
  owner: string,
  repo: string,
  filePath: string,
  ref: string,
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const url = `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(ref)}`;
    const res = await fetch(url, { headers });

    if (res.status === 200) {
      const data = (await res.json()) as any;
      if (data.content && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Determine File Role ──────────────────────────────────────────────────────

export function determineFileRole(filePath: string): FileRole {
  const lower = filePath.toLowerCase();
  const name = lower.split('/').pop() || '';

  if (/page\.[jt]sx?$/.test(name)) return 'page';
  if (/layout\.[jt]sx?$/.test(name)) return 'layout';
  if (/route\.[jt]s$/.test(name) || lower.includes('/api/')) return 'api_route';
  if (lower.includes('/components/') || /\.(?:tsx|jsx)$/.test(name)) return 'component';
  if (lower.includes('/models/') || lower.includes('/entities/') || lower.includes('/schema/')) return 'model';
  if (lower.includes('/services/')) return 'service';
  if (lower.includes('/controllers/')) return 'controller';
  if (lower.includes('/lib/') || lower.includes('/utils/') || lower.includes('/helpers/')) return 'util';
  if (lower.includes('/hooks/')) return 'hook';
  if (name.includes('types') || name.endsWith('.d.ts')) return 'type_definition';
  if (name.includes('.test.') || name.includes('.spec.') || lower.includes('__tests__') || lower.includes('/tests/')) return 'test';
  if (name.includes('.config.') || name === 'package.json' || name === 'tsconfig.json' || name === 'dockerfile') return 'config';

  return 'unknown';
}

// ─── Main Analyze Codebase Function (With Single-Flight & TTL Cache) ───────────

export async function analyzeCodebase(params: {
  index: RepositoryIndex;
  providedContents?: Map<string, string>;
} | RepositoryIndex): Promise<CompleteCodebaseIntelligence> {
  const index: RepositoryIndex = (params as any)?.index || (params as any);
  const providedContents = (params as any)?.providedContents;
  const cacheKey = index?.repository?.fullName
    ? `${index.repository.fullName.toLowerCase()}@${index.repository.defaultBranch || 'main'}`
    : 'unknown@main';

  // If contents are provided in-memory (e.g. tests or local fixtures), bypass cache
  if (!providedContents && cacheKey !== 'unknown@main') {
    const cached = codebaseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CODEBASE_CACHE_TTL_MS) {
      return cached.intelligence;
    }

    const inFlight = inFlightCodebaseAnalysis.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const executionPromise = (async () => {
    try {
      const intelligence = await doAnalyzeCodebase({ index, providedContents });
      if (!providedContents) {
        codebaseCache.set(cacheKey, { intelligence, timestamp: Date.now() });

        // Asynchronously persist to PostgreSQL if available
        try {
          const { ReportDatabaseRepository } = await import('../db/repositories');
          await ReportDatabaseRepository.saveCodebaseIntelligence(
            index.repository.fullName,
            index.repository.defaultBranch || 'main',
            intelligence
          );
        } catch {
          // Non-fatal if DB not configured
        }
      }
      return intelligence;
    } finally {
      if (!providedContents) {
        inFlightCodebaseAnalysis.delete(cacheKey);
      }
    }
  })();

  if (!providedContents) {
    inFlightCodebaseAnalysis.set(cacheKey, executionPromise);
  }

  return executionPromise;
}

// ─── Helper: Detect Technology Stack Intelligence ──────────────────────────────


function detectTechnologyStack(index: RepositoryIndex, allFiles: RepositoryFileNode[]): TechnologyStackIntelligence {
  const depNames = new Set(index.dependencies.map(d => d.name.toLowerCase()));
  const filePaths = allFiles.map(f => f.path.toLowerCase());

  // Database detection
  const dbEvidence: string[] = [];
  let dbType = 'Not detected';
  let ormOrDriver: string | undefined = undefined;

  if (depNames.has('pg') || depNames.has('@neondatabase/serverless') || depNames.has('postgres')) {
    dbType = 'PostgreSQL';
    dbEvidence.push('PostgreSQL driver package (pg/postgres)');
  } else if (depNames.has('mysql') || depNames.has('mysql2')) {
    dbType = 'MySQL';
    dbEvidence.push('MySQL driver package (mysql2)');
  } else if (depNames.has('sqlite3') || depNames.has('better-sqlite3')) {
    dbType = 'SQLite';
    dbEvidence.push('SQLite driver package');
  } else if (depNames.has('mongodb') || depNames.has('mongoose')) {
    dbType = 'MongoDB';
    dbEvidence.push('MongoDB driver / Mongoose ODM');
  } else if (depNames.has('redis') || depNames.has('ioredis')) {
    dbType = 'Redis';
    dbEvidence.push('Redis client package (ioredis/redis)');
  }

  if (depNames.has('prisma') || depNames.has('@prisma/client')) {
    ormOrDriver = 'Prisma ORM';
    dbEvidence.push('Prisma ORM (@prisma/client)');
  } else if (depNames.has('drizzle-orm')) {
    ormOrDriver = 'Drizzle ORM';
    dbEvidence.push('Drizzle ORM');
  } else if (depNames.has('typeorm')) {
    ormOrDriver = 'TypeORM';
    dbEvidence.push('TypeORM');
  } else if (depNames.has('pgvector') || filePaths.some(p => p.includes('schema.sql') || p.includes('vector'))) {
    if (dbType === 'PostgreSQL') {
      dbEvidence.push('PostgreSQL pgvector extension / schema');
    }
  }

  if (filePaths.some(p => p.endsWith('schema.sql'))) {
    if (dbType === 'Not detected') dbType = 'SQL Relational Database';
    dbEvidence.push('SQL schema definition (schema.sql)');
  }

  const database = {
    detected: dbType !== 'Not detected',
    type: dbType,
    ormOrDriver,
    evidence: dbEvidence,
  };

  // Authentication detection
  const authEvidence: string[] = [];
  let authMechanism = 'Not detected';

  if (depNames.has('next-auth') || depNames.has('@auth/core')) {
    authMechanism = 'NextAuth.js (Session & OAuth)';
    authEvidence.push('NextAuth.js authentication framework');
  } else if (depNames.has('jsonwebtoken') || depNames.has('jose')) {
    authMechanism = 'JWT (JSON Web Tokens)';
    authEvidence.push('JWT package (jsonwebtoken/jose)');
  } else if (depNames.has('passport')) {
    authMechanism = 'Passport.js';
    authEvidence.push('Passport middleware');
  } else if (depNames.has('lucia')) {
    authMechanism = 'Lucia Auth';
    authEvidence.push('Lucia Auth library');
  } else if (depNames.has('bcrypt') || depNames.has('bcryptjs') || depNames.has('argon2')) {
    authMechanism = 'Password Hashing & Session Verification';
    authEvidence.push('Password hashing package (bcrypt/argon2)');
  }

  if (filePaths.some(p => p.includes('/auth/') || p.includes('/session/'))) {
    if (authMechanism === 'Not detected') authMechanism = 'Internal Session / RBAC Management';
    authEvidence.push('Dedicated auth module in source tree');
  }

  const authentication = {
    detected: authMechanism !== 'Not detected',
    mechanism: authMechanism,
    evidence: authEvidence,
  };

  // Testing detection
  const testFrameworks: string[] = [];
  const testEvidence: string[] = [];
  const testFileCount = allFiles.filter(f =>
    f.path.includes('.test.') ||
    f.path.includes('.spec.') ||
    f.path.includes('__tests__') ||
    f.path.startsWith('tests/') ||
    f.path.startsWith('test/')
  ).length;

  if (depNames.has('vitest')) {
    testFrameworks.push('Vitest');
    testEvidence.push('Vitest test runner');
  }
  if (depNames.has('jest') || depNames.has('@types/jest')) {
    testFrameworks.push('Jest');
    testEvidence.push('Jest testing framework');
  }
  if (depNames.has('pytest')) {
    testFrameworks.push('Pytest');
    testEvidence.push('Pytest framework');
  }
  if (depNames.has('cypress')) {
    testFrameworks.push('Cypress');
    testEvidence.push('Cypress E2E');
  }
  if (depNames.has('playwright') || depNames.has('@playwright/test')) {
    testFrameworks.push('Playwright');
    testEvidence.push('Playwright E2E');
  }

  if (testFileCount > 0 && testFrameworks.length === 0) {
    testFrameworks.push('Automated Tests');
    testEvidence.push(`${testFileCount} test files detected in repository`);
  }

  const testing = {
    detected: testFrameworks.length > 0 || testFileCount > 0,
    frameworks: testFrameworks,
    testFileCount,
    evidence: testEvidence,
  };

  // Build and deployment detection
  const buildTools: string[] = [];
  const buildConfigs: string[] = [];
  const buildEvidence: string[] = [];

  for (const f of allFiles) {
    const p = f.path.toLowerCase();
    if (p === 'dockerfile' || p.endsWith('/dockerfile')) {
      buildTools.push('Docker');
      buildConfigs.push(f.path);
      buildEvidence.push('Docker container definition');
    } else if (p.includes('.github/workflows/')) {
      buildTools.push('GitHub Actions');
      buildConfigs.push(f.path);
      buildEvidence.push('GitHub Actions CI/CD workflow');
    } else if (p.includes('next.config.')) {
      buildTools.push('Next.js Build System');
      buildConfigs.push(f.path);
      buildEvidence.push('Next.js configuration');
    } else if (p.includes('vite.config.')) {
      buildTools.push('Vite');
      buildConfigs.push(f.path);
      buildEvidence.push('Vite build tool');
    } else if (p.includes('tailwind.config.')) {
      buildTools.push('Tailwind CSS Compiler');
      buildConfigs.push(f.path);
      buildEvidence.push('Tailwind CSS styling pipeline');
    } else if (p.includes('tsconfig.json')) {
      buildTools.push('TypeScript Compiler');
      buildConfigs.push(f.path);
      buildEvidence.push('TypeScript compiler options');
    }
  }

  const buildAndDeployment = {
    detected: buildTools.length > 0,
    tools: Array.from(new Set(buildTools)),
    configFiles: buildConfigs,
    evidence: buildEvidence,
  };

  return {
    languages: index.languages,
    frameworks: index.frameworks,
    dependencies: index.dependencies,
    manifests: index.manifests,
    database,
    authentication,
    testing,
    buildAndDeployment,
  };
}

// ─── Helper: Detect Architectural Patterns ─────────────────────────────────────

function detectArchitecturePatterns(
  index: RepositoryIndex,
  techStack: TechnologyStackIntelligence,
  allFiles: RepositoryFileNode[]
): ArchitecturePatternsSummary {
  const frameworkNames = new Set(index.frameworks.map(f => f.name.toLowerCase()));
  const moduleRoles = new Set(index.modules.map(m => m.detectedRole));
  const filePaths = allFiles.map(f => f.path.toLowerCase());

  const hasNext = frameworkNames.has('next.js');
  const hasReact = frameworkNames.has('react') || hasNext;
  const hasVue = frameworkNames.has('vue.js');
  const hasFastAPI = frameworkNames.has('fastapi');
  const hasExpress = frameworkNames.has('express');

  // Frontend
  let frontend = 'Not detected';
  if (hasNext) frontend = 'Next.js App Router (React Server & Client Components)';
  else if (hasReact) frontend = 'React Component Hierarchy';
  else if (hasVue) frontend = 'Vue.js Single File Components';
  else if (moduleRoles.has('components') || filePaths.some(p => p.includes('/components/'))) frontend = 'Modular UI Components';

  // Backend
  let backend = 'Not detected';
  if (hasNext) backend = 'Next.js Node.js Server Runtime & Server Route Handlers';
  else if (hasFastAPI) backend = 'Python FastAPI Asynchronous REST Application';
  else if (hasExpress) backend = 'Express.js HTTP Server';
  else if (moduleRoles.has('services') || filePaths.some(p => p.includes('/services/'))) backend = 'Modular Backend Services Layer';

  // API
  let api = 'Not detected';
  if (hasNext && filePaths.some(p => p.includes('/api/'))) api = 'Next.js Edge/Node Route Handlers (/api/*)';
  else if (filePaths.some(p => p.includes('/api/') || p.includes('/routes/'))) api = 'REST API Route Endpoints';

  // Database
  const database = techStack.database.detected
    ? `${techStack.database.type}${techStack.database.ormOrDriver ? ` with ${techStack.database.ormOrDriver}` : ''}`
    : 'Not detected';

  // Authentication
  const authentication = techStack.authentication.detected
    ? techStack.authentication.mechanism
    : 'Not detected';

  // Services
  let services = 'Not detected';
  if (filePaths.some(p => p.includes('/services/') || p.includes('/lib/'))) {
    services = 'Encapsulated Domain Services & Analytical Engines';
  }

  // Utilities
  let utilities = 'Not detected';
  if (filePaths.some(p => p.includes('/utils/') || p.includes('/lib/'))) {
    utilities = 'Deterministic Helper Heuristics & Utility Modules';
  }

  // Components
  let components = 'Not detected';
  if (filePaths.some(p => p.includes('/components/'))) {
    components = 'Reusable Presentational & Container Widgets';
  }

  // Hooks
  let hooks = 'Not detected';
  if (filePaths.some(p => p.includes('/hooks/') || p.includes('use'))) {
    hooks = 'Custom State & Lifecycle React Hooks';
  }

  // Tests
  let tests = 'Not detected';
  if (techStack.testing.detected) {
    tests = `${techStack.testing.frameworks.join(', ')} (${techStack.testing.testFileCount} test files)`;
  }

  // Configuration
  let configuration = 'Not detected';
  if (techStack.buildAndDeployment.configFiles.length > 0) {
    configuration = techStack.buildAndDeployment.tools.join(', ');
  }

  // Infrastructure & Deployment
  let infrastructure = 'Not detected';
  if (techStack.database.detected || techStack.buildAndDeployment.tools.includes('Docker')) {
    infrastructure = [
      techStack.database.detected ? techStack.database.type : null,
      techStack.buildAndDeployment.tools.includes('Docker') ? 'Docker Containerization' : null,
    ].filter(Boolean).join(' + ') || 'Not detected';
  }

  let deployment = 'Not detected';
  if (hasNext) deployment = 'Vercel / Node.js Production Server';
  else if (techStack.buildAndDeployment.tools.includes('Docker')) deployment = 'Docker Container Deployment';
  else if (techStack.buildAndDeployment.tools.includes('GitHub Actions')) deployment = 'GitHub Actions CI/CD Pipeline';

  return {
    frontend,
    backend,
    api,
    database,
    authentication,
    services,
    utilities,
    components,
    hooks,
    tests,
    configuration,
    infrastructure,
    deployment,
  };
}

// ─── Helper: Detect Project Type ───────────────────────────────────────────────

function detectProjectType(
  index: RepositoryIndex,
  patterns: ArchitecturePatternsSummary
): string {
  const frameworks = index.frameworks.map(f => f.name.toLowerCase());
  const files = index.files;

  if (files.length <= 3 && !frameworks.includes('next.js') && !frameworks.includes('react')) {
    return 'Minimal Repository';
  }
  if (frameworks.includes('next.js')) {
    return 'Full-Stack Web Application (Next.js)';
  }
  if (frameworks.includes('fastapi') || frameworks.includes('express')) {
    return 'REST API Microservice';
  }
  if (frameworks.includes('react') || frameworks.includes('vue.js') || frameworks.includes('svelte / sveltekit')) {
    return 'Frontend Single-Page Application';
  }
  if (index.modules.some(m => m.name === 'lib' || m.name === 'pkg') && files.length < 30) {
    return 'Library / Utility Package';
  }
  if (patterns.frontend !== 'Not detected' && patterns.backend !== 'Not detected') {
    return 'Full-Stack Web Application';
  }
  if (patterns.api !== 'Not detected') {
    return 'Backend Service / API';
  }
  return 'Modular Software Codebase';
}

// ─── Helper: Detect Repository Structure ───────────────────────────────────────

function detectRepositoryStructure(
  index: RepositoryIndex,
  files: FileIntelligence[],
  allSymbols: CodeSymbol[]
): RepositoryStructure {
  const allFiles = index.files;

  // Major directories
  const dirMap = new Map<string, { fileCount: number; bytes: number }>();
  for (const f of allFiles) {
    const parts = f.path.split('/');
    if (parts.length > 1) {
      const topDir = parts[0] === 'src' && parts.length > 2 ? `src/${parts[1]}` : parts[0];
      const existing = dirMap.get(topDir) || { fileCount: 0, bytes: 0 };
      existing.fileCount++;
      existing.bytes += f.sizeBytes;
      dirMap.set(topDir, existing);
    }
  }

  const majorDirectories: MajorDirectoryEntry[] = [];
  for (const [path, data] of dirMap.entries()) {
    let purpose = 'Application Module';
    const lower = path.toLowerCase();
    if (lower.includes('app/api') || lower === 'api') purpose = 'REST API Routes & Endpoints';
    else if (lower.includes('app')) purpose = 'Application Routes & Pages (Next.js App Router)';
    else if (lower.includes('components')) purpose = 'Reusable UI Components & Widgets';
    else if (lower.includes('lib') || lower.includes('utils')) purpose = 'Domain Logic, Analyzers, & Heuristics';
    else if (lower.includes('models') || lower.includes('entities')) purpose = 'Data Schema & Entity Models';
    else if (lower.includes('services')) purpose = 'Business Service Handlers';
    else if (lower.includes('__tests__') || lower.includes('tests')) purpose = 'Automated Test Suites';
    else if (lower.includes('db')) purpose = 'Database Client & Migrations';
    else if (lower.includes('auth')) purpose = 'Authentication & Access Control';
    else if (lower.includes('security')) purpose = 'Security Rules & Vulnerability Scanners';

    majorDirectories.push({
      path,
      name: path.split('/').pop() || path,
      purpose,
      fileCount: data.fileCount,
      bytes: data.bytes,
    });
  }

  // Important files
  const importantFiles: ImportantFileEntry[] = [];
  const fileIntelMap = new Map(files.map(f => [f.filePath, f]));

  for (const f of allFiles) {
    const p = f.path;
    const lower = p.toLowerCase();
    const intel = fileIntelMap.get(p);
    const loc = intel?.loc;

    if (/page\.[jt]sx?$/i.test(p)) {
      importantFiles.push({ path: p, role: 'Main Page', description: 'User interface root route', loc, sizeBytes: f.sizeBytes });
    } else if (/(?:api|routes?)\/.*route\.[jt]s$/i.test(p)) {
      importantFiles.push({ path: p, role: 'API Route', description: 'REST API endpoint handler', loc, sizeBytes: f.sizeBytes });
    } else if (lower.includes('schema.sql') || lower.includes('schema.prisma')) {
      importantFiles.push({ path: p, role: 'Database Schema', description: 'Database table and model definitions', loc, sizeBytes: f.sizeBytes });
    } else if (lower.includes('codebaseanalyzer.ts') || lower.includes('engine.ts') || lower.includes('server.ts') || lower.includes('main.ts')) {
      importantFiles.push({ path: p, role: 'Core Engine', description: 'Core domain analysis / server orchestrator', loc, sizeBytes: f.sizeBytes });
    } else if (p === 'package.json' || p === 'requirements.txt' || p === 'Cargo.toml') {
      importantFiles.push({ path: p, role: 'Manifest', description: 'Package dependencies and project configuration', loc, sizeBytes: f.sizeBytes });
    }
  }

  // API endpoints
  const apiEndpoints: ApiEndpointEntry[] = [];
  for (const f of files) {
    if (f.role === 'api_route') {
      const endpointSymbols = f.symbols.filter(s => s.kind === 'endpoint').map(s => s.name);
      apiEndpoints.push({
        path: f.filePath,
        method: endpointSymbols.join(', ') || 'GET / POST',
        description: `Route handler in ${f.filePath}`,
        symbols: f.symbols.map(s => s.name),
      });
    }
  }

  // Frontend components
  const frontendComponents: FrontendComponentEntry[] = [];
  for (const s of allSymbols) {
    if (s.kind === 'component') {
      frontendComponents.push({
        name: s.name,
        filePath: s.filePath,
        isExported: s.isExported,
        line: s.line,
      });
    }
  }

  // Services
  const services: ServiceEntry[] = [];
  for (const f of files) {
    if (f.role === 'service' || (f.role === 'util' && f.symbols.some(s => s.kind === 'function'))) {
      services.push({
        name: f.filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || f.filePath,
        filePath: f.filePath,
        keyFunctions: f.symbols.filter(s => s.kind === 'function').map(s => s.name).slice(0, 5),
      });
    }
  }

  // Models
  const models = files
    .filter(f => f.role === 'model')
    .map(f => ({ name: f.filePath.split('/').pop() || f.filePath, filePath: f.filePath }));

  // Config files
  const configFiles = allFiles
    .filter(f => f.path.includes('.config.') || f.path === 'package.json' || f.path === 'tsconfig.json' || f.path.toLowerCase() === 'dockerfile')
    .map(f => f.path);

  // Test files
  const testFiles = allFiles
    .filter(f => f.path.includes('.test.') || f.path.includes('.spec.') || f.path.includes('__tests__'))
    .map(f => f.path);

  return {
    majorDirectories: majorDirectories.sort((a, b) => b.fileCount - a.fileCount),
    importantFiles: importantFiles.slice(0, 15),
    entrypoints: [], // populated with architecture entrypoints
    apiEndpoints,
    frontendComponents: frontendComponents.slice(0, 30),
    services: services.slice(0, 15),
    models,
    configFiles,
    testFiles,
  };
}

// ─── Helper: Calculate Engineering Metrics ─────────────────────────────────────

function calculateEngineeringMetrics(
  index: RepositoryIndex,
  files: FileIntelligence[],
  allSymbols: CodeSymbol[],
  structure: RepositoryStructure
): EngineeringMetrics {
  const totalFiles = index.files.length;
  const analyzedFiles = files.length;
  const skippedFiles = index.skippedFiles.length;

  const totalLinesOfCode = files.reduce((acc, f) => acc + f.loc, 0) +
    Math.round((totalFiles - analyzedFiles) * 60);

  const totalBytes = index.ingestion.totalBytes;
  const languagesCount = index.languages.length;
  const modulesCount = index.modules.length;
  const dependenciesCount = index.dependencies.filter(d => !d.isDev).length;
  const devDependenciesCount = index.dependencies.filter(d => d.isDev).length;
  const testFilesCount = structure.testFiles.length;
  const configFilesCount = structure.configFiles.length;
  const apiRoutesCount = structure.apiEndpoints.length;
  const componentsCount = structure.frontendComponents.length;
  const servicesCount = structure.services.length;
  const modelsCount = structure.models.length;
  const symbolsCount = allSymbols.length;

  const totalImports = files.reduce((acc, f) => acc + f.internalDependencies.length, 0);
  const internalCouplingScore = analyzedFiles > 0
    ? Math.min(100, Math.round((totalImports / (analyzedFiles * 1.5)) * 100))
    : 0;

  const modularityScore = structure.majorDirectories.length >= 4 ? 92 : structure.majorDirectories.length >= 2 ? 80 : 65;

  const languageDistribution = index.languages.map(l => ({
    language: l.name,
    percentage: l.percentage,
    filesCount: l.fileCount,
    bytes: l.bytes,
  }));

  return {
    totalFiles,
    analyzedFiles,
    skippedFiles,
    totalLinesOfCode,
    totalBytes,
    languagesCount,
    modulesCount,
    dependenciesCount,
    devDependenciesCount,
    testFilesCount,
    configFilesCount,
    apiRoutesCount,
    componentsCount,
    servicesCount,
    modelsCount,
    symbolsCount,
    internalCouplingScore,
    modularityScore,
    languageDistribution,
  };
}

// ─── Helper: Generate Deterministic Codebase Summary ───────────────────────────

function generateCodebaseSummary(
  repo: RepositoryRef,
  projectType: string,
  techStack: TechnologyStackIntelligence,
  patterns: ArchitecturePatternsSummary,
  structure: RepositoryStructure,
  metrics: EngineeringMetrics
): CodebaseSummary {
  const topLangs = techStack.languages.slice(0, 3).map(l => `${l.name} (${l.percentage}%)`).join(', ') || 'No languages detected';
  const topFrameworks = techStack.frameworks.map(f => f.name).join(', ') || 'None';

  // 1. Overview
  const overview = `${repo.fullName} is a ${projectType.toLowerCase()}${
    repo.description ? ` designed for ${repo.description.toLowerCase().replace(/\.$/, '')}` : ''
  }. The repository consists of ${metrics.totalFiles} files across ${metrics.languagesCount} programming languages, structured with ${structure.majorDirectories.length} primary architectural directories.`;

  // 2. Technologies
  const technologies = `Primary languages: ${topLangs}. Frameworks and libraries: ${topFrameworks}. Database: ${
    techStack.database.detected ? `${techStack.database.type}${techStack.database.ormOrDriver ? ` (${techStack.database.ormOrDriver})` : ''}` : 'Not detected'
  }. Authentication: ${techStack.authentication.detected ? techStack.authentication.mechanism : 'Not detected'}. Testing: ${
    techStack.testing.detected ? techStack.testing.frameworks.join(', ') : 'Not detected'
  }.`;

  // 3. Structure
  const topDirs = structure.majorDirectories.slice(0, 4).map(d => `${d.path} (${d.purpose})`).join(', ');
  const structureSummary = `Organized into modular directories: ${topDirs || 'root directory'}. Key configuration files: ${structure.configFiles.slice(0, 3).join(', ') || 'standard defaults'}.`;

  // 4. Major Modules
  const majorModules = structure.majorDirectories.slice(0, 5).map(d => `${d.name} (${d.fileCount} files)`).join('; ') || 'Single-tier source tree';

  // 5. Execution Model
  let executionModel = 'Direct script execution';
  if (patterns.frontend.includes('Next.js') && patterns.api !== 'Not detected') {
    executionModel = 'Client UI components issue asynchronous requests to Next.js route handlers, which invoke domain analyzers and database persistence layers before returning structured telemetry to the user interface.';
  } else if (patterns.api !== 'Not detected') {
    executionModel = 'Incoming HTTP requests are dispatched to API route controllers, processed by domain services, and serialized back to the client.';
  } else if (patterns.frontend !== 'Not detected') {
    executionModel = 'Client-side reactive components manage user state and trigger interactive interface updates.';
  }

  // 6. Entrypoints
  const entrypoints = structure.importantFiles
    .filter(f => f.role.includes('Page') || f.role.includes('API') || f.role.includes('Engine'))
    .map(f => f.path)
    .slice(0, 4)
    .join(', ') || 'Root repository entrypoint';

  // 7. Key Engineering Observations (deterministic facts only)
  const engineeringObservations: string[] = [];

  if (techStack.languages.some(l => l.name.toLowerCase() === 'typescript')) {
    engineeringObservations.push('TypeScript-first architecture with strict typing definitions and compile-time guarantees.');
  }
  if (techStack.database.detected) {
    engineeringObservations.push(`Persists relational domain state using ${techStack.database.type}${techStack.database.ormOrDriver ? ` with ${techStack.database.ormOrDriver}` : ''}.`);
  }
  if (techStack.testing.detected) {
    engineeringObservations.push(`Automated testing infrastructure enabled with ${techStack.testing.testFileCount} test suites.`);
  }
  if (structure.apiEndpoints.length > 0) {
    engineeringObservations.push(`Exposes ${structure.apiEndpoints.length} REST API route handlers.`);
  }
  if (structure.frontendComponents.length > 0) {
    engineeringObservations.push(`Composes UI with ${structure.frontendComponents.length} modular frontend components.`);
  }
  if (metrics.internalCouplingScore < 60) {
    engineeringObservations.push('Clean architectural decoupling with low inter-module coupling ratio.');
  }

  if (engineeringObservations.length === 0) {
    engineeringObservations.push('Minimalist codebase with standard structure.');
  }

  return {
    overview,
    technologies,
    structure: structureSummary,
    majorModules,
    executionModel,
    entrypoints,
    engineeringObservations,
  };
}

// ─── Core Analysis Implementation ──────────────────────────────────────────────

async function doAnalyzeCodebase(params: {
  index: RepositoryIndex;
  providedContents?: Map<string, string>;
}): Promise<CompleteCodebaseIntelligence> {
  const startTime = Date.now();
  const { index, providedContents } = params;
  const { repository, files: indexedFiles } = index;
  const headers = buildHeaders();

  // 1. Select candidate source files to inspect (Strictly exclude sensitive & binary files)
  const candidateFiles = indexedFiles.filter(
    f =>
      f.status === 'indexed' &&
      !f.isSensitive &&
      !f.isBinary &&
      f.language !== null &&
      !['JSON', 'YAML', 'Markdown', 'Dockerfile', 'TOML'].includes(f.language)
  );

  // Prioritize primary modules (app, components, lib, services, routes, api)
  const prioritizedCandidates = candidateFiles
    .sort((a, b) => {
      const aPriority = /(?:app|components|lib|services|api|routes)\//.test(a.path) ? 1 : 0;
      const bPriority = /(?:app|components|lib|services|api|routes)\//.test(b.path) ? 1 : 0;
      return bPriority - aPriority;
    })
    .slice(0, MAX_SOURCE_FETCH_LIMIT);

  const allFilePaths = indexedFiles.map(f => f.path);
  const fileModuleMap = new Map<string, string>();
  for (const f of indexedFiles) {
    const parts = f.path.split('/');
    if (parts.length > 2 && parts[0] === 'src') {
      fileModuleMap.set(f.path, `src/${parts[1]}`);
    } else {
      fileModuleMap.set(f.path, parts[0] || 'root');
    }
  }

  const fileIntelligenceList: FileIntelligence[] = [];
  const allSymbols: CodeSymbol[] = [];
  const allImports: CodeImport[] = [];
  const allExports: CodeExport[] = [];

  // 2. Fetch and parse each candidate file
  for (const fileNode of prioritizedCandidates) {
    let content: string | null = null;

    if (providedContents && providedContents.has(fileNode.path)) {
      content = providedContents.get(fileNode.path)!;
    } else {
      content = await fetchSourceContent(
        repository.owner,
        repository.name,
        fileNode.path,
        repository.defaultBranch,
        headers
      );
    }

    if (!content) continue;

    const loc = content.split('\n').length;
    const role = determineFileRole(fileNode.path);

    // Extract symbols
    const symbols = parseSymbols(fileNode.path, content, fileNode.language);
    allSymbols.push(...symbols);

    // Extract imports and exports
    const rawImports = parseImports(fileNode.path, content, fileNode.language);
    const exports = parseExports(fileNode.path, content, fileNode.language);
    allExports.push(...exports);

    // Resolve internal import targets
    const resolvedImports: CodeImport[] = [];
    const internalDependencies: string[] = [];

    for (const imp of rawImports) {
      const resolved = resolveImportPath(fileNode.path, imp.importPath, allFilePaths);
      resolvedImports.push({
        ...imp,
        resolvedFilePath: resolved,
      });
      if (resolved && !internalDependencies.includes(resolved)) {
        internalDependencies.push(resolved);
      }
    }
    allImports.push(...resolvedImports);

    fileIntelligenceList.push({
      filePath: fileNode.path,
      language: fileNode.language,
      role,
      loc,
      sizeBytes: fileNode.sizeBytes,
      symbols,
      imports: resolvedImports,
      exports,
      internalDependencies,
      dependents: [], // populated in pass 2
    });
  }

  // 3. Populate reverse dependents list
  const fileIntelMap = new Map(fileIntelligenceList.map(f => [f.filePath, f]));
  for (const fi of fileIntelligenceList) {
    for (const depPath of fi.internalDependencies) {
      const target = fileIntelMap.get(depPath);
      if (target && !target.dependents.includes(fi.filePath)) {
        target.dependents.push(fi.filePath);
      }
    }
  }

  // 4. Build module relationships
  const relationships = buildModuleRelationships(allImports, fileModuleMap);

  // 5. Synthesize architectural model
  const architecture = classifyArchitecture({
    repository,
    frameworks: index.frameworks,
    modules: index.modules,
    files: fileIntelligenceList,
    symbols: allSymbols,
    relationships,
  });

  // 6. Detect Technology Stack
  const technologyStack = detectTechnologyStack(index, indexedFiles);

  // 7. Detect Architecture Patterns
  const patterns = detectArchitecturePatterns(index, technologyStack, indexedFiles);

  // 8. Detect Project Type
  const projectType = detectProjectType(index, patterns);

  // 9. Detect Repository Structure
  const structure = detectRepositoryStructure(index, fileIntelligenceList, allSymbols);
  structure.entrypoints = architecture.entrypoints;

  // 10. Calculate Engineering Metrics
  const metrics = calculateEngineeringMetrics(index, fileIntelligenceList, allSymbols, structure);

  // 11. Generate Deterministic Summary
  const summary = generateCodebaseSummary(repository, projectType, technologyStack, patterns, structure, metrics);

  const durationMs = Date.now() - startTime;

  return {
    repository,
    projectType,
    summary,
    metrics,
    technologyStack,
    patterns,
    structure,
    architecture,
    files: fileIntelligenceList,
    symbols: allSymbols,
    imports: allImports,
    exports: allExports,
    relationships,
    analyzedAt: new Date().toISOString(),
    status: fileIntelligenceList.length > 0 ? 'complete' : 'partial',
    durationMs,
  };
}
