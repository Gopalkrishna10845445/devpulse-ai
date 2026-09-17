/**
 * Phase 6 — Sensitive File Detector
 *
 * Identifies committed files that traditionally store secrets, private keys,
 * environment credentials, or access tokens.
 *
 * Distinguishes example/template files from actual sensitive files.
 */

import { RepositoryIndex } from '../repository/types';
import { SecurityFinding, SensitiveFileIndicators } from './types';

interface SensitiveFileRule {
  id: string;
  name: string;
  pattern: RegExp;
  excludePattern?: RegExp;
  severity: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium';
  reason: string;
  sensitivityType: string;
  recommendation: string;
}

const SENSITIVE_FILE_RULES: SensitiveFileRule[] = [
  {
    id: 'RULE_FILE_ENV_CONFIG',
    name: 'Committed Environment File',
    pattern: /(^|\/)\.env(\.(local|production|staging|test\.local|prod))?$/i,
    excludePattern: /(^|\/)\.env\.(example|sample|template|dist|default)$/i,
    severity: 'high',
    confidence: 'high',
    reason: 'Committed environment file (.env) may expose environment variables and secret tokens.',
    sensitivityType: 'Environment Credentials',
    recommendation: 'Add .env files to .gitignore and provide safe sample templates as .env.example without real secrets.',
  },
  {
    id: 'RULE_FILE_PRIVATE_KEY',
    name: 'Private Key File',
    pattern: /(^|\/)(id_rsa|id_ed25519|id_dsa|.*\.pem|.*\.key|.*\.pkcs12|.*\.p12|.*\.pfx)$/i,
    excludePattern: /(^|\/)(public\.pem|cert\.pem|.*\.pub)$/i,
    severity: 'high',
    confidence: 'high',
    reason: 'Private cryptographic key file checked into version control.',
    sensitivityType: 'Private Key',
    recommendation: 'Remove private keys from git history immediately and deploy them securely via environment variables or secret vaults.',
  },
  {
    id: 'RULE_FILE_CLOUD_CREDENTIALS',
    name: 'Cloud / Service Account Credential File',
    pattern: /(^|\/)(credentials\.json|serviceAccountKey\.json|client_secret.*\.json|auth\.json|.*\.htpasswd|keystore\.jks|master\.key)$/i,
    excludePattern: /(^|\/)(credentials\.example\.json|client_secret\.template\.json)$/i,
    severity: 'high',
    confidence: 'high',
    reason: 'Potentially sensitive service account or OAuth client credential file committed.',
    sensitivityType: 'Cloud / OAuth Credentials',
    recommendation: 'Rotate the service account key and use cloud provider IAM workload identity federation or CI secrets.',
  },
  {
    id: 'RULE_FILE_AUTH_CONFIG',
    name: 'Package / Container Credential Store',
    pattern: /(^|\/)(\.dockercfg|\.npmrc|kubeconfig)$/i,
    severity: 'medium',
    confidence: 'medium',
    reason: 'Configuration file often used to store registry auth tokens or cluster access configurations.',
    sensitivityType: 'Package / Container Auth',
    recommendation: 'Ensure auth tokens in .npmrc or docker config are passed via environment variables (e.g., NPM_TOKEN) rather than committed directly.',
  },
];

export function detectSensitiveFiles(repoIndex: RepositoryIndex): {
  indicators: SensitiveFileIndicators;
  findings: SecurityFinding[];
} {
  const findings: SecurityFinding[] = [];
  const detectedFiles: { filePath: string; reason: string; sensitivityType: string }[] = [];

  if (!repoIndex || !repoIndex.files) {
    return {
      indicators: {
        status: 'healthy',
        summary: 'No repository files available for sensitive file detection.',
        totalSensitiveFiles: 0,
        detectedFiles: [],
        findings: [],
      },
      findings: [],
    };
  }

  for (const file of repoIndex.files) {
    const filePath = file.path;

    for (const rule of SENSITIVE_FILE_RULES) {
      if (rule.pattern.test(filePath)) {
        if (rule.excludePattern && rule.excludePattern.test(filePath)) {
          continue;
        }

        detectedFiles.push({
          filePath,
          reason: rule.reason,
          sensitivityType: rule.sensitivityType,
        });

        const findingId = `file-${rule.id}-${filePath.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const finding: SecurityFinding = {
          id: findingId,
          category: 'sensitive_files',
          severity: rule.severity,
          title: `Potentially sensitive file detected: ${filePath}`,
          description: rule.reason,
          impact: 'Sensitive configuration or credentials checked into the repository may be accessible to unauthorized parties.',
          filePath,
          lineStart: 1,
          lineEnd: 1,
          deterministicRule: rule.id,
          confidence: rule.confidence,
          recommendation: rule.recommendation,
          source: 'repository_static',
          status: 'active',
          evidence: {
            type: 'file_path',
            summary: `Matched sensitive file pattern '${rule.name}' for path '${filePath}'.`,
            redactedContent: `File: ${filePath}`,
            references: [
              {
                file: filePath,
                rule: rule.id,
              },
            ],
            data: {
              ruleId: rule.id,
              sensitivityType: rule.sensitivityType,
            },
          },
        };

        findings.push(finding);
      }
    }
  }

  const totalSensitiveFiles = detectedFiles.length;
  const status = totalSensitiveFiles > 0 ? 'warning' : 'healthy';
  const summary =
    totalSensitiveFiles > 0
      ? `Detected ${totalSensitiveFiles} potentially sensitive file(s) in repository tree.`
      : 'No sensitive credentials or environment files detected in the repository structure.';

  return {
    indicators: {
      status,
      summary,
      totalSensitiveFiles,
      detectedFiles,
      findings,
    },
    findings,
  };
}
