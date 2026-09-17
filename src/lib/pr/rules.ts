/**
 * Phase 8 — PR Review Rule Definitions
 *
 * Deterministic PR review rules with detection criteria, severity scales,
 * confidence ratings, and developer recommendations.
 */

import { PRFindingCategory, PRFindingSeverity } from './types';

export interface PRReviewRuleDefinition {
  id: string;
  category: PRFindingCategory;
  defaultSeverity: PRFindingSeverity;
  confidence: 'high' | 'medium' | 'low';
  name: string;
  description: string;
  impactExplanation: string;
  defaultRecommendation: string;
}

export const PR_REVIEW_RULES: Record<string, PRReviewRuleDefinition> = {
  RULE_PR_SECRET_INTRODUCED: {
    id: 'RULE_PR_SECRET_INTRODUCED',
    category: 'security',
    defaultSeverity: 'critical',
    confidence: 'high',
    name: 'Hardcoded Secret or Token Introduced in PR',
    description: 'Detects API keys, tokens, private keys, or sensitive credential files added in the PR diff.',
    impactExplanation: 'Exposes private credentials, risking repository compromise and unauthorized access.',
    defaultRecommendation: 'Extract credential to environment variables and rotate the exposed secret immediately.',
  },
  RULE_PR_ARCH_LAYER_BYPASS: {
    id: 'RULE_PR_ARCH_LAYER_BYPASS',
    category: 'architecture',
    defaultSeverity: 'high',
    confidence: 'high',
    name: 'Architectural Layer Bypass',
    description: 'Detects UI or presentation components directly importing persistence or database layers.',
    impactExplanation: 'Breaks modular boundaries, couples presentation logic to storage engines, and hinders testability.',
    defaultRecommendation: 'Route data queries through dedicated service or API layers.',
  },
  RULE_PR_NEW_CIRCULAR_DEPENDENCY: {
    id: 'RULE_PR_NEW_CIRCULAR_DEPENDENCY',
    category: 'architecture',
    defaultSeverity: 'medium',
    confidence: 'high',
    name: 'Potential Circular or Inverted Dependency',
    description: 'Detects reverse dependency edges (e.g. domain service importing controller).',
    impactExplanation: 'Risk of circular dependency cycles, runtime module initialization errors, and tight coupling.',
    defaultRecommendation: 'Invert dependency using dependency injection or extract shared contracts.',
  },
  RULE_PR_HIGH_COUPLING_INCREASE: {
    id: 'RULE_PR_HIGH_COUPLING_INCREASE',
    category: 'maintainability',
    defaultSeverity: 'medium',
    confidence: 'medium',
    name: 'High Module Coupling Increase',
    description: 'Detects substantial increase in external module import fan-out across modified files.',
    impactExplanation: 'Makes components fragile to upstream changes and increases maintenance burden.',
    defaultRecommendation: 'Group related dependencies into cohesive sub-modules.',
  },
  RULE_PR_UNTESTED_CHANGED_MODULE: {
    id: 'RULE_PR_UNTESTED_CHANGED_MODULE',
    category: 'testing',
    defaultSeverity: 'medium',
    confidence: 'high',
    name: 'Production Code Changed Without Accompanying Tests',
    description: 'Detects executable source code modifications with zero test files added or updated.',
    impactExplanation: 'Increases risk of regressions in modified code paths going undetected.',
    defaultRecommendation: 'Add automated unit or integration tests covering modified branches and edge cases.',
  },
  RULE_PR_DEPENDENCY_ADVISORY: {
    id: 'RULE_PR_DEPENDENCY_ADVISORY',
    category: 'dependencies',
    defaultSeverity: 'high',
    confidence: 'high',
    name: 'Vulnerable Dependency Introduced or Upgraded',
    description: 'Detects packages introduced in manifests that match known security advisories or CVEs.',
    impactExplanation: 'Directly introduces known vulnerability attack surfaces into production build.',
    defaultRecommendation: 'Upgrade package to the patched version or replace with a secure alternative.',
  },
  RULE_PR_DANGEROUS_CODE_PATTERN: {
    id: 'RULE_PR_DANGEROUS_CODE_PATTERN',
    category: 'security',
    defaultSeverity: 'high',
    confidence: 'high',
    name: 'Dangerous Code Pattern (TLS Bypass, Command Injection, XSS)',
    description: 'Detects dangerous API usage such as shell command execution, disabled TLS, or unescaped HTML.',
    impactExplanation: 'Exposes application to remote code execution, MitM attacks, or cross-site scripting.',
    defaultRecommendation: 'Use safe parameterized APIs, enable standard TLS verification, and sanitize HTML.',
  },
  RULE_PR_PUBLIC_API_CHANGED: {
    id: 'RULE_PR_PUBLIC_API_CHANGED',
    category: 'api',
    defaultSeverity: 'info',
    confidence: 'medium',
    name: 'Public API Route Modified',
    description: 'Detects modifications to public API endpoints without matching API documentation changes.',
    impactExplanation: 'External API consumers may experience breaking changes without advance notice.',
    defaultRecommendation: 'Update public API documentation and OpenAPI schemas.',
  },
  RULE_PR_CONFIG_CHANGED_WITHOUT_DOCS: {
    id: 'RULE_PR_CONFIG_CHANGED_WITHOUT_DOCS',
    category: 'documentation',
    defaultSeverity: 'low',
    confidence: 'medium',
    name: 'New Environment Variable or Config Without Documentation',
    description: 'Detects new process.env variables introduced without .env.example or README updates.',
    impactExplanation: 'Developers and CI environments may fail due to undocumented configuration requirements.',
    defaultRecommendation: 'Document newly introduced environment variables in .env.example and setup guides.',
  },
};
