/**
 * Phase 6 — Insecure Configuration Scanner
 *
 * Scans repository configuration and source files for dangerous security flags,
 * disabled TLS verification, overly permissive CORS, insecure cookie flags,
 * and risky container/CI settings.
 */

import { RepositoryIndex } from '../repository/types';
import { ConfigurationIndicators, SecurityFinding } from './types';

interface ConfigRule {
  id: string;
  name: string;
  pattern: RegExp;
  fileFilter?: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium';
  description: string;
  impact: string;
  recommendation: string;
}

const CONFIG_RULES: ConfigRule[] = [
  {
    id: 'RULE_CONFIG_TLS_DISABLED',
    name: 'Disabled TLS Certificate Verification',
    pattern: /(?:rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0['"]?|verify\s*=\s*False|curl\s+-[a-zA-Z]*k|insecure-skip-tls-verify)/i,
    severity: 'high',
    confidence: 'high',
    description: 'TLS/SSL certificate verification is explicitly disabled in code or configuration.',
    impact: 'Disabling certificate verification makes network connections vulnerable to man-in-the-middle (MITM) attacks and data interception.',
    recommendation: 'Enable TLS certificate validation and install required CA certificates instead of bypassing verification.',
  },
  {
    id: 'RULE_CONFIG_PERMISSIVE_CORS',
    name: 'Overly Permissive CORS Policy',
    pattern: /(?:cors\(\s*\{\s*origin\s*:\s*['"]\*['"]|Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"])/i,
    severity: 'medium',
    confidence: 'medium',
    description: 'Wildcard CORS origin (*) configured, allowing cross-origin requests from any website.',
    impact: 'Can expose sensitive API endpoints or authenticated user sessions to unauthorized third-party websites.',
    recommendation: 'Specify explicit trusted origins in CORS configuration rather than allowing wildcard access.',
  },
  {
    id: 'RULE_CONFIG_INSECURE_COOKIE',
    name: 'Insecure Cookie Configuration',
    pattern: /(?:httpOnly\s*:\s*false|secure\s*:\s*false\b.*cookie)/i,
    severity: 'medium',
    confidence: 'medium',
    description: 'Cookie configured with httpOnly or secure flag disabled.',
    impact: 'Cookies lacking httpOnly can be stolen via Cross-Site Scripting (XSS); cookies lacking secure can be transmitted in plaintext.',
    recommendation: 'Set httpOnly: true and secure: true for all session and authentication cookies in production environments.',
  },
  {
    id: 'RULE_CONFIG_DOCKER_PRIVILEGED',
    name: 'Privileged Container Execution',
    pattern: /(?:privileged\s*:\s*true|\/var\/run\/docker\.sock\s*:\s*\/var\/run\/docker\.sock)/i,
    fileFilter: /(?:docker-compose.*|\.dockerfile|Dockerfile.*|\.ya?ml)$/i,
    severity: 'high',
    confidence: 'high',
    description: 'Docker container configured to run in privileged mode or mount the host Docker socket.',
    impact: 'Privileged containers or host Docker socket mounts allow potential container breakout and full host system takeover.',
    recommendation: 'Run containers as non-root users without privileged flags, and grant only specific Linux capabilities as needed.',
  },
  {
    id: 'RULE_CONFIG_CI_PERMISSIVE_PERMS',
    name: 'Overly Permissive GitHub Actions Workflow Permissions',
    pattern: /permissions\s*:\s*write-all/i,
    fileFilter: /\.github\/workflows\/.*\.ya?ml$/i,
    severity: 'medium',
    confidence: 'high',
    description: 'GitHub Actions workflow grants write-all permissions to the default GITHUB_TOKEN.',
    impact: 'If a workflow or dependency is compromised, write-all permissions grant full write access to the repository, issues, and releases.',
    recommendation: 'Follow the principle of least privilege by specifying only required workflow permissions (e.g. contents: read, issues: write).',
  },
];

export function scanConfiguration(repoIndex: RepositoryIndex): {
  indicators: ConfigurationIndicators;
  findings: SecurityFinding[];
} {
  const findings: SecurityFinding[] = [];

  if (!repoIndex || !repoIndex.files) {
    return {
      indicators: {
        status: 'healthy',
        summary: 'No files available for configuration security analysis.',
        insecureFlagsCount: 0,
        findings: [],
      },
      findings: [],
    };
  }

  for (const file of repoIndex.files) {
    const filePath = file.path;
    const content = file.content;
    if (!content || typeof content !== 'string') continue;

    // Skip test files for cookie/cors unless explicit config
    const isTest = filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.');

    const lines = content.split('\n');

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const lineNum = lineIdx + 1;

      for (const rule of CONFIG_RULES) {
        if (rule.fileFilter && !rule.fileFilter.test(filePath)) {
          continue;
        }

        if (isTest && (rule.id === 'RULE_CONFIG_INSECURE_COOKIE' || rule.id === 'RULE_CONFIG_PERMISSIVE_CORS')) {
          continue;
        }

        if (rule.pattern.test(line)) {
          const findingId = `config-${rule.id}-${filePath.replace(/[^a-zA-Z0-9_-]/g, '_')}-${lineNum}`;
          const finding: SecurityFinding = {
            id: findingId,
            category: 'configuration',
            severity: rule.severity,
            title: `${rule.name} in ${filePath}`,
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
              type: 'config_flag',
              summary: `Matched insecure configuration rule '${rule.name}'.`,
              redactedContent: line.trim(),
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
              },
            },
          };

          findings.push(finding);
        }
      }
    }
  }

  const insecureFlagsCount = findings.length;
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  let summary = 'Zero insecure configuration flags or unsafe defaults detected.';

  if (insecureFlagsCount > 0) {
    const hasCritical = findings.some(f => f.severity === 'critical');
    status = hasCritical ? 'critical' : 'warning';
    summary = `Detected ${insecureFlagsCount} potentially insecure configuration pattern(s) across project files.`;
  }

  return {
    indicators: {
      status,
      summary,
      insecureFlagsCount,
      findings,
    },
    findings,
  };
}
