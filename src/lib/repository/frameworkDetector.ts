/**
 * Phase 2 — Deterministic Framework & Tool Detector
 *
 * Detects application frameworks, libraries, build tools, and devops tooling
 * based on verified evidence:
 *   1. Manifest dependency names (package.json, pyproject.toml, go.mod, Cargo.toml, pom.xml, etc.)
 *   2. Dedicated configuration files (next.config.*, vite.config.*, manage.py, etc.)
 *
 * Returns concrete evidence citations and confidence levels. Zero LLM calls.
 */

import { FrameworkCategory, FrameworkConfidence, RepositoryDependency, RepositoryFileNode, RepositoryFramework } from './types';

interface FrameworkRule {
  name: string;
  category: FrameworkCategory;
  depNames?: string[];
  configPatterns?: RegExp[];
  evidenceGenerator: (matchedDeps: string[], matchedConfigs: string[]) => {
    confidence: FrameworkConfidence;
    evidence: string[];
  };
}

const FRAMEWORK_RULES: FrameworkRule[] = [
  // ─── Frontend & Full-Stack ──────────────────────────────────────────────────
  {
    name: 'Next.js',
    category: 'fullstack',
    depNames: ['next'],
    configPatterns: [/^next\.config\.(?:js|ts|mjs|cjs)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: evidence.length > 1 ? 'high' : 'high', evidence };
    },
  },
  {
    name: 'React',
    category: 'frontend',
    depNames: ['react', 'react-dom'],
    evidenceGenerator: (deps) => ({
      confidence: 'high',
      evidence: [`package.json dependency: ${deps.join(', ')}`],
    }),
  },
  {
    name: 'Vue.js',
    category: 'frontend',
    depNames: ['vue', '@vue/runtime-core'],
    configPatterns: [/^vue\.config\.(?:js|ts)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'Nuxt',
    category: 'fullstack',
    depNames: ['nuxt', 'nuxt3', '@nuxt/kit'],
    configPatterns: [/^nuxt\.config\.(?:js|ts)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'Svelte / SvelteKit',
    category: 'frontend',
    depNames: ['svelte', '@sveltejs/kit'],
    configPatterns: [/^svelte\.config\.(?:js|ts)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'Angular',
    category: 'frontend',
    depNames: ['@angular/core', '@angular/common'],
    configPatterns: [/^angular\.json$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'Remix',
    category: 'fullstack',
    depNames: ['@remix-run/react', '@remix-run/node'],
    configPatterns: [/^remix\.config\.(?:js|ts)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'Astro',
    category: 'frontend',
    depNames: ['astro'],
    configPatterns: [/^astro\.config\.(?:js|ts|mjs)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },

  // ─── Backend & APIs ──────────────────────────────────────────────────────────
  {
    name: 'Express',
    category: 'backend',
    depNames: ['express'],
    evidenceGenerator: (deps) => ({
      confidence: 'high',
      evidence: [`package.json dependency: ${deps.join(', ')}`],
    }),
  },
  {
    name: 'NestJS',
    category: 'backend',
    depNames: ['@nestjs/core', '@nestjs/common'],
    configPatterns: [/^nest-cli\.json$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'FastAPI',
    category: 'backend',
    depNames: ['fastapi'],
    evidenceGenerator: (deps) => ({
      confidence: 'high',
      evidence: [`Python dependency: ${deps.join(', ')}`],
    }),
  },
  {
    name: 'Django',
    category: 'backend',
    depNames: ['django'],
    configPatterns: [/^manage\.py$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`Python dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Entrypoint file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'Flask',
    category: 'backend',
    depNames: ['flask'],
    evidenceGenerator: (deps) => ({
      confidence: 'high',
      evidence: [`Python dependency: ${deps.join(', ')}`],
    }),
  },
  {
    name: 'Spring Boot',
    category: 'backend',
    depNames: ['org.springframework.boot:spring-boot-starter', 'spring-boot-starter-web'],
    evidenceGenerator: (deps) => ({
      confidence: 'high',
      evidence: [`Maven/Gradle dependency: ${deps.join(', ')}`],
    }),
  },
  {
    name: 'Gin (Go)',
    category: 'backend',
    depNames: ['github.com/gin-gonic/gin'],
    evidenceGenerator: (deps) => ({
      confidence: 'high',
      evidence: [`go.mod dependency: ${deps.join(', ')}`],
    }),
  },
  {
    name: 'Actix Web (Rust)',
    category: 'backend',
    depNames: ['actix-web'],
    evidenceGenerator: (deps) => ({
      confidence: 'high',
      evidence: [`Cargo.toml dependency: ${deps.join(', ')}`],
    }),
  },
  {
    name: 'Axum (Rust)',
    category: 'backend',
    depNames: ['axum'],
    evidenceGenerator: (deps) => ({
      confidence: 'high',
      evidence: [`Cargo.toml dependency: ${deps.join(', ')}`],
    }),
  },

  // ─── Styling & UI Libraries ──────────────────────────────────────────────────
  {
    name: 'Tailwind CSS',
    category: 'styling',
    depNames: ['tailwindcss'],
    configPatterns: [/^tailwind\.config\.(?:js|ts|cjs|mjs)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },

  // ─── Database & ORM ──────────────────────────────────────────────────────────
  {
    name: 'Prisma',
    category: 'database',
    depNames: ['@prisma/client', 'prisma'],
    configPatterns: [/schema\.prisma$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Schema file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'Drizzle ORM',
    category: 'database',
    depNames: ['drizzle-orm', 'drizzle-kit'],
    configPatterns: [/^drizzle\.config\.(?:js|ts)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'SQLAlchemy',
    category: 'database',
    depNames: ['sqlalchemy'],
    evidenceGenerator: (deps) => ({
      confidence: 'high',
      evidence: [`Python dependency: ${deps.join(', ')}`],
    }),
  },

  // ─── Testing Frameworks ──────────────────────────────────────────────────────
  {
    name: 'Vitest',
    category: 'testing',
    depNames: ['vitest'],
    configPatterns: [/^vitest\.config\.(?:js|ts|mjs)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json devDependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'Jest',
    category: 'testing',
    depNames: ['jest', '@types/jest'],
    configPatterns: [/^jest\.config\.(?:js|ts|mjs|json)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json devDependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'Playwright',
    category: 'testing',
    depNames: ['@playwright/test'],
    configPatterns: [/^playwright\.config\.(?:js|ts)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json devDependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'Pytest',
    category: 'testing',
    depNames: ['pytest'],
    configPatterns: [/^pytest\.ini$/i, /^conftest\.py$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`Python dependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Config/fixture: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },

  // ─── Build Tools & Bundlers ──────────────────────────────────────────────────
  {
    name: 'Vite',
    category: 'build_tool',
    depNames: ['vite'],
    configPatterns: [/^vite\.config\.(?:js|ts|mjs)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json devDependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },
  {
    name: 'Webpack',
    category: 'build_tool',
    depNames: ['webpack'],
    configPatterns: [/^webpack\.config\.(?:js|ts|cjs)$/i],
    evidenceGenerator: (deps, configs) => {
      const evidence: string[] = [];
      if (deps.length) evidence.push(`package.json devDependency: ${deps.join(', ')}`);
      if (configs.length) evidence.push(`Configuration file: ${configs.join(', ')}`);
      return { confidence: 'high', evidence };
    },
  },

  // ─── DevOps & Infrastructure ─────────────────────────────────────────────────
  {
    name: 'Docker',
    category: 'devops',
    configPatterns: [/^dockerfile(?:\..+)?$/i, /^docker-compose(?:\..+)?\.ya?ml$/i, /^\.dockerignore$/i],
    evidenceGenerator: (_, configs) => ({
      confidence: 'high',
      evidence: [`Container definitions: ${configs.join(', ')}`],
    }),
  },
];

/**
 * Detect frameworks from repository files and extracted dependencies.
 */
export function detectFrameworks(
  files: RepositoryFileNode[] = [],
  dependencies: RepositoryDependency[] = []
): RepositoryFramework[] {
  const safeDeps = dependencies || [];
  const safeFiles = files || [];
  const depNamesSet = new Set(safeDeps.map(d => d.name.toLowerCase()));
  const allFileNames = safeFiles.map(f => f.path.split('/').pop() || '');

  const frameworks: RepositoryFramework[] = [];

  for (const rule of FRAMEWORK_RULES) {
    const matchedDeps: string[] = [];
    if (rule.depNames) {
      for (const target of rule.depNames) {
        if (depNamesSet.has(target.toLowerCase())) {
          matchedDeps.push(target);
        }
      }
    }

    const matchedConfigs: string[] = [];
    if (rule.configPatterns) {
      for (const pattern of rule.configPatterns) {
        for (const file of files) {
          const fileName = file.path.split('/').pop() || '';
          if (pattern.test(fileName) || pattern.test(file.path)) {
            if (!matchedConfigs.includes(file.path)) {
              matchedConfigs.push(file.path);
            }
          }
        }
      }
    }

    if (matchedDeps.length > 0 || matchedConfigs.length > 0) {
      const { confidence, evidence } = rule.evidenceGenerator(matchedDeps, matchedConfigs);
      frameworks.push({
        name: rule.name,
        category: rule.category,
        confidence,
        evidence,
      });
    }
  }

  return frameworks;
}
