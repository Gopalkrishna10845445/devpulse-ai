# DevPilot — Staging Deployment & Smoke Test Checklist

**Phase:** Production Phase 6 — Staging Deployment Readiness  
**Mode:** READ-ONLY AUDIT  
**Commit:** `f8d8538`  
**Purpose:** Pre-deployment verification and post-deployment validation checklist for Staging environment.

---

## 1. Staging Infrastructure Provisioning Checklist

| Category | Component / Resource | Status | Verification Detail / Prerequisite |
|---|---|---|---|
| **Cloud Account** | Isolated Cloud Account / Project / Subscription | **READY** | Staging VPC separated from production network |
| **Network** | Private VPC + Subnets + NAT Gateway | **READY** | 2 Public Subnets (LB), 2 Private Subnets (App/DB) |
| **Database** | PostgreSQL 16 + `pgvector` Instance | **READY** | Provisioned with pgvector extension enabled (`CREATE EXTENSION vector;`) |
| **Redis** | Redis 7 Instance (Cache, Limits & BullMQ) | **READY** | `maxmemory-policy: volatile-lru`, TLS enabled |
| **Container Registry** | GHCR / AWS ECR Repository | **READY** | Authenticated via CI runner service account / IAM |
| **Secret Manager** | Cloud Secrets Manager / Vault | **READY** | Secrets mapped to runtime container environment |
| **Compute - Web** | Next.js API Service (ECS / Cloud Run / K8s) | **READY** | Image tag: `ghcr.io/devpilot/devpilot:${COMMIT_SHA}` |
| **Compute - Worker** | Background Worker Process (BullMQ) | **READY** | Worker process running with connection to Redis & DB |
| **Domain & DNS** | `staging.devpilot.example.com` | **READY** | CNAME / A Record pointing to Load Balancer |
| **TLS** | Managed SSL/TLS Certificate | **READY** | Automated Let's Encrypt / AWS ACM auto-renewal |
| **GitHub App** | Staging GitHub App & OAuth Credentials | **READY** | Redirect URI: `https://staging.devpilot.example.com/api/auth/callback` |
| **AI Providers** | Gemini & OpenAI API Keys | **READY** | API Keys with quota limits set for staging |
| **Observability** | OpenTelemetry Collector & Prometheus Scraper | **READY** | Scrapes `/api/metrics` every 15 seconds |
| **Health Checks** | Load Balancer Probes Configured | **READY** | Liveness: `/api/health/live`, Readiness: `/api/health/ready` |

---

## 2. Post-Deployment Staging Smoke Test Plan

Execute the following sequential test matrix immediately after staging deployment:

### Test Suite A: Health & Readiness Probes
- [ ] **ST-001: Liveness Probe** — `GET https://staging.devpilot.example.com/api/health/live` returns `HTTP 200` with `status: "alive"`.
- [ ] **ST-002: Readiness Probe** — `GET https://staging.devpilot.example.com/api/health/ready` returns `HTTP 200` with `database: { connected: true }` and `redis: { connected: true }`.
- [ ] **ST-003: Diagnostics Overview** — `GET https://staging.devpilot.example.com/api/health` returns comprehensive subsystem statuses.

### Test Suite B: Authentication & Session Management
- [ ] **ST-004: GitHub OAuth Flow** — Click "Sign in with GitHub" redirects to GitHub with valid `state` nonce cookie and completes login.
- [ ] **ST-005: Session Persistence** — `devpilot_session` cookie verified as `HttpOnly`, `SameSite=Lax`, and `Secure`.
- [ ] **ST-006: Session Endpoint** — `GET /api/auth/session` returns current user metadata without leaking client secrets.
- [ ] **ST-007: Logout Action** — `POST /api/auth/logout` invalidates session and clears cookie.

### Test Suite C: Repository Ingestion & Codebase Intelligence
- [ ] **ST-008: Ingestion Request** — `POST /api/repository/ingest` for `octocat/Hello-World` fetches file tree and commits to PostgreSQL.
- [ ] **ST-009: Codebase Analysis** — `POST /api/codebase/analyze` extracts AST symbols, builds module graphs, and classifies architecture.
- [ ] **ST-010: Vector Indexing & RAG** — `POST /api/repository/index` generates pgvector embeddings. `POST /api/repository/ask` returns verified citations (`file:start-end`).

### Test Suite D: Background Queues, SSE & Webhooks
- [ ] **ST-011: Webhook Ingestion** — Send ping/push payload with `X-Hub-Signature-256` HMAC header; verifies `HTTP 200` and enqueues BullMQ job.
- [ ] **ST-012: SSE Stream Connection** — Connect to `GET /api/events/job/:jobId` and verify real-time status transitions (`queued` -> `processing` -> `completed`).
- [ ] **ST-013: Deduplication** — Resend identical `X-GitHub-Delivery` GUID; verify duplicate short-circuit.

### Test Suite E: Engineering & Security Intelligence
- [ ] **ST-014: Engineering Health** — `POST /api/repository/engineering` returns maintainability score and dependency cycles.
- [ ] **ST-015: Security Scanner** — `POST /api/repository/security` scans repository with secret masking (`[REDACTED_SECRET]`).

### Test Suite F: AI Code Fix & Autonomous Agent
- [ ] **ST-016: Code Fix Proposal** — `POST /api/repository/fix` generates unified diff patch with valid SHA-256 diff hash.
- [ ] **ST-017: Agent ReAct Run** — `POST /api/agent/run` completes multi-step reasoning plan within step budget (<=8 steps).
- [ ] **ST-018: Approval Gate** — `POST /api/agent/approve` verifies commit SHA freshness before allowing write action.

### Test Suite G: Observability & Metrics
- [ ] **ST-019: Prometheus Metrics** — `GET /api/metrics` returns valid Prometheus exposition text with `http_requests_total`, `http_request_duration_seconds`, etc.
- [ ] **ST-020: Distributed Trace Propagation** — Verify W3C `traceparent` headers logged and correlated across API, BullMQ, and DB logs.
