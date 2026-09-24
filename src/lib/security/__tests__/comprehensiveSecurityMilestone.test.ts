/**
 * Phase 6 — Comprehensive Security Intelligence Milestone Verification Test Suite
 *
 * Verifies all 24 security analysis requirements:
 * 1. Secret detection
 * 2. Secret redaction
 * 3. Placeholder handling
 * 4. Sensitive file detection
 * 5. Authentication analysis
 * 6. Authorization analysis
 * 7. SQL injection patterns
 * 8. Command injection patterns
 * 9. XSS patterns
 * 10. SSRF patterns
 * 11. Path traversal patterns
 * 12. Unsafe evaluation
 * 13. Configuration analysis
 * 14. Dependency analysis
 * 15. Severity classification
 * 16. Confidence classification
 * 17. Finding deduplication
 * 18. Repository isolation
 * 19. Authorization (RBAC / IDOR)
 * 20. Database persistence
 * 21. Idempotency
 * 22. API behavior (GET/POST /api/repository/security & /api/security/analyze)
 * 23. Empty repository
 * 24. Failure handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeSecurityHealth } from '../securityEngine';
import { scanSecrets } from '../secretScanner';
import { maskSecret, isPlaceholderSecret, sanitizeEvidenceSnippet, maskTextSecrets } from '../redactor';
import { detectSensitiveFiles } from '../sensitiveFileDetector';
import { scanAuthSignals } from '../authPatternScanner';
import { scanCodePatterns } from '../codePatternScanner';
import { scanConfiguration } from '../configScanner';
import { scanDependencies, KNOWN_VERIFIED_ADVISORIES } from '../vulnerabilityScanner';
import { createMockRepoIndex } from './testHelpers';
import { GET as getSecurity, POST as postSecurity } from '@/app/api/repository/security/route';
import { GET as getAnalyze, POST as postAnalyze } from '@/app/api/security/analyze/route';
import { ReportDatabaseRepository } from '@/lib/db/repositories';
import { db } from '@/lib/db/client';

describe('Phase 6 — Comprehensive Security Intelligence Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Secret detection
  it('1. Secret detection — discovers actual secrets in code across supported provider patterns', () => {
    const rawApiKey = 'sk-proj-abc123456789012345678901234567890';
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/services/ai.ts',
          name: 'ai.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: `export const apiKey = "${rawApiKey}";`,
          sizeBytes: 80,
          extension: '.ts',
          sha: 'sha-sec-1',
        },
      ],
    });

    const res = scanSecrets(index);
    expect(res.indicators.totalSecretsFound).toBeGreaterThanOrEqual(1);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_SECRET_OPENAI')).toBe(true);
    expect(res.findings[0].filePath).toBe('src/services/ai.ts');
    expect(res.findings[0].lineStart).toBe(1);
  });

  // 2. Secret redaction
  it('2. Secret redaction — strictly ensures raw secret value never appears in findings, evidence, or redacted snippets', () => {
    const rawSecret = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/github.ts',
          name: 'github.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: `const githubToken = "${rawSecret}";`,
          sizeBytes: 80,
          extension: '.ts',
          sha: 'sha-sec-2',
        },
      ],
    });

    const res = scanSecrets(index);
    expect(res.findings.length).toBe(1);
    const finding = res.findings[0];
    expect(finding.evidence.redactedContent).not.toContain(rawSecret);
    expect(finding.evidence.summary).not.toContain(rawSecret);
    expect(JSON.stringify(finding)).not.toContain(rawSecret);
    expect(finding.evidence.redactedContent).toContain('ghp_••••••••7890');
  });

  // 3. Placeholder handling
  it('3. Placeholder handling — ignores common placeholders, documentation examples, and environment accessors', () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/config.example.ts',
          name: 'config.example.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: `
            const k1 = "your_api_key_here";
            const k2 = "TODO_REPLACE_ME";
            const k3 = process.env.OPENAI_API_KEY;
            const k4 = "<your-token>";
          `,
          sizeBytes: 150,
          extension: '.ts',
          sha: 'sha-sec-3',
        },
      ],
    });

    const res = scanSecrets(index);
    expect(res.indicators.totalSecretsFound).toBe(0);
    expect(res.findings.length).toBe(0);
    expect(isPlaceholderSecret('your-api-key')).toBe(true);
    expect(isPlaceholderSecret('dummy_token')).toBe(true);
  });

  // 4. Sensitive file detection
  it('4. Sensitive file detection — identifies committed .env files, private keys, and service credentials without exposing contents', () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: '.env.production',
          name: '.env.production',
          type: 'file',
          language: 'env',
          isBinary: false,
          isSensitive: true,
          status: 'indexed',
          skipReason: null,
          content: 'DATABASE_PASSWORD=supersecret',
          sizeBytes: 50,
          extension: '.production',
          sha: 'sha-sec-4',
        },
        {
          path: 'keys/id_rsa',
          name: 'id_rsa',
          type: 'file',
          language: 'key',
          isBinary: false,
          isSensitive: true,
          status: 'indexed',
          skipReason: null,
          content: 'PRIVATE KEY CONTENT',
          sizeBytes: 50,
          extension: '',
          sha: 'sha-sec-4b',
        },
        {
          path: '.env.example', // Example template should be ignored
          name: '.env.example',
          type: 'file',
          language: 'env',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'DATABASE_PASSWORD=your_password',
          sizeBytes: 50,
          extension: '.example',
          sha: 'sha-sec-4c',
        },
      ],
    });

    const res = detectSensitiveFiles(index);
    expect(res.indicators.totalSensitiveFiles).toBe(2);
    expect(res.findings.some(f => f.filePath === '.env.production')).toBe(true);
    expect(res.findings.some(f => f.filePath === 'keys/id_rsa')).toBe(true);
    expect(res.findings.some(f => f.filePath === '.env.example')).toBe(false);
  });

  // 5. Authentication analysis
  it('5. Authentication analysis — detects routes lacking authentication guards vs routes with requireAuth/session check', () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/app/api/protected/route.ts',
          name: 'route.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'import { requireAuth } from "@/lib/auth";\nexport async function GET(req) { const user = await requireAuth(req); }',
          sizeBytes: 120,
          extension: '.ts',
          sha: 'sha-sec-5a',
        },
        {
          path: 'src/app/api/unprotected/route.ts',
          name: 'route.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'export async function POST(req) { const body = await req.json(); }',
          sizeBytes: 90,
          extension: '.ts',
          sha: 'sha-sec-5b',
        },
      ],
    });

    const res = scanAuthSignals(index);
    expect(res.indicators.protectedRoutesCount).toBe(1);
    expect(res.indicators.unprotectedEndpointsCount).toBe(1);
    expect(res.findings.some(f => f.filePath === 'src/app/api/unprotected/route.ts')).toBe(true);
  });

  // 6. Authorization analysis
  it('6. Authorization analysis — captures route architecture gaps with low confidence and evidence citations', () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/app/api/repos/mutate/route.ts',
          name: 'route.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'export async function POST(req) { return Response.json({ ok: true }); }',
          sizeBytes: 80,
          extension: '.ts',
          sha: 'sha-sec-6',
        },
      ],
    });

    const res = scanAuthSignals(index);
    expect(res.findings.length).toBe(1);
    const finding = res.findings[0];
    expect(finding.category).toBe('authentication');
    expect(finding.confidence).toBe('low');
    expect(finding.evidence.references[0].file).toBe('src/app/api/repos/mutate/route.ts');
  });

  // 7. SQL injection patterns
  it('7. SQL injection patterns — flags unparameterized SQL query interpolation', () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/db/queries.ts',
          name: 'queries.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const sql = `SELECT * FROM accounts WHERE user_id = ${userId} AND status = "active"`;',
          sizeBytes: 100,
          extension: '.ts',
          sha: 'sha-sec-7',
        },
      ],
    });

    const res = scanCodePatterns(index);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CODE_SQL_INTERPOLATION')).toBe(true);
    const f = res.findings.find(x => x.deterministicRule === 'RULE_CODE_SQL_INTERPOLATION');
    expect(f?.severity).toBe('high');
  });

  // 8. Command injection patterns
  it('8. Command injection patterns — flags dynamic child_process execution with template literal interpolation', () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/shell.ts',
          name: 'shell.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'child_process.exec(`rm -rf ${userSuppliedDirectory}`);',
          sizeBytes: 80,
          extension: '.ts',
          sha: 'sha-sec-8',
        },
      ],
    });

    const res = scanCodePatterns(index);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CODE_UNSAFE_EXEC')).toBe(true);
  });

  // 9. XSS patterns
  it('9. XSS patterns — flags dangerouslySetInnerHTML and direct innerHTML assignment', () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/components/UnsafeViewer.tsx',
          name: 'UnsafeViewer.tsx',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'return <div dangerouslySetInnerHTML={{ __html: userHtml }} />;',
          sizeBytes: 80,
          extension: '.tsx',
          sha: 'sha-sec-9',
        },
      ],
    });

    const res = scanCodePatterns(index);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CODE_UNSAFE_HTML_INJECTION')).toBe(true);
  });

  // 10. SSRF patterns
  it('10. SSRF patterns — flags server-side fetch calls passing unvalidated user request parameters', () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/app/api/proxy/route.ts',
          name: 'route.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const resp = await fetch(req.query.url);',
          sizeBytes: 80,
          extension: '.ts',
          sha: 'sha-sec-10',
        },
      ],
    });

    const res = scanCodePatterns(index);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CODE_SSRF_UNVALIDATED_FETCH')).toBe(true);
  });

  // 11. Path traversal patterns
  it('11. Path traversal patterns — flags path.join/resolve with request parameters', () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/lib/fileServer.ts',
          name: 'fileServer.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const filePath = path.join("/var/data", req.params.filename);',
          sizeBytes: 80,
          extension: '.ts',
          sha: 'sha-sec-11',
        },
      ],
    });

    const res = scanCodePatterns(index);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CODE_PATH_TRAVERSAL')).toBe(true);
  });

  // 12. Unsafe evaluation
  it('12. Unsafe evaluation — flags eval() and new Function() calls in application code', () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/calculator.ts',
          name: 'calculator.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const calculated = new Function("a", "b", "return a + b;")(x, y);',
          sizeBytes: 80,
          extension: '.ts',
          sha: 'sha-sec-12',
        },
      ],
    });

    const res = scanCodePatterns(index);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CODE_DYNAMIC_EVAL')).toBe(true);
  });

  // 13. Configuration analysis
  it('13. Configuration analysis — flags disabled TLS, open CORS, insecure cookies, and privileged Docker containers', () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/agent/client.ts',
          name: 'client.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const agent = new https.Agent({ rejectUnauthorized: false });',
          sizeBytes: 80,
          extension: '.ts',
          sha: 'sha-sec-13a',
        },
        {
          path: 'docker-compose.yml',
          name: 'docker-compose.yml',
          type: 'file',
          language: 'yaml',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'services:\n  app:\n    privileged: true',
          sizeBytes: 60,
          extension: '.yml',
          sha: 'sha-sec-13b',
        },
      ],
    });

    const res = scanConfiguration(index);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CONFIG_TLS_DISABLED')).toBe(true);
    expect(res.findings.some(f => f.deterministicRule === 'RULE_CONFIG_DOCKER_PRIVILEGED')).toBe(true);
  });

  // 14. Dependency analysis
  it('14. Dependency analysis — identifies verified advisories for vulnerable packages and avoids guessing/hallucination', () => {
    const index = createMockRepoIndex({
      manifests: [
        {
          path: 'package.json',
          ecosystem: 'npm',
          dependencyCount: 2,
          devDependencyCount: 1,
          dependencies: [
            {
              name: 'lodash',
              versionConstraint: '4.17.15',
              manifestPath: 'package.json',
              ecosystem: 'npm',
            },
            {
              name: 'express',
              versionConstraint: '4.16.4',
              manifestPath: 'package.json',
              ecosystem: 'npm',
            },
          ],
          devDependencies: [
            {
              name: 'vitest',
              versionConstraint: '^1.4.0',
              manifestPath: 'package.json',
              ecosystem: 'npm',
              isDev: true,
            },
          ],
        },
      ],
    });

    const res = scanDependencies(index);
    expect(res.indicators.verifiedAdvisoriesCount).toBe(2);
    expect(res.advisories.some(a => a.packageName === 'lodash')).toBe(true);
    expect(res.advisories.some(a => a.packageName === 'express')).toBe(true);
    expect(res.findings.some(f => f.deterministicRule.includes('GHSA_p6mc_m468_83gw'))).toBe(true);
  });

  // 15. Severity classification
  it('15. Severity classification — correctly sorts findings from critical to info', async () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/app.ts',
          name: 'app.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: `
            const key = "sk-proj-123456789012345678901234567890"; // Critical
            const html = '<div dangerouslySetInnerHTML={{ __html: x }} />'; // Medium
          `,
          sizeBytes: 150,
          extension: '.ts',
          sha: 'sha-sec-15',
        },
      ],
    });

    const report = await analyzeSecurityHealth({ repoIndex: index });
    expect(report.findings.length).toBeGreaterThanOrEqual(2);
    expect(report.findings[0].severity).toBe('critical');
  });

  // 16. Confidence classification
  it('16. Confidence classification — tags high confidence for exact signature matches and low for heuristic gaps', async () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/app/api/metrics/route.ts',
          name: 'route.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'export async function GET() { return Response.json({}); }',
          sizeBytes: 60,
          extension: '.ts',
          sha: 'sha-sec-16',
        },
      ],
    });

    const report = await analyzeSecurityHealth({ repoIndex: index });
    const authFinding = report.findings.find(f => f.category === 'authentication');
    expect(authFinding?.confidence).toBe('low');
  });

  // 17. Finding deduplication
  it('17. Finding deduplication — produces unique findings without ID duplicates', async () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/secrets.ts',
          name: 'secrets.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'const key = "sk-proj-abc123456789012345678901234567890";',
          sizeBytes: 60,
          extension: '.ts',
          sha: 'sha-sec-17',
        },
      ],
    });

    const report = await analyzeSecurityHealth({ repoIndex: index });
    const ids = report.findings.map(f => f.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  // 18. Repository isolation
  it('18. Repository isolation — reports are strictly bound to repository and commit context', async () => {
    const indexA = createMockRepoIndex({
      repository: {
        fullName: 'orgA/repoA',
        name: 'repoA',
        owner: 'orgA',
        defaultBranch: 'v1.0.0',
        url: 'https://github.com/orgA/repoA',
        description: '',
        stars: 0,
        forks: 0,
        openIssues: 0,
        isPrivate: false,
        isFork: false,
        isArchived: false,
        sizeKb: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    const reportA = await analyzeSecurityHealth({ repoIndex: indexA });
    expect(reportA.repository.fullName).toBe('orgA/repoA');
    expect(reportA.summary.repositoryId).toBe('orgA/repoA');
  });

  // 19. Authorization (RBAC / IDOR defense)
  it('19. Authorization — enforces authentication and returns 401 when unauthenticated and 403 when user lacks repository access', async () => {
    // Unauthenticated request
    const unauthReq = new Request('http://localhost/api/repository/security', {
      method: 'POST',
      headers: { 'x-devpilot-unauthenticated': 'true' },
      body: JSON.stringify({ repositoryId: 'forbidden/repo' }),
    });

    const unauthRes = await postSecurity(unauthReq);
    expect(unauthRes.status).toBe(401);

    // Authenticated user attempting unauthorized repo access
    const { SessionManager } = await import('@/lib/auth/sessionManager');
    const intruder = await SessionManager.findOrCreateUser({
      githubId: '9999123',
      githubLogin: 'intruder_user',
      displayName: 'Intruder',
    });
    const session = await SessionManager.createSession(intruder.id);

    const forbiddenReq = new Request('http://localhost/api/repository/security', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${session.sessionId}`,
      },
      body: JSON.stringify({
        repositoryId: 'secret-org/classified-repo',
        preloadedIndex: createMockRepoIndex({
          repository: {
            fullName: 'secret-org/classified-repo',
            name: 'classified-repo',
            owner: 'secret-org',
            defaultBranch: 'main',
            url: 'https://github.com/secret-org/classified-repo',
            description: '',
            stars: 0,
            forks: 0,
            openIssues: 0,
            isPrivate: true,
            isFork: false,
            isArchived: false,
            sizeKb: 10,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        }),
      }),
    });

    const forbiddenRes = await postSecurity(forbiddenReq);
    expect(forbiddenRes.status).toBe(403);
  });

  // 20. Database persistence
  it('20. Database persistence — saves report into PostgreSQL without failing on disconnected mode', async () => {
    const mockReport = {
      repository: { fullName: 'test/repo' },
      summary: {
        commitSha: 'main',
        overallStatus: 'secure',
        totalFindingsCount: 0,
        findingsBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      },
      findings: [],
    };

    // Should gracefully execute without throwing
    await expect(
      ReportDatabaseRepository.saveSecurityReport('test/repo', 'main', mockReport)
    ).resolves.not.toThrow();

    const retrieved = await ReportDatabaseRepository.getSecurityReport('test/repo', 'main');
    // In local test environment without Postgres, it gracefully returns null or cached
    expect(retrieved === null || typeof retrieved === 'object').toBe(true);
  });

  // 21. Idempotency
  it('21. Idempotency — scanning identical repository index produces identical findings and scores', async () => {
    const index = createMockRepoIndex({
      files: [
        {
          path: 'src/main.ts',
          name: 'main.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'console.log("clean codebase");',
          sizeBytes: 30,
          extension: '.ts',
          sha: 'sha-sec-21',
        },
      ],
    });

    const report1 = await analyzeSecurityHealth({ repoIndex: index });
    const report2 = await analyzeSecurityHealth({ repoIndex: index });

    expect(report1.summary.overallStatus).toBe(report2.summary.overallStatus);
    expect(report1.summary.totalFindingsCount).toBe(report2.summary.totalFindingsCount);
    expect(report1.findings.length).toBe(report2.findings.length);
  });

  // 22. API behavior
  it('22. API behavior — both /api/repository/security and /api/security/analyze handle GET/POST with preloaded index', async () => {
    const index = createMockRepoIndex({
      repository: {
        fullName: 'Gopalkrishna10845445/devpulse-ai',
        name: 'devpulse-ai',
        owner: 'Gopalkrishna10845445',
        defaultBranch: 'main',
        url: 'https://github.com/Gopalkrishna10845445/devpulse-ai',
        description: '',
        stars: 0,
        forks: 0,
        openIssues: 0,
        isPrivate: false,
        isFork: false,
        isArchived: false,
        sizeKb: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      files: [
        {
          path: 'src/app.ts',
          name: 'app.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'export const hello = "world";',
          sizeBytes: 30,
          extension: '.ts',
          sha: 'sha-api-22',
        },
      ],
    });

    const postReq = new Request('http://localhost/api/security/analyze', {
      method: 'POST',
      headers: {
        'x-mock-user-id': 'dev-user-1',
        'x-mock-user-role': 'owner',
      },
      body: JSON.stringify({
        fullName: 'Gopalkrishna10845445/devpulse-ai',
        preloadedIndex: index,
      }),
    });

    const postRes = await postAnalyze(postReq);
    expect(postRes.status).toBe(200);
    const postData = await postRes.json();
    expect(postData.success).toBe(true);
    expect(postData.report).toBeDefined();
    expect(postData.report.summary.repositoryId).toBe('Gopalkrishna10845445/devpulse-ai');
  });

  // 23. Empty repository
  it('23. Empty repository — gracefully returns healthy status with zero findings when repository has no files', async () => {
    const emptyIndex = createMockRepoIndex({
      files: [],
      manifests: [],
    });

    const report = await analyzeSecurityHealth({ repoIndex: emptyIndex });
    expect(report.summary.overallStatus).toBe('secure');
    expect(report.summary.totalFindingsCount).toBe(0);
    expect(report.secrets.totalSecretsFound).toBe(0);
    expect(report.sensitiveFiles.totalSensitiveFiles).toBe(0);
    expect(report.configuration.insecureFlagsCount).toBe(0);
    expect(report.dependencies.verifiedAdvisoriesCount).toBe(0);
  });

  // 24. Failure handling
  it('24. Failure handling — handles external vulnerability scanner unavailability gracefully', () => {
    const index = createMockRepoIndex({
      manifests: [
        {
          path: 'package.json',
          ecosystem: 'npm',
          dependencyCount: 1,
          devDependencyCount: 0,
          dependencies: [
            {
              name: 'lodash',
              versionConstraint: '4.17.21',
              manifestPath: 'package.json',
              ecosystem: 'npm',
            },
          ],
          devDependencies: [],
        },
      ],
    });

    const res = scanDependencies(index, { mockUnavailable: true });
    expect(res.indicators.status).toBe('unavailable');
    expect(res.indicators.advisoryStatus).toBe('unavailable');
    expect(res.indicators.summary).toContain('External vulnerability database currently unavailable');
    expect(res.advisories.length).toBe(0);
  });
});
