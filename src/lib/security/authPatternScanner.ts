/**
 * Phase 6 — Authentication & Authorization Signal Scanner
 *
 * Reuses Phase 3 symbol and architecture intelligence to identify:
 * - Protected API routes and middleware guards
 * - Endpoints lacking a recognizable authentication check in the analyzed structure
 * - Roles/permission check patterns
 *
 * Adheres strictly to conservative wording: never claims a route is definitively
 * vulnerable solely from the absence of a recognized pattern.
 */

import { CodebaseIntelligence } from '../intelligence/types';
import { RepositoryIndex } from '../repository/types';
import { AuthIndicators, SecurityFinding } from './types';

const AUTH_IMPORT_PATTERNS = [
  /auth/i,
  /session/i,
  /jwt/i,
  /passport/i,
  /next-auth/i,
  /clerk/i,
  /supabase/i,
  /firebase.*auth/i,
  /guard/i,
  /permission/i,
  /role/i,
  /middleware/i,
  /token/i,
];

const AUTH_KEYWORD_PATTERNS = [
  /\bauthenticate\b/i,
  /\brequireAuth\b/i,
  /\bwithAuth\b/i,
  /\bgetServerSession\b/i,
  /\bverifyToken\b/i,
  /\bcheckPermission\b/i,
  /\bhasRole\b/i,
  /\bauthGuard\b/i,
  /\bisAuthenticated\b/i,
  /\bcurrentUser\b/i,
  /\bvalidateSession\b/i,
];

export function scanAuthSignals(
  repoIndex: RepositoryIndex,
  intelligence?: CodebaseIntelligence | null
): {
  indicators: AuthIndicators;
  findings: SecurityFinding[];
} {
  const findings: SecurityFinding[] = [];
  let protectedRoutesCount = 0;
  let unprotectedEndpointsCount = 0;

  if (!repoIndex || !repoIndex.files || repoIndex.files.length === 0) {
    return {
      indicators: {
        status: 'neutral',
        summary: 'No repository files available for authentication architecture analysis.',
        protectedRoutesCount: 0,
        unprotectedEndpointsCount: 0,
        findings: [],
      },
      findings: [],
    };
  }

  // Collect API routes from Phase 3 intelligence or repository files
  const apiFiles = (intelligence?.files || [])
    .filter(f => f.role === 'api_route' || f.filePath.includes('/api/') || f.filePath.includes('/routes/'))
    .map(f => f.filePath);

  // If no intelligence files, fallback to index
  const routePaths = apiFiles.length > 0
    ? apiFiles
    : repoIndex.files
        .map(f => f.path)
        .filter(p => (p.includes('/api/') || p.includes('/routes/') || p.includes('route.ts') || p.includes('route.js')) && !p.includes('test'));

  for (const routePath of routePaths) {
    const fileObj = repoIndex.files.find(f => f.path === routePath);
    if (!fileObj || !fileObj.content) continue;

    const content = fileObj.content;
    const fileIntel = intelligence?.files.find(f => f.filePath === routePath);

    // Check imports for auth packages
    const hasAuthImport = fileIntel
      ? fileIntel.imports.some(imp =>
          AUTH_IMPORT_PATTERNS.some(pat => pat.test(imp.importPath) || imp.importedSymbols.some(s => pat.test(s)))
        )
      : AUTH_IMPORT_PATTERNS.some(pat => pat.test(content));

    // Check content for auth guards
    const hasAuthCheck =
      hasAuthImport || AUTH_KEYWORD_PATTERNS.some(pat => pat.test(content));

    if (hasAuthCheck) {
      protectedRoutesCount++;
    } else {
      unprotectedEndpointsCount++;

      // Create an informational / low severity structural finding
      const findingId = `auth-unprotected-${routePath.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const finding: SecurityFinding = {
        id: findingId,
        category: 'authentication',
        severity: 'info',
        title: `Route has no detectable authentication guard: ${routePath}`,
        description: 'No recognizable authentication middleware, session validator, or token verification pattern was identified in this route handler structure.',
        impact: 'If this endpoint handles sensitive data or mutations, ensure it is intentionally public or protected at the edge/gateway level.',
        filePath: routePath,
        lineStart: 1,
        lineEnd: 1,
        deterministicRule: 'RULE_AUTH_NO_DETECTABLE_GUARD',
        confidence: 'low',
        recommendation: 'Verify whether this route is intentionally public. If protection is required, add authentication middleware or session verification.',
        source: 'repository_static',
        status: 'active',
        evidence: {
          type: 'architecture_gap',
          summary: `Static analysis detected no auth tokens or guard functions imported in '${routePath}'.`,
          redactedContent: `File: ${routePath}`,
          references: [
            {
              file: routePath,
              rule: 'RULE_AUTH_NO_DETECTABLE_GUARD',
            },
          ],
          data: {
            routePath,
          },
        },
      };

      findings.push(finding);
    }
  }

  let status: 'healthy' | 'warning' | 'neutral' = 'healthy';
  let summary = 'Authentication signals analyzed across repository routes.';

  if (routePaths.length === 0) {
    status = 'neutral';
    summary = 'No dedicated HTTP/API route entrypoints identified in repository structure.';
  } else if (unprotectedEndpointsCount > 0) {
    summary = `Identified ${protectedRoutesCount} protected route(s) and ${unprotectedEndpointsCount} endpoint(s) with no detectable auth guard in the analyzed structure.`;
    status = unprotectedEndpointsCount > protectedRoutesCount && routePaths.length > 3 ? 'warning' : 'healthy';
  } else {
    summary = `All ${protectedRoutesCount} analyzed API route(s) incorporate detectable authentication or session guard patterns.`;
  }

  return {
    indicators: {
      status,
      summary,
      protectedRoutesCount,
      unprotectedEndpointsCount,
      findings,
    },
    findings,
  };
}
