# DevPilot Production Action Plan

This action plan details the step-by-step engineering roadmap to transition DevPilot from its current in-memory reference prototype to an enterprise-grade, horizontally scalable, multi-tenant developer platform.

---

## 1. Action Matrix

| Priority | Area | Problem | Evidence | Recommended Change | Complexity | Dependency | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CRITICAL** | Persistence | Ephemeral in-memory vector store & AST data lost on restart | `src/lib/rag/vectorStore.ts:15` (`Map<string, VectorRecord[]>`) | Deploy PostgreSQL 16 with `pgvector`; implement Prisma / Drizzle ORM models for repositories, chunks, and embeddings | **HIGH** | None | **PLANNED** |
| **CRITICAL** | Auth | Unauthenticated API endpoints; no user sessions | `src/app/api/repository/*/route.ts` (0 auth checks) | Integrate NextAuth.js / Auth.js with GitHub OAuth 2.0 and secure HTTP-only session cookies | **MEDIUM** | PostgreSQL | **PLANNED** |
| **CRITICAL** | GitHub | Single server-wide PAT exhausts 5,000 req/hr rate limit | `src/lib/repository/repositoryIngestor.ts:13` (`process.env.GITHUB_TOKEN`) | Implement GitHub App with per-installation token generation and granular repository scopes | **HIGH** | Auth | **PLANNED** |
| **CRITICAL** | Workers | Ingestion and agent runs execute in synchronous HTTP request loop | `src/lib/webhook/jobManager.ts:25` (In-process execution) | Offload compute tasks to Redis + BullMQ background worker pool with SSE status updates | **HIGH** | Redis | **PLANNED** |
| **HIGH** | Security | In-memory human approvals lost on pod restart | `src/lib/agent/memory.ts:28` (`Map<string, AgentProposedAction[]>`) | Store fix proposals, diff hashes, and approval status in PostgreSQL audit table | **MEDIUM** | PostgreSQL | **PLANNED** |
| **HIGH** | Authorization | No Role-Based Access Control (RBAC) or repo permission checks | `src/app/api/agent/run/route.ts` | Add RBAC middleware verifying user's GitHub org role before allowing agent execution | **MEDIUM** | Auth | **PLANNED** |
| **HIGH** | Rate Limiting | In-memory request coalescing does not scale across multiple replicas | `src/lib/repository/repositoryIngestor.ts:40` | Implement distributed token-bucket rate limiting via Redis (`ioredis` + `rate-limiter-flexible`) | **LOW** | Redis | **PLANNED** |
| **HIGH** | Health | Health probe combines liveness and readiness without DB checks | `src/app/api/health/route.ts:38` (`isHealthy = true`) | Split into `/api/health/liveness` and `/api/health/readiness` with real DB/Redis ping checks | **LOW** | PostgreSQL | **PLANNED** |
| **HIGH** | CI/CD | CI does not build or publish Docker images to container registry | `.github/workflows/ci.yml` | Add GitHub Actions workflow to build, tag, and publish Docker images to GHCR/ECR | **LOW** | None | **PLANNED** |
| **MEDIUM** | Observability | Missing OpenTelemetry distributed tracing and Prometheus metrics | `src/lib/logger.ts` (JSON console only) | Add OpenTelemetry SDK with W3C `traceparent` propagation and `/api/metrics` endpoint | **MEDIUM** | None | **PLANNED** |
| **MEDIUM** | UX / Streaming | LLM answers return as monolithic JSON payloads | `src/app/api/repository/ask/route.ts` | Migrate Q&A and Agent routes to Server-Sent Events (SSE) / Vercel AI SDK streaming | **MEDIUM** | None | **PLANNED** |
| **MEDIUM** | Webhooks | Webhook delivery logs stored only in RAM (500 limit) | `src/lib/webhook/jobManager.ts:43` | Persist raw webhook payloads and delivery IDs in PostgreSQL for replay and debugging | **LOW** | PostgreSQL | **PLANNED** |
| **MEDIUM** | Cost Controls | Missing token usage tracking and user cost quotas | `src/lib/env.ts` | Record prompt/completion token usage per user/org and enforce monthly budget caps | **LOW** | PostgreSQL | **PLANNED** |
| **LATER** | AI Providers | No support for local / self-hosted open-source LLMs | `src/lib/env.ts` (Gemini & OpenAI only) | Implement Ollama / vLLM / LiteLLM proxy adapters for on-premise air-gapped deployments | **MEDIUM** | None | **PLANNED** |
| **LATER** | IDE Bridge | DevPilot accessible only via web browser | N/A | Develop VS Code and JetBrains extension bridges connecting to DevPilot API Gateway | **HIGH** | Auth | **PLANNED** |

---

## 2. Execution Phases & Milestones

### Phase A: Persistence & Core Infrastructure (Sprint 1–2)
- Provision Managed PostgreSQL 16 with `pgvector` and Managed Redis Cluster.
- Set up Prisma / Drizzle ORM schema and migrations.
- Migrate `RepositoryVectorStore` to execute SQL vector similarity queries via `pgvector`.
- Migrate `WebhookJobManager` and `CodeFixEngine` to PostgreSQL tables.

### Phase B: Identity, Multi-Tenancy & GitHub App (Sprint 3–4)
- Register DevPilot GitHub App and configure OAuth redirect URLs and Webhook events.
- Implement NextAuth.js authentication flow with GitHub provider.
- Implement repository access verification middleware using GitHub App installation tokens.
- Add organization and user RBAC policies.

### Phase C: Background Workers & Distributed Scaling (Sprint 5–6)
- Spin up BullMQ worker service container.
- Move repository ingestion, AST extraction, embedding generation, and ReAct agent loops to BullMQ queues.
- Implement WebSocket / SSE real-time progress events for the Stitch UI.
- Set up Redis distributed rate limiting and mutual exclusion locks.

### Phase D: Enterprise Observability & Deployment Automation (Sprint 7–8)
- Configure OpenTelemetry tracing, Prometheus `/metrics`, and Grafana dashboards.
- Build automated Kubernetes Helm charts and Terraform AWS ECS / EKS modules.
- Finalize SOC 2 / GDPR data retention and deletion pipelines.
