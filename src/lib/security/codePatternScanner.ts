/**
 * Phase 6 — Dangerous Code Pattern Scanner
 *
 * Scans codebase source files for static risk signals including:
 * - Dynamic code execution (eval, new Function)
 * - Dangerous command execution with string interpolation
 * - SQL string interpolation patterns
 * - Raw HTML injection (dangerouslySetInnerHTML, v-html)
 * - Path traversal risk indicators
 * - Insecure deserialization patterns
 *
 * All findings are documented as conservative static risk signals.
 */

import { RepositoryIndex } from '../repository/types';
import { CodePatternIndicators, SecurityFinding } from './types';

interface CodePatternRule {
  id: string;
  name: string;
  pattern: RegExp;
  languageFilter?: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  recommendation: string;
}

const CODE_PATTERN_RULES: CodePatternRule[] = [
  {
    id: 'RULE_CODE_DYNAMIC_EVAL',
    name: 'Dynamic Code Execution (eval / new Function)',
    pattern: /\b(?:eval\s*\([^)]+\)|new\s+Function\s*\([^)]+\))/g,
    languageFilter: /\.(?:ts|tsx|js|jsx|mjs|cjs)$/i,
    severity: 'high',
    confidence: 'high',
    description: 'Potential dynamic code execution risk: dynamic evaluation of expressions using eval() or new Function().',
    impact: 'If any portion of the evaluated string originates from untrusted user input, arbitrary JavaScript execution can occur.',
    recommendation: 'Refactor code to avoid dynamic eval. Use structured parsing (e.g. JSON.parse) or static lookup tables.',
  },
  {
    id: 'RULE_CODE_UNSAFE_EXEC',
    name: 'Dynamic Command Execution Pattern',
    pattern: /(?:child_process|execSync|execFile|spawnSync|\bexec)\s*\(\s*[`'"][^`'"]*\$\{[^}]+\}/g,
    languageFilter: /\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rb)$/i,
    severity: 'high',
    confidence: 'high',
    description: 'Potential command injection risk: dynamically constructed command string passed to process execution API.',
    impact: 'Untrusted input concatenated into shell command strings can allow command injection and unauthorized server access.',
    recommendation: 'Use parameterized execution APIs (such as execFile or spawn with an argument array) instead of shell string interpolation.',
  },
  {
    id: 'RULE_CODE_SQL_INTERPOLATION',
    name: 'SQL Query String Interpolation',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s+[^`'"]*(?:\$\{[^}]+\}|\+\s*[a-zA-Z0-9_]+)/i,
    languageFilter: /\.(?:ts|tsx|js|jsx|py|go|php|java)$/i,
    severity: 'high',
    confidence: 'medium',
    description: 'Potential SQL injection risk: SQL query constructed using string concatenation or template literal interpolation.',
    impact: 'May allow attackers to manipulate query logic, bypass authentication, or exfiltrate database contents.',
    recommendation: 'Use parameterized queries, prepared statements, or an ORM/query builder with bind variables.',
  },
  {
    id: 'RULE_CODE_UNSAFE_HTML_INJECTION',
    name: 'Unsafe HTML Rendering Pattern',
    pattern: /(?:dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:|v-html\s*=|\.innerHTML\s*=\s*(?![`'"][^`'"]*[`'"]\s*;))/g,
    languageFilter: /\.(?:ts|tsx|js|jsx|vue)$/i,
    severity: 'medium',
    confidence: 'medium',
    description: 'Potential Cross-Site Scripting (XSS) risk: raw HTML rendered without apparent sanitization.',
    impact: 'Unsanitized HTML content rendered in the client browser can execute malicious scripts in user sessions.',
    recommendation: 'Sanitize untrusted HTML with libraries like DOMPurify before rendering, or prefer safe React/Vue text bindings.',
  },
  {
    id: 'RULE_CODE_PATH_TRAVERSAL',
    name: 'Path Construction from Untrusted Parameters',
    pattern: /path\.(?:join|resolve)\s*\([^,)]*,\s*(?:req\.(?:params|query|body)|params\.[a-zA-Z0-9_]+)/i,
    languageFilter: /\.(?:ts|tsx|js|jsx)$/i,
    severity: 'medium',
    confidence: 'medium',
    description: 'Potential path traversal risk: file path constructed using request parameters.',
    impact: 'May allow attackers to supply ../ sequences to read or write files outside the intended base directory.',
    recommendation: 'Validate paths against an allowlist or ensure the resolved path starts with the designated safe root directory.',
  },
  {
    id: 'RULE_CODE_INSECURE_DESERIALIZATION',
    name: 'Insecure Deserialization Pattern',
    pattern: /(?:pickle\.loads\s*\(|yaml\.load\s*\([^,)]*\))/g,
    languageFilter: /\.(?:py|ya?ml)$/i,
    severity: 'high',
    confidence: 'high',
    description: 'Potential insecure deserialization risk: loading untrusted serialized object graphs.',
    impact: 'Deserializing untrusted data can lead to arbitrary code execution in the application runtime.',
    recommendation: 'Use safe loaders such as yaml.safe_load() or JSON-based serialization formats.',
  },
];

export function scanCodePatterns(repoIndex: RepositoryIndex): {
  indicators: CodePatternIndicators;
  findings: SecurityFinding[];
} {
  const findings: SecurityFinding[] = [];
  const patternBreakdown: Record<string, number> = {};

  if (!repoIndex || !repoIndex.files) {
    return {
      indicators: {
        status: 'healthy',
        summary: 'No source files available for static code pattern security analysis.',
        dangerousPatternsCount: 0,
        patternBreakdown: {},
        findings: [],
      },
      findings: [],
    };
  }

  for (const file of repoIndex.files) {
    const filePath = file.path;
    const content = file.content;
    if (!content || typeof content !== 'string') continue;

    // Skip test files from flagging normal test mocks/helpers unless critical
    const isTest =
      filePath.includes('__tests__') ||
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('/tests/');

    const lines = content.split('\n');

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const lineNum = lineIdx + 1;

      for (const rule of CODE_PATTERN_RULES) {
        if (rule.languageFilter && !rule.languageFilter.test(filePath)) {
          continue;
        }

        // In test files, don't flag dynamic eval or mock execution
        if (isTest && (rule.id === 'RULE_CODE_DYNAMIC_EVAL' || rule.id === 'RULE_CODE_UNSAFE_EXEC')) {
          continue;
        }

        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(line)) {
          patternBreakdown[rule.name] = (patternBreakdown[rule.name] || 0) + 1;

          const findingId = `pattern-${rule.id}-${filePath.replace(/[^a-zA-Z0-9_-]/g, '_')}-${lineNum}`;
          const finding: SecurityFinding = {
            id: findingId,
            category: 'code_security',
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
              type: 'ast_pattern',
              summary: `Matched static code security pattern '${rule.name}'.`,
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
                ruleName: rule.name,
              },
            },
          };

          findings.push(finding);
        }
      }
    }
  }

  const dangerousPatternsCount = findings.length;
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  let summary = 'Zero dangerous static code execution or injection patterns detected.';

  if (dangerousPatternsCount > 0) {
    const hasCritical = findings.some(f => f.severity === 'critical');
    status = hasCritical ? 'critical' : 'warning';
    summary = `Detected ${dangerousPatternsCount} static code security signal(s) requiring security review.`;
  }

  return {
    indicators: {
      status,
      summary,
      dangerousPatternsCount,
      patternBreakdown,
      findings,
    },
    findings,
  };
}
