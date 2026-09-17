/**
 * Phase 6 — Deterministic Secret Scanner
 *
 * Scans repository files for hardcoded API keys, private keys, cloud credentials,
 * database URIs, and authentication tokens.
 *
 * Uses strict deterministic regex rules, rejects obvious placeholders,
 * and masks all secret values.
 */

import { RepositoryIndex } from '../repository/types';
import { maskSecret, isPlaceholderSecret, sanitizeEvidenceSnippet } from './redactor';
import { SecurityFinding, SecretsIndicators } from './types';

interface SecretRule {
  id: string;
  name: string;
  pattern: RegExp;
  extractMatch?: (match: RegExpExecArray) => string;
  severity: 'critical' | 'high' | 'medium';
  confidence: 'high' | 'medium';
  description: string;
  impact: string;
  recommendation: string;
}

const SECRET_RULES: SecretRule[] = [
  {
    id: 'RULE_SECRET_OPENAI',
    name: 'OpenAI API Key',
    pattern: /\b(sk-(?:proj-|live-)?[a-zA-Z0-9_-]{20,})\b/g,
    severity: 'critical',
    confidence: 'high',
    description: 'Potential hardcoded OpenAI API key discovered in source code.',
    impact: 'Exposed API keys can lead to unauthorized API usage, quota exhaustion, and financial charges.',
    recommendation: 'Move the key to environment variables (.env) and immediately revoke/rotate the exposed token in the OpenAI dashboard.',
  },
  {
    id: 'RULE_SECRET_AWS_ACCESS_KEY',
    name: 'AWS Access Key ID',
    pattern: /\b((?:AKIA|ASIA)[0-9A-Z]{16})\b/g,
    severity: 'high',
    confidence: 'high',
    description: 'Potential AWS Access Key ID detected.',
    impact: 'Exposing AWS credentials can allow unauthorized access to cloud infrastructure and storage buckets.',
    recommendation: 'Use AWS IAM roles, environment variables, or AWS Secrets Manager. Revoke and rotate the exposed access key in AWS IAM.',
  },
  {
    id: 'RULE_SECRET_GITHUB_TOKEN',
    name: 'GitHub Personal Access Token',
    pattern: /\b((?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{22,})\b/g,
    severity: 'critical',
    confidence: 'high',
    description: 'Potential GitHub Access Token detected in repository.',
    impact: 'Allows unauthorized access to repositories, packages, or organization resources depending on scopes.',
    recommendation: 'Revoke the token immediately from GitHub Settings > Developer Settings and use fine-grained GitHub Actions secrets or environment variables.',
  },
  {
    id: 'RULE_SECRET_SLACK_TOKEN',
    name: 'Slack Bot or User Token',
    pattern: /\b(xox[baprs]-[0-9a-zA-Z-]{20,})\b/g,
    severity: 'high',
    confidence: 'high',
    description: 'Potential Slack API token detected.',
    impact: 'May allow unauthorized workspace message reading, posting, or app administration.',
    recommendation: 'Revoke the token in Slack App Management and load it from secure environment variables.',
  },
  {
    id: 'RULE_SECRET_STRIPE_KEY',
    name: 'Stripe Live Secret Key',
    pattern: /\b((?:sk|rk)_live_[0-9a-zA-Z]{24,})\b/g,
    severity: 'critical',
    confidence: 'high',
    description: 'Potential Stripe Live API key discovered.',
    impact: 'Exposes payment processing capabilities, customer data, and financial transactions.',
    recommendation: 'Roll the key immediately in the Stripe Dashboard and ensure live keys are never stored in source code.',
  },
  {
    id: 'RULE_SECRET_GOOGLE_API_KEY',
    name: 'Google Cloud / Maps API Key',
    pattern: /\b(AIza[0-9A-Za-z\\-_]{35})\b/g,
    severity: 'high',
    confidence: 'high',
    description: 'Potential Google Cloud API key detected.',
    impact: 'Exposes Google Cloud APIs and billing to unauthorized quota consumption.',
    recommendation: 'Restrict the API key to specific HTTP referrers or IP ranges in Google Cloud Console, and store in environment variables.',
  },
  {
    id: 'RULE_SECRET_PRIVATE_KEY',
    name: 'Private Encryption / SSH Key Material',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'critical',
    confidence: 'high',
    description: 'Unencrypted private key material detected in repository files.',
    impact: 'Exposes cryptographic identity, allowing impersonation, decryption of communications, or unauthorized SSH access.',
    recommendation: 'Remove private keys from repository history immediately, generate a new key pair, and deploy keys via secure key vaults or CI secrets.',
  },
  {
    id: 'RULE_SECRET_DB_CONNECTION_STRING',
    name: 'Database Connection String with Password',
    pattern: /\b((?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis):\/\/[a-zA-Z0-9_.-]+:([^\s@:]+)@[a-zA-Z0-9_.-]+[^\s'"]*)/g,
    extractMatch: (match) => match[1],
    severity: 'critical',
    confidence: 'high',
    description: 'Database connection URI containing plaintext authentication credentials.',
    impact: 'Direct access to database instances, potential data exfiltration, tampering, or loss.',
    recommendation: 'Store database URIs in environment variables (e.g. DATABASE_URL) and inject them at runtime.',
  },
  {
    id: 'RULE_SECRET_GENERIC_HARDCODED',
    name: 'Hardcoded Secret Assignment',
    pattern: /(?:(?:api_key|apikey|secret_key|auth_token|jwt_secret|access_token|client_secret)\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{24,})['"])/gi,
    extractMatch: (match) => match[1],
    severity: 'high',
    confidence: 'medium',
    description: 'High-entropy secret or authorization token assigned as a hardcoded string literal.',
    impact: 'Static secrets in code can be extracted by any party with read access to the repository.',
    recommendation: 'Inject secret values dynamically through process.env or a secret manager.',
  },
];

export function scanSecrets(repoIndex: RepositoryIndex): {
  indicators: SecretsIndicators;
  findings: SecurityFinding[];
} {
  const findings: SecurityFinding[] = [];
  const secretTypesFound = new Set<string>();

  if (!repoIndex || !repoIndex.files || repoIndex.files.length === 0) {
    return {
      indicators: {
        status: 'healthy',
        summary: 'No repository files available for secret scanning.',
        totalSecretsFound: 0,
        secretTypesFound: [],
        findings: [],
      },
      findings: [],
    };
  }

  for (const file of repoIndex.files) {
    // Skip binary files or obvious generated assets if any
    const filePath = file.path;
    const content = file.content;
    if (!content || typeof content !== 'string') continue;

    // Check if file is a test fixture or documentation example
    const isTestOrDoc =
      filePath.includes('/test/') ||
      filePath.includes('/tests/') ||
      filePath.includes('__tests__') ||
      filePath.includes('.spec.') ||
      filePath.includes('.test.') ||
      filePath.endsWith('.md');

    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const lineContent = lines[lineIndex];
      const lineNum = lineIndex + 1;

      for (const rule of SECRET_RULES) {
        // Reset regex state for global regex
        rule.pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = rule.pattern.exec(lineContent)) !== null) {
          const rawSecret = rule.extractMatch ? rule.extractMatch(match) : match[1] || match[0];

          // Check if placeholder or documentation dummy
          if (isPlaceholderSecret(rawSecret)) {
            continue;
          }

          // In test files, if it contains explicit mock/fixture names, skip
          if (isTestOrDoc && (lineContent.includes('mock') || lineContent.includes('fake') || lineContent.includes('dummy'))) {
            continue;
          }

          const maskedSecret = maskSecret(rawSecret);
          const sanitizedLine = sanitizeEvidenceSnippet(lineContent.trim(), rawSecret);

          secretTypesFound.add(rule.name);

          const findingId = `secret-${rule.id}-${filePath}-${lineNum}`;
          const finding: SecurityFinding = {
            id: findingId,
            category: 'secrets',
            severity: rule.severity,
            title: `${rule.name} exposed in ${filePath}`,
            description: rule.description,
            impact: rule.impact,
            filePath,
            lineStart: lineNum,
            lineEnd: lineNum,
            deterministicRule: rule.id,
            confidence: rule.confidence,
            recommendation: rule.recommendation,
            source: 'repository_static',
            status: 'active',
            evidence: {
              type: 'secret_match',
              summary: `Found ${rule.name} matching pattern '${rule.id}'. Masked value: ${maskedSecret}`,
              redactedContent: sanitizedLine,
              references: [
                {
                  file: filePath,
                  line: lineNum,
                  lineRange: `${lineNum}`,
                  rule: rule.id,
                },
              ],
              data: {
                ruleId: rule.id,
                ruleName: rule.name,
                maskedSecret,
              },
            },
          };

          findings.push(finding);
        }
      }
    }
  }

  const totalSecretsFound = findings.length;
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  let summary = 'Zero hardcoded secrets or sensitive API credentials detected in repository files.';

  if (totalSecretsFound > 0) {
    const hasCritical = findings.some(f => f.severity === 'critical');
    status = hasCritical ? 'critical' : 'warning';
    summary = `Detected ${totalSecretsFound} potential secret/credential exposure(s) across ${Array.from(secretTypesFound).join(', ')}.`;
  }

  return {
    indicators: {
      status,
      summary,
      totalSecretsFound,
      secretTypesFound: Array.from(secretTypesFound),
      findings,
    },
    findings,
  };
}
