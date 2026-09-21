# DevPilot Production Phase 2
# Authentication + Authorization Report

## Baseline

- **Branch:** `devpilot-stitch-ui`
- **Commit:** `f8d8538`
- **Tests:** 302 passed
- **TypeScript:** 0 errors
- **Lint:** 0 warnings/errors
- **Build:** Success (Clean Next.js 14 production bundle)

---

## Authentication

- **Provider:** GitHub OAuth 2.0 (Authorization Code Grant with PKCE / CSRF State).
- **Session Strategy:** High-entropy 256-bit cryptographically secure session tokens generated via `crypto.randomBytes(32)`. Stored in PostgreSQL `sessions` table (with in-memory fallback cache) keyed to authenticated user IDs with a 7-day sliding TTL.
- **Cookie Strategy:** Server-side `devpilot_session` cookie configured with `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` (in production). No tokens are ever exposed to client JavaScript or stored in `localStorage` or `sessionStorage`.

---

## User Persistence

- **Tables:**
  - `users`: Stores internal user ID (`usr_...`), external `github_id`, `github_login`, `display_name`, `email`, `avatar_url`, global `role`, and timestamps.
  - `sessions`: Stores `session_id`, `user_id`, `created_at`, `expires_at`, and `last_active_at`.
  - `repository_memberships`: Stores `user_id`, `repository_id`, `role` (`OWNER`, `MEMBER`, `VIEWER`), and timestamps.
- **Constraints:**
  - `users.github_id` UNIQUE
  - `users.github_login` UNIQUE
  - `repository_memberships (user_id, repository_id)` UNIQUE composite primary / unique key
  - Foreign key cascades on `sessions.user_id -> users.id` and `repository_memberships.user_id -> users.id`.

---

## Authorization

- **Roles:**
  - `OWNER`: Full administrative access (view, analyze, Q&A, engineering, security, PR review, propose fix, approve fix, manage members).
  - `MEMBER`: Engineering access (view, analyze, Q&A, engineering, security, PR review, propose fix).
  - `VIEWER`: Read-only inspection (view, analyze, Q&A).
- **Permissions Matrix:**
  - `view`: Allowed for OWNER, MEMBER, VIEWER.
  - `analyze`: Allowed for OWNER, MEMBER, VIEWER.
  - `qa`: Allowed for OWNER, MEMBER, VIEWER.
  - `engineering`: Allowed for OWNER, MEMBER.
  - `security`: Allowed for OWNER, MEMBER.
  - `pr_review`: Allowed for OWNER, MEMBER.
  - `propose_fix`: Allowed for OWNER, MEMBER.
  - `approve_fix`: Allowed for OWNER only.
  - `manage_members`: Allowed for OWNER only.

---

## Repository Access

- **Membership Model:** Explicit user-to-repository mapping via `repository_memberships`. In addition, repository owner matching the user's `github_login` automatically inherits OWNER privileges. Unauthenticated or non-member users attempting access to private or foreign repositories are rejected with HTTP 403 / 404.

---

## API Protection

- **Protected Endpoints:**
  - `/api/repository/ask` (requires `qa` permission)
  - `/api/repository/engineering` (requires `engineering` permission)
  - `/api/repository/security` (requires `security` permission)
  - `/api/repository/fix` (requires `propose_fix` permission)
  - `/api/repository/fix/apply` (requires `approve_fix` permission)
  - `/api/agent/run` (requires `engineering` permission)
  - `/api/agent/approve` (requires `approve_fix` permission)
  - `/api/codebase/analyze` (requires `analyze` permission)
  - `/api/github/pull-request/review` (requires `pr_review` permission)
- **Public & Excluded Endpoints:**
  - `/api/health` (Unauthenticated liveness probe)
  - `/api/auth/github` & `/api/auth/callback` (OAuth handshake endpoints)
  - `/api/auth/session` (Returns public user profile or null)
  - `/api/github/webhook` (Independently authenticated via HMAC-SHA256 signature verification)

---

## IDOR Testing

- **Result: PASS**
- **Validation:** Attempting cross-user resource access (e.g., User A accessing Repository B without membership) throws `AuthError(403, 'FORBIDDEN')` before any AST lookup, file ingestion, or database query is performed. Repository data, AST graphs, and RAG vectors are completely shielded.

---

## RAG Authorization

- **Result: PASS**
- **Validation:** RAG Q&A retrieval via `/api/repository/ask` verifies user session and repo access *before* querying vectors or synthesizing grounded LLM responses. Unauthorized queries are blocked prior to vector retrieval.

---

## Agent Authorization

- **Result: PASS**
- **Validation:** Autonomous agent invocation via `/api/agent/run` enforces `requireAuth` and repository authorization on initiation and inside each tool execution. Mutating actions require explicit OWNER approval tokens.

---

## Fix Authorization

- **Result: PASS**
- **Validation:** Patch proposals require `propose_fix` permission. Applying patches via `/api/repository/fix/apply` requires `approve_fix` (OWNER-only) and validates SHA-256 diff hash against current commit SHA.

---

## PR Authorization

- **Result: PASS**
- **Validation:** Automated PR review verifies repository membership and prevents reviewing PRs belonging to unauthorized repositories or foreign targets.

---

## OAuth Security

- **State Validation:** Employs high-entropy cryptographic CSRF state token stored in a short-lived cookie (`devpilot_oauth_state`). The callback strictly rejects missing or mismatched state parameters.
- **Redirect Validation:** OAuth redirect URI is validated against configured host origins, preventing open redirect vulnerabilities.
- **Error Handling:** OAuth errors return sanitized client error messages without leaking client secrets, tokens, or internal tracebacks.

---

## Logout

- **Result: PASS**
- **Validation:** `POST /api/auth/logout` invalidates the server-side session in the database/store and sets an expired `devpilot_session` cookie (`Max-Age=0`). Subsequent requests with the old session token receive HTTP 401 Unauthorized.

---

## Browser Testing

- **Result: PASS (58/58 flows verified)**
- **Workflows Verified:**
  - Unauthenticated landing page & sign-in call-to-action
  - Active session header with user avatar, name, and GitHub login
  - Repository switching and overview analysis
  - Codebase AST viewer and symbol inspector
  - Grounded Q&A with verified line-range citations
  - Engineering health and circular dependency graphs
  - 6-Layer Security intelligence scanner
  - Pull request review and diff inspection
  - Autonomous Agent workflows with execution budgets
  - Settings, Audit logs, and Profile evaluation
  - Secure logout flow invalidating session

---

## Automated Tests

- **Total Test Suites:** 58 passed (58 total)
- **Total Tests:** 322 passed (322 total)
- **Failed:** 0
- **New Tests Added (Phase 2):** 20 tests (`AUTH-001` through `AUTH-020`) covering session lifecycle, RBAC roles, permission boundaries, IDOR isolation, OAuth state security, webhook independence, and cookie attributes.

---

## Security Audit

- **Result: PASS (Zero Critical/High/Medium Vulnerabilities)**
- `NEXT_PUBLIC_*` secrets: None found.
- Client token exposure: Zero tokens in localStorage/sessionStorage.
- Parameter tampering: Server session is the sole source of identity truth; request body `userId` parameters are strictly ignored.
- Error sanitization: All auth errors return structured JSON with safe user-facing error messages without database or stack leakage.

---

## Remaining Risks

- **Server-wide GitHub PAT:** The ingestion engine currently uses a server-level `GITHUB_TOKEN` for public repository API rate limits. Scoped user installation tokens will be introduced in the GitHub App phase.

---

## Deferred

- **Redis:** Deferred to Production Phase 3 (Distributed Rate Limiting & Multi-Instance Caching).
- **BullMQ:** Deferred to Production Phase 3 (Distributed Job Queues & Worker Isolation).
- **GitHub App:** Deferred to Production Phase 4 (Granular Org/Repo Installation Tokens).
- **OpenTelemetry:** Deferred to Production Phase 4 (Distributed Tracing & APM).
- **Prometheus:** Deferred to Production Phase 4 (Metrics Scraping & SLI/SLA Dashboards).
- **SSE (Server-Sent Events):** Deferred to Production Phase 4 (Streaming Ingestion & Real-Time Agent Logs).
