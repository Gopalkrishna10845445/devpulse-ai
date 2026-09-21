# DevPilot — AI-Powered Developer & Codebase Intelligence Platform

DevPilot is an operating system and intelligence engine for modern software repositories. It unifies AST-level codebase analysis, commit-aware semantic RAG, deterministic engineering and security audits, automated pull request review, webhook event pipelines, and a bounded autonomous developer agent under a unified, high-assurance architecture.

---

## Key Capabilities

- **Repository Ingestion & Indexing (Phases 1–2):** Fetches repository trees, applies strict size bounds, detects languages and architectural frameworks, and generates commit-aware structural indexes.
- **Codebase Intelligence & Symbol Graphs (Phase 3):** Parses symbols (functions, classes, interfaces, types) across TypeScript, JavaScript, Python, and Go, builds import dependency graphs, and classifies architectural topology.
- **Grounded Codebase RAG & Q&A (Phase 4):** Semantic chunking with vector retrieval and verified line-range citations (`file:start-end`), rejecting unsubstantiated claims.
- **Engineering Intelligence (Phase 5):** Evaluates circular dependencies (Tarjan's cycle detection), architectural layer violations, maintainability indices, and blast radii.
- **Security Intelligence & Zero-Leak Redaction (Phase 6):** 6-layer vulnerability and secret scanner (high-entropy tokens, cloud credentials, injection flaws, auth misconfigurations) with automatic masking.
- **AI Code Fix Engine (Phase 7):** Generates unified diff patches for detected vulnerabilities with SHA-256 diff hash validation and human approval gates.
- **Pull Request Review Automation (Phase 8):** Analyzes unified PR diffs, maps touched symbols, evaluates blast radius, and flags breaking changes and security risks.
- **GitHub Webhook Engine (Phase 9):** Cryptographic signature verification (`X-Hub-Signature-256`), replay protection, and background event queueing.
- **Autonomous Developer Agent (Phase 10):** ReAct / Plan-and-Solve multi-step execution with read-only defaults, strict budget limits (8 steps, 10 tools, 30s timeout), and proposal hash validation.
- **Production Polish (Phase 11):** Structured secret-safe logging, health probes (`/api/health`), containerization, and end-to-end regression validation.
- **Database Persistence & pgvector (Production Phase 1):** Durable PostgreSQL 16 + `pgvector` store with strict `(repository_id, commit_sha)` isolation and sub-millisecond in-memory caching.
- **Authentication & RBAC Access Control (Production Phase 2):** Secure GitHub OAuth authentication, HTTP-only SameSite session cookies, user and repository membership persistence, centralized API middleware, and strict role-based access control (`OWNER`, `MEMBER`, `VIEWER`) with IDOR protection.
- **Redis & BullMQ Distributed Background Queues (Production Phase 3):** Redis 7 distributed cache with request coalescing, atomic sliding-window rate limiting, and BullMQ background worker architecture for asynchronous webhooks and repository analysis.
- **GitHub App & Real-Time Observability (Production Phase 4):** Scoped GitHub App installation token lifecycle, OpenTelemetry distributed tracing with W3C propagation, Prometheus metrics endpoint (`/api/metrics`), and Redis Pub/Sub backed Server-Sent Events (`/api/events/...`) for real-time progress.
- **Production Hardening & CI/CD (Production Phase 5):** Multi-stage non-root Alpine Docker container, GitHub Actions CI/CD automation, dedicated `/api/health/live` and `/api/health/ready` probes, enterprise security headers, migration safety, backup/restore procedures, and comprehensive runbooks.

---

## Technology Stack

- **Framework:** Next.js 14 (App Router), React 18
- **Database:** PostgreSQL 16 with `pgvector` extension
- **Language:** TypeScript 5.6
- **Styling:** Tailwind CSS (Restrained Editorial Code-First Theme)
- **Testing:** Vitest 2.1
- **Icons & Visuals:** Lucide React, Recharts
- **Containerization:** Docker (Node.js 20 Alpine Multi-Stage) & `docker-compose.yml`

---

## Getting Started

### 1. Prerequisites
- Node.js 20.x LTS or higher
- npm 10.x or higher
- Docker 24.x+ (optional for local PostgreSQL + pgvector)

### 2. Environment Setup
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
# PostgreSQL 16 + pgvector Database URL (Optional: defaults to in-memory fallback if unset)
DATABASE_URL=postgresql://devpilot:devpilot_secret_password@localhost:5432/devpilot

# GitHub Token (Optional but recommended — increases rate limit from 60 to 5000 req/hr)
GITHUB_TOKEN=your_github_personal_access_token

# AI Provider API Key (Optional — fallback to local deterministic synthesizer if unset)
GEMINI_API_KEY=your_gemini_api_key
# or OPENAI_API_KEY=your_openai_api_key

# GitHub Webhooks (Required for verifying incoming webhooks)
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Port (Default: 3005)
PORT=3005
```

### 3. (Optional) Start Local PostgreSQL with pgvector
```bash
docker compose up -d
```

### 4. Install & Run
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run automated tests
npm test

# Build production bundle
npm run build

# Start production server
npm start
```
The application will be accessible at `http://localhost:3005`.

---

## API Routes & Endpoints

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health, database status, and readiness check probe |
| `/api/repository/list` | `GET` | List repositories for a GitHub user |
| `/api/repository/ingest` | `POST` | Ingest repository metadata and file tree |
| `/api/repository/index` | `POST` | Index repository chunks for semantic RAG (persists to pgvector) |
| `/api/repository/ask` | `POST` | Grounded Codebase Q&A with verified citations |
| `/api/codebase/analyze` | `POST` | AST symbol parsing & dependency graph analysis |
| `/api/repository/engineering` | `POST` | Engineering health, layers & cycle detection |
| `/api/repository/security` | `POST` | 6-layer security and secret scan |
| `/api/repository/fix` | `POST` | Propose AI code fix patch |
| `/api/repository/fix/apply` | `POST` | Review and apply code fix patch with human confirmation |
| `/api/github/pull-request/review` | `POST` | Review PR diff, map affected symbols, and calculate blast radius |
| `/api/github/webhook` | `POST` | Ingest and cryptographically verify GitHub webhooks |
| `/api/agent/run` | `POST` | Execute autonomous developer agent plan |
| `/api/agent/approve` | `POST` | Human-in-the-loop approval for agent write actions |
