/**
 * Phase 8 — PR Multi-Dimensional Impact Analyzers
 *
 * Deterministically computes Architecture, Security, Testing, Dependency,
 * and Documentation impact by analyzing PR diffs against codebase intelligence.
 */

import {
  ArchitectureImpact,
  DependencyImpact,
  DocumentationImpact,
  ParsedDiffFile,
  PRReviewFinding,
  SecurityImpact,
  TestingImpact,
} from './types';
import { CodebaseIntelligence } from '../intelligence/types';
import { maskSecret, maskTextSecrets, isPlaceholderSecret } from '../security/redactor';
import { KNOWN_VERIFIED_ADVISORIES } from '../security/vulnerabilityScanner';

// ─── 1. Architecture Impact Analyzer ──────────────────────────────────────────

export function analyzeArchitectureImpact(
  parsedFiles: ParsedDiffFile[],
  intelligence?: CodebaseIntelligence | null
): { impact: ArchitectureImpact; findings: PRReviewFinding[] } {
  const layerBypasses: ArchitectureImpact['layerBypasses'] = [];
  const circularDependencies: ArchitectureImpact['circularDependencies'] = [];
  const couplingChanges: ArchitectureImpact['couplingChanges'] = [];
  const findings: PRReviewFinding[] = [];

  for (const file of parsedFiles) {
    if (file.status === 'deleted') continue;

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type !== 'add') continue;

        // Check for direct database / internal bypass from UI/Presentation
        const isPresentation = file.filePath.startsWith('src/components') || file.filePath.startsWith('src/app') || file.filePath.includes('/ui/');
        if (isPresentation) {
          if (/import\s+.*\s+from\s+['"].*(?:database|prisma|typeorm|knex|pg|mysql|sqlite)['"]/i.test(line.content)) {
            const bypass = {
              sourceFile: file.filePath,
              targetModule: 'database',
              description: `UI/Presentation layer directly imports database layer (${line.content.trim()}), bypassing domain services.`,
            };
            layerBypasses.push(bypass);

            findings.push({
              id: `PR-ARCH-${file.filePath}-${line.newLineNumber || 1}`,
              category: 'architecture',
              severity: 'high',
              confidence: 'high',
              title: 'Architectural Layer Bypass Introduced',
              description: bypass.description,
              impact: 'Couples presentation layer directly to persistence infrastructure, violating separation of concerns.',
              file: file.filePath,
              line: line.newLineNumber,
              evidence: {
                summary: `Direct database import introduced in ${file.filePath}`,
                filePath: file.filePath,
                line: line.newLineNumber,
                snippet: line.content,
              },
              source: 'deterministic_rule',
              rule: 'RULE_PR_ARCH_LAYER_BYPASS',
              recommendation: 'Refactor direct database query into a dedicated server-side API or domain service.',
            });
          }
        }

        // Check for new circular reference indicator
        if (file.filePath.includes('service') && /import\s+.*\s+from\s+['"].*controller['"]/i.test(line.content)) {
          circularDependencies.push({
            modules: [file.filePath, 'controller'],
            description: `Domain service imports controller (${line.content.trim()}), potentially forming a circular dependency.`,
          });
          findings.push({
            id: `PR-CIRC-${file.filePath}-${line.newLineNumber || 1}`,
            category: 'architecture',
            severity: 'medium',
            confidence: 'high',
            title: 'Potential Inverted Layer / Circular Dependency',
            description: `Service layer introduces reverse dependency to controller (${line.content.trim()}).`,
            impact: 'Risk of circular dependency cycles, testing difficulties, and architectural coupling.',
            file: file.filePath,
            line: line.newLineNumber,
            evidence: {
              summary: `Reverse dependency to controller in ${file.filePath}`,
              filePath: file.filePath,
              line: line.newLineNumber,
              snippet: line.content,
            },
            source: 'deterministic_rule',
            rule: 'RULE_PR_NEW_CIRCULAR_DEPENDENCY',
            recommendation: 'Invert dependency using dependency injection or relocate shared contracts to a neutral module.',
          });
        }
      }
    }
  }

  const status: ArchitectureImpact['status'] =
    layerBypasses.length > 0 ? 'critical' : circularDependencies.length > 0 ? 'warning' : 'healthy';

  const summary =
    layerBypasses.length > 0
      ? `Detected ${layerBypasses.length} architectural layer bypasses in modified files.`
      : circularDependencies.length > 0
      ? `Detected ${circularDependencies.length} potential inverted dependency relationships.`
      : 'PR changes adhere to existing modular layer boundaries without introducing layer bypasses.';

  return {
    impact: {
      summary,
      status,
      layerBypasses,
      circularDependencies,
      couplingChanges,
    },
    findings,
  };
}

// ─── 2. Security Impact Analyzer ──────────────────────────────────────────────

export function analyzeSecurityImpact(
  parsedFiles: ParsedDiffFile[]
): { impact: SecurityImpact; findings: PRReviewFinding[] } {
  const sensitiveChanges: SecurityImpact['sensitiveChanges'] = [];
  const findings: PRReviewFinding[] = [];
  let introducedSecrets = 0;

  // Regexes matching common hardcoded secrets
  const secretPatterns = [
    { name: 'OpenAI API Key', regex: /\b(sk-(?:proj-|live-)?[a-zA-Z0-9_-]{20,})\b/ },
    { name: 'GitHub Token', regex: /\b((?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{22,})\b/ },
    { name: 'AWS Access Key', regex: /\b((?:AKIA|ASIA)[0-9A-Z]{16})\b/ },
    { name: 'Generic Private Key', regex: /(-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----)/ },
    { name: 'Slack Token', regex: /\b(xox[baprs]-[0-9a-zA-Z-]{20,})\b/ },
  ];

  for (const file of parsedFiles) {
    if (file.status === 'deleted') continue;

    // Check sensitive file names added
    if (file.status === 'added' && /(?:^\.env|\.pem$|\.key$|credentials\.json$|id_rsa$)/i.test(file.filePath)) {
      sensitiveChanges.push({
        file: file.filePath,
        type: 'sensitive_file_committed',
        description: `Sensitive environment or key file "${file.filePath}" committed to version control.`,
      });
      findings.push({
        id: `PR-SEC-FILE-${file.filePath}`,
        category: 'security',
        severity: 'critical',
        confidence: 'high',
        title: 'Sensitive File Added to Version Control',
        description: `File "${file.filePath}" contains private credentials or local secrets that must not be committed.`,
        impact: 'Exposes private credentials, encryption keys, or environment secrets to repository history.',
        file: file.filePath,
        evidence: {
          summary: `Sensitive file committed: ${file.filePath}`,
          filePath: file.filePath,
        },
        source: 'security_intelligence',
        rule: 'RULE_PR_SECRET_INTRODUCED',
        recommendation: 'Remove file from commit, add to .gitignore, and rotate any exposed keys immediately.',
      });
    }

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type !== 'add') continue;

        // 1. Secret Scanning
        for (const pattern of secretPatterns) {
          const match = line.content.match(pattern.regex);
          if (match && !isPlaceholderSecret(match[1])) {
            introducedSecrets++;
            const masked = maskSecret(match[1]);
            const sanitizedSnippet = line.content.replace(match[1], masked);

            findings.push({
              id: `PR-SEC-${file.filePath}-${line.newLineNumber || 1}-${pattern.name.replace(/\s+/g, '')}`,
              category: 'security',
              severity: 'critical',
              confidence: 'high',
              title: `Hardcoded ${pattern.name} Introduced in PR`,
              description: `A hardcoded credential (${pattern.name}) was introduced on line ${line.newLineNumber}.`,
              impact: 'Exposes sensitive API credentials to repository collaborators and version history.',
              file: file.filePath,
              line: line.newLineNumber,
              evidence: {
                summary: `Hardcoded ${pattern.name} detected: ${masked}`,
                filePath: file.filePath,
                line: line.newLineNumber,
                snippet: sanitizedSnippet,
              },
              source: 'security_intelligence',
              rule: 'RULE_PR_SECRET_INTRODUCED',
              recommendation: 'Extract credential to environment variables (e.g. process.env) and rotate the exposed secret.',
            });
          }
        }

        // 2. Disabled TLS Verification
        if (/rejectUnauthorized\s*:\s*false/i.test(line.content) || /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]/i.test(line.content)) {
          findings.push({
            id: `PR-SEC-TLS-${file.filePath}-${line.newLineNumber || 1}`,
            category: 'security',
            severity: 'high',
            confidence: 'high',
            title: 'TLS Certificate Verification Disabled',
            description: `TLS certificate verification is disabled (${line.content.trim()}).`,
            impact: 'Allows Man-in-the-Middle (MitM) attacks by accepting forged or invalid TLS certificates.',
            file: file.filePath,
            line: line.newLineNumber,
            evidence: {
              summary: 'TLS verification bypass detected',
              filePath: file.filePath,
              line: line.newLineNumber,
              snippet: line.content,
            },
            source: 'security_intelligence',
            rule: 'RULE_PR_DANGEROUS_CODE_PATTERN',
            recommendation: 'Enable standard TLS certificate validation and install proper CA certificates.',
          });
        }

        // 3. Command Injection / Unsafe exec
        if (/child_process\s*\.\s*exec\s*\(|execSync\s*\(/i.test(line.content) && !/execFile/i.test(line.content)) {
          findings.push({
            id: `PR-SEC-EXEC-${file.filePath}-${line.newLineNumber || 1}`,
            category: 'security',
            severity: 'high',
            confidence: 'medium',
            title: 'Potential Command Injection Risk via Shell Execution',
            description: `PR introduces child_process.exec() with potential shell interpolation (${line.content.trim()}).`,
            impact: 'Untrusted user arguments passed to shell execution can lead to Remote Code Execution (RCE).',
            file: file.filePath,
            line: line.newLineNumber,
            evidence: {
              summary: 'child_process.exec invocation introduced',
              filePath: file.filePath,
              line: line.newLineNumber,
              snippet: line.content,
            },
            source: 'security_intelligence',
            rule: 'RULE_PR_DANGEROUS_CODE_PATTERN',
            recommendation: 'Use execFile or spawn with parameterized arguments instead of passing raw command strings to a shell.',
          });
        }

        // 4. Raw HTML Injection / XSS
        if (/dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/i.test(line.content)) {
          findings.push({
            id: `PR-SEC-XSS-${file.filePath}-${line.newLineNumber || 1}`,
            category: 'security',
            severity: 'medium',
            confidence: 'high',
            title: 'Unescaped HTML Rendering (dangerouslySetInnerHTML)',
            description: `PR introduces dangerouslySetInnerHTML without verified HTML sanitization.`,
            impact: 'Enables Cross-Site Scripting (XSS) if input contains untrusted or user-supplied markup.',
            file: file.filePath,
            line: line.newLineNumber,
            evidence: {
              summary: 'dangerouslySetInnerHTML usage introduced',
              filePath: file.filePath,
              line: line.newLineNumber,
              snippet: line.content,
            },
            source: 'security_intelligence',
            rule: 'RULE_PR_DANGEROUS_CODE_PATTERN',
            recommendation: 'Sanitize HTML with DOMPurify or use standard JSX text binding.',
          });
        }

        // 5. Unsafe SQL Query Interpolation
        if (/(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\$\{[^}]+\}/i.test(line.content) || /query\s*\(\s*`[^`]*\$\{[^}]+\}/i.test(line.content)) {
          findings.push({
            id: `PR-SEC-SQL-${file.filePath}-${line.newLineNumber || 1}`,
            category: 'security',
            severity: 'high',
            confidence: 'high',
            title: 'Unsafe SQL String Interpolation',
            description: `PR constructs SQL query using unescaped string interpolation (${line.content.trim()}).`,
            impact: 'Enables SQL Injection if interpolated variables contain user-controlled input.',
            file: file.filePath,
            line: line.newLineNumber,
            evidence: {
              summary: 'SQL query string interpolation detected',
              filePath: file.filePath,
              line: line.newLineNumber,
              snippet: line.content,
            },
            source: 'security_intelligence',
            rule: 'RULE_PR_DANGEROUS_CODE_PATTERN',
            recommendation: 'Use parameterized bind variables ($1, $2) instead of direct string template interpolation.',
          });
        }

        // 6. Insecure Cookie Configuration
        if (/httpOnly\s*:\s*false/i.test(line.content) || (line.content.includes('cookies.set') && line.content.includes('httpOnly: false'))) {
          findings.push({
            id: `PR-SEC-COOKIE-${file.filePath}-${line.newLineNumber || 1}`,
            category: 'security',
            severity: 'medium',
            confidence: 'high',
            title: 'Insecure Cookie Configuration (httpOnly: false)',
            description: `PR configures cookie with httpOnly explicitly disabled (${line.content.trim()}).`,
            impact: 'Allows client-side JavaScript access to cookies, exposing session tokens to XSS theft.',
            file: file.filePath,
            line: line.newLineNumber,
            evidence: {
              summary: 'httpOnly: false cookie flag detected',
              filePath: file.filePath,
              line: line.newLineNumber,
              snippet: line.content,
            },
            source: 'security_intelligence',
            rule: 'RULE_PR_DANGEROUS_CODE_PATTERN',
            recommendation: 'Set httpOnly: true and secure: true on authentication session cookies.',
          });
        }
      }
    }
  }

  const status: SecurityImpact['status'] =
    introducedSecrets > 0 || sensitiveChanges.length > 0
      ? 'critical'
      : findings.some(f => f.severity === 'high')
      ? 'warning'
      : 'clean';

  const summary =
    status === 'critical'
      ? `CRITICAL security risks detected: ${introducedSecrets} secret(s) and ${sensitiveChanges.length} sensitive file change(s).`
      : findings.length > 0
      ? `Found ${findings.length} security signal(s) requiring remediation in changed code.`
      : 'No critical security risks or introduced secrets detected in the PR diff.';

  return {
    impact: {
      summary,
      status,
      introducedSecrets,
      sensitiveChanges,
      advisoryCount: 0,
    },
    findings,
  };
}

// ─── 3. Testing Impact Analyzer ───────────────────────────────────────────────

export function analyzeTestingImpact(
  parsedFiles: ParsedDiffFile[]
): { impact: TestingImpact; findings: PRReviewFinding[] } {
  const isTestFile = (path: string) =>
    /(?:^|\/)(?:__tests__|tests?|spec|specs)\//i.test(path) || /\.(?:test|spec)\.[jt]sx?$/i.test(path);

  const changedSourceFiles: string[] = [];
  const changedTestFiles: string[] = [];
  let newTestsCount = 0;
  let modifiedTestsCount = 0;
  let deletedTestsCount = 0;

  for (const file of parsedFiles) {
    if (isTestFile(file.filePath)) {
      changedTestFiles.push(file.filePath);
      if (file.status === 'added') newTestsCount++;
      else if (file.status === 'deleted') deletedTestsCount++;
      else modifiedTestsCount++;
    } else if (/\.(?:ts|tsx|js|jsx|py|go|rs|java)$/i.test(file.filePath)) {
      changedSourceFiles.push(file.filePath);
    }
  }

  // Check which source files lack corresponding test files in the PR
  const changedSourceFilesWithoutTests = changedSourceFiles.filter(srcPath => {
    const baseName = srcPath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    return !changedTestFiles.some(t => t.includes(baseName));
  });

  const findings: PRReviewFinding[] = [];

  if (changedSourceFiles.length > 0 && changedTestFiles.length === 0) {
    findings.push({
      id: 'PR-TEST-NO-TESTS',
      category: 'testing',
      severity: 'medium',
      confidence: 'high',
      title: 'Production Code Changed Without Test Coverage',
      description: `PR modifies ${changedSourceFiles.length} source file(s) without adding or updating corresponding unit/integration tests.`,
      impact: 'Increases risk of undetected regressions in modified code paths.',
      file: changedSourceFiles[0],
      evidence: {
        summary: `Changed source files: ${changedSourceFiles.slice(0, 3).join(', ')}${changedSourceFiles.length > 3 ? '...' : ''}`,
        filePath: changedSourceFiles[0],
      },
      source: 'deterministic_rule',
      rule: 'RULE_PR_UNTESTED_CHANGED_MODULE',
      recommendation: 'Add automated unit/integration tests covering the newly introduced behaviors or edge cases.',
    });
  }

  const status: TestingImpact['status'] =
    changedTestFiles.length > 0
      ? 'adequate'
      : changedSourceFiles.length === 0
      ? 'adequate'
      : 'warning';

  const summary =
    changedTestFiles.length > 0
      ? `PR includes ${newTestsCount} new test file(s) and ${modifiedTestsCount} modified test(s).`
      : changedSourceFiles.length > 0
      ? `PR modifies ${changedSourceFiles.length} source file(s) with 0 accompanying test changes.`
      : 'No executable source changes requiring test updates.';

  return {
    impact: {
      summary,
      status,
      changedSourceFilesWithoutTests,
      newTestsCount,
      modifiedTestsCount,
      deletedTestsCount,
      testCoverageNote: 'Static repository analysis: test execution coverage not measured directly.',
    },
    findings,
  };
}

// ─── 4. Dependency Impact Analyzer ────────────────────────────────────────────

export function analyzeDependencyImpact(
  parsedFiles: ParsedDiffFile[]
): { impact: DependencyImpact; findings: PRReviewFinding[] } {
  const addedPackages: DependencyImpact['addedPackages'] = [];
  const removedPackages: DependencyImpact['removedPackages'] = [];
  const upgradedPackages: DependencyImpact['upgradedPackages'] = [];
  const advisoriesDetected: DependencyImpact['advisoriesDetected'] = [];
  const findings: PRReviewFinding[] = [];

  const manifestFiles = parsedFiles.filter(f =>
    /package\.json$|pom\.xml$|go\.mod$|Cargo\.toml$|requirements\.txt$/i.test(f.filePath)
  );

  for (const file of manifestFiles) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (/package\.json$/i.test(file.filePath)) {
          // Detect added or modified dependencies: "lodash": "^4.17.20"
          const match = line.content.match(/"([^"]+)":\s*"([^"]+)"/);
          if (match) {
            const pkg = match[1];
            const version = match[2];

            if (line.type === 'add') {
              addedPackages.push({ name: pkg, version });

              // Check if newly introduced package has a verified advisory in our database
              const packageAdvisories = KNOWN_VERIFIED_ADVISORIES[pkg.toLowerCase()] || [];
              const advisory = packageAdvisories.find(adv => adv.affectedVersions(version));

              if (advisory) {
                advisoriesDetected.push({
                  packageName: pkg,
                  severity: advisory.severity,
                  advisoryId: advisory.advisoryId,
                  description: advisory.title,
                });

                findings.push({
                  id: `PR-DEP-ADV-${pkg}`,
                  category: 'dependencies',
                  severity: advisory.severity === 'critical' ? 'critical' : 'high',
                  confidence: 'high',
                  title: `Vulnerable Dependency Version Introduced (${pkg})`,
                  description: `PR introduces ${pkg}@${version}, which has known advisory ${advisory.advisoryId}: ${advisory.title}`,
                  impact: `Exposes application to ${advisory.advisoryId}. Patched in ${advisory.patchedVersion || 'later versions'}.`,
                  file: file.filePath,
                  line: line.newLineNumber,
                  evidence: {
                    summary: `Known advisory ${advisory.advisoryId} matches package ${pkg}@${version}`,
                    filePath: file.filePath,
                    line: line.newLineNumber,
                    snippet: line.content,
                  },
                  source: 'security_intelligence',
                  rule: 'RULE_PR_DEPENDENCY_ADVISORY',
                  recommendation: `Upgrade ${pkg} to version ${advisory.patchedVersion || 'latest'} or replace with a secure alternative.`,
                });
              }
            } else if (line.type === 'del') {
              removedPackages.push({ name: pkg, version });
            }
          }
        }
      }
    }
  }

  const status: DependencyImpact['status'] =
    advisoriesDetected.length > 0
      ? 'critical'
      : addedPackages.length > 0 || removedPackages.length > 0
      ? 'warning'
      : 'clean';

  const summary =
    advisoriesDetected.length > 0
      ? `Introduced ${advisoriesDetected.length} package(s) with known security advisories.`
      : manifestFiles.length > 0
      ? `PR modifies dependencies: +${addedPackages.length} added, -${removedPackages.length} removed.`
      : 'No package dependency manifests modified in this PR.';

  return {
    impact: {
      summary,
      status,
      addedPackages,
      removedPackages,
      upgradedPackages,
      advisoriesDetected,
    },
    findings,
  };
}

// ─── 5. Documentation Impact Analyzer ─────────────────────────────────────────

export function analyzeDocumentationImpact(
  parsedFiles: ParsedDiffFile[]
): { impact: DocumentationImpact; findings: PRReviewFinding[] } {
  const publicApiChangesWithoutDocs: string[] = [];
  const newConfigOrEnvVarsWithoutDocs: string[] = [];
  const findings: PRReviewFinding[] = [];

  const hasDocChange = parsedFiles.some(f =>
    /README\.md$|\.mdx?$|docs\//i.test(f.filePath)
  );

  for (const file of parsedFiles) {
    if (file.status === 'deleted') continue;

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type !== 'add') continue;

        // Check for new environment variables: process.env.XYZ
        const envMatch = line.content.match(/process\.env\.([A-Z0-9_]{3,})/);
        if (envMatch && !hasDocChange) {
          const envVar = envMatch[1];
          if (!newConfigOrEnvVarsWithoutDocs.includes(envVar)) {
            newConfigOrEnvVarsWithoutDocs.push(envVar);
          }
        }

        // Check for exported public API endpoints
        if (/export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE)\b/.test(line.content) && !hasDocChange) {
          if (!publicApiChangesWithoutDocs.includes(file.filePath)) {
            publicApiChangesWithoutDocs.push(file.filePath);
          }
        }
      }
    }
  }

  if (newConfigOrEnvVarsWithoutDocs.length > 0) {
    findings.push({
      id: 'PR-DOC-NEW-ENV',
      category: 'documentation',
      severity: 'low',
      confidence: 'medium',
      title: 'New Environment Variables Introduced Without Documentation',
      description: `PR introduces new environment variable(s) (${newConfigOrEnvVarsWithoutDocs.join(', ')}) without corresponding updates to README.md or .env.example.`,
      impact: 'Deployments or local developer setups may fail due to missing configuration discovery.',
      file: parsedFiles[0]?.filePath,
      evidence: {
        summary: `Undocumented environment variables: ${newConfigOrEnvVarsWithoutDocs.join(', ')}`,
        filePath: parsedFiles[0]?.filePath || 'README.md',
      },
      source: 'deterministic_rule',
      rule: 'RULE_PR_CONFIG_CHANGED_WITHOUT_DOCS',
      recommendation: 'Document the new environment variables in .env.example and repository configuration docs.',
    });
  }

  if (publicApiChangesWithoutDocs.length > 0) {
    findings.push({
      id: 'PR-DOC-API-CHANGED',
      category: 'api',
      severity: 'info',
      confidence: 'medium',
      title: 'Public API Route Modified Without Documentation Update',
      description: `PR alters public API routes (${publicApiChangesWithoutDocs.slice(0, 2).join(', ')}) without updating API documentation.`,
      impact: 'API consumers may encounter unannounced contract changes.',
      file: publicApiChangesWithoutDocs[0],
      evidence: {
        summary: `Changed API files: ${publicApiChangesWithoutDocs.join(', ')}`,
        filePath: publicApiChangesWithoutDocs[0],
      },
      source: 'deterministic_rule',
      rule: 'RULE_PR_PUBLIC_API_CHANGED',
      recommendation: 'Ensure external API contract changes and responses are documented in OpenAPI specs or developer docs.',
    });
  }

  const status: DocumentationImpact['status'] =
    newConfigOrEnvVarsWithoutDocs.length > 0 ? 'warning' : 'adequate';

  const summary =
    newConfigOrEnvVarsWithoutDocs.length > 0
      ? `Detected ${newConfigOrEnvVarsWithoutDocs.length} undocumented environment variables.`
      : hasDocChange
      ? 'PR includes documentation updates alongside code changes.'
      : 'No critical documentation discrepancies detected.';

  return {
    impact: {
      summary,
      status,
      publicApiChangesWithoutDocs,
      newConfigOrEnvVarsWithoutDocs,
    },
    findings,
  };
}
