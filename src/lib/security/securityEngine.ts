/**
 * Phase 6 — Security Intelligence Engine
 *
 * Central deterministic orchestrator for Phase 6 Security Intelligence.
 * Coordinates secret scanning, sensitive file detection, configuration scanning,
 * code pattern risk detection, authentication architecture signals, and dependency advisories.
 *
 * Produces an evidence-backed SecurityHealthReport without fabricating vulnerabilities.
 */

import { CodebaseIntelligence } from '../intelligence/types';
import { RepositoryIndex, RepositoryRef } from '../repository/types';
import { scanAuthSignals } from './authPatternScanner';
import { scanCodePatterns } from './codePatternScanner';
import { scanConfiguration } from './configScanner';
import { scanSecrets } from './secretScanner';
import { detectSensitiveFiles } from './sensitiveFileDetector';
import {
  SecurityFinding,
  SecurityHealthReport,
  SecuritySeverity,
  SecuritySummary,
} from './types';
import { scanDependencies, VulnerabilityScanOptions } from './vulnerabilityScanner';

export interface SecurityAnalysisOptions {
  repoIndex: RepositoryIndex;
  intelligence?: CodebaseIntelligence | null;
  vulnerabilityOptions?: VulnerabilityScanOptions;
}

export async function analyzeSecurityHealth(
  options: SecurityAnalysisOptions
): Promise<SecurityHealthReport> {
  const startTime = Date.now();
  const { repoIndex, intelligence, vulnerabilityOptions } = options;

  const repository: RepositoryRef = intelligence?.repository || repoIndex?.repository || {
    id: 'unknown/repository',
    fullName: 'unknown/repository',
    name: 'repository',
    owner: 'unknown',
    defaultBranch: 'main',
  };

  // 1. Run all individual deterministic security scanners
  const secretRes = scanSecrets(repoIndex);
  const fileRes = detectSensitiveFiles(repoIndex);
  const configRes = scanConfiguration(repoIndex);
  const codeRes = scanCodePatterns(repoIndex);
  const authRes = scanAuthSignals(repoIndex, intelligence);
  const depRes = scanDependencies(repoIndex, vulnerabilityOptions);

  // 2. Aggregate and deduplicate findings
  const rawFindings: SecurityFinding[] = [
    ...secretRes.findings,
    ...fileRes.findings,
    ...configRes.findings,
    ...codeRes.findings,
    ...authRes.findings,
    ...depRes.findings,
  ];

  const seenIds = new Set<string>();
  const findings: SecurityFinding[] = [];
  for (const f of rawFindings) {
    if (!seenIds.has(f.id)) {
      seenIds.add(f.id);
      findings.push(f);
    }
  }

  // Sort findings by severity: critical -> high -> medium -> low -> info
  const severityRank: Record<SecuritySeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  // 3. Compute findings breakdown
  const findingsBySeverity = {
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
    info: findings.filter(f => f.severity === 'info').length,
  };

  // 4. Determine overall status
  let overallStatus: 'secure' | 'warning' | 'critical' = 'secure';
  if (findingsBySeverity.critical > 0) {
    overallStatus = 'critical';
  } else if (findingsBySeverity.high > 0 || findingsBySeverity.medium > 2) {
    overallStatus = 'warning';
  }

  // 5. Compile key risks and security highlights
  const keySecurityRisks: string[] = [];
  if (secretRes.indicators.totalSecretsFound > 0) {
    keySecurityRisks.push(`${secretRes.indicators.totalSecretsFound} potential hardcoded secret(s) or API credentials detected in code.`);
  }
  if (fileRes.indicators.totalSensitiveFiles > 0) {
    keySecurityRisks.push(`${fileRes.indicators.totalSensitiveFiles} sensitive file(s) (e.g. .env, private keys) committed to version control.`);
  }
  if (depRes.indicators.verifiedAdvisoriesCount > 0) {
    keySecurityRisks.push(`${depRes.indicators.verifiedAdvisoriesCount} verified dependency vulnerability advisory(ies) identified.`);
  }
  if (configRes.indicators.insecureFlagsCount > 0) {
    keySecurityRisks.push(`${configRes.indicators.insecureFlagsCount} insecure configuration pattern(s) identified (e.g. TLS bypass, open CORS).`);
  }
  if (codeRes.indicators.dangerousPatternsCount > 0) {
    keySecurityRisks.push(`${codeRes.indicators.dangerousPatternsCount} dangerous code execution or injection pattern(s) flagged.`);
  }

  const securityHighlights: string[] = [];
  if (secretRes.indicators.totalSecretsFound === 0) {
    securityHighlights.push('Zero hardcoded secrets, API keys, or private key material found in repository files.');
  }
  if (fileRes.indicators.totalSensitiveFiles === 0) {
    securityHighlights.push('Zero committed .env or credential store files in repository tree.');
  }
  if (configRes.indicators.insecureFlagsCount === 0) {
    securityHighlights.push('All configuration files enforce standard TLS and secure header practices.');
  }
  if (codeRes.indicators.dangerousPatternsCount === 0) {
    securityHighlights.push('Zero unsafe dynamic eval() or shell string interpolation patterns detected.');
  }
  if (depRes.indicators.advisoryStatus === 'verified' && depRes.indicators.verifiedAdvisoriesCount === 0) {
    securityHighlights.push(`All ${depRes.indicators.totalDependencies} scanned dependencies have zero known advisories in the verified database.`);
  }

  const summary: SecuritySummary = {
    repositoryId: repository.fullName || repository.name || 'unknown/repository',
    commitSha: repository.defaultBranch || 'main',
    scannedAt: new Date().toISOString(),
    overallStatus,
    totalFindingsCount: findings.length,
    findingsBySeverity,
    keySecurityRisks,
    securityHighlights,
  };

  return {
    repository,
    summary,
    secrets: secretRes.indicators,
    sensitiveFiles: fileRes.indicators,
    configuration: configRes.indicators,
    codePatterns: codeRes.indicators,
    authentication: authRes.indicators,
    dependencies: depRes.indicators,
    findings,
    advisories: depRes.advisories,
    durationMs: Date.now() - startTime,
  };
}
