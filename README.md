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

---

## Technology Stack

- **Framework:** Next.js 14 (App Router), React 18
- **Language:** TypeScript 5.6
- **Styling:** Tailwind CSS (Restrained Editorial Code-First Theme)
- **Testing:** Vitest 2.1
- **Icons & Visuals:** Lucide React, Recharts
- **Containerization:** Docker (Node.js 20 Alpine Multi-Stage)

---

## Getting Started

### 1. Prerequisites
- Node.js 20.x LTS or higher
- npm 10.x or higher

### 2. Environment Setup
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
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

### 3. Install & Run
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
| `/api/health` | `GET` | Health and readiness check probe |
| `/api/repository/list` | `GET` | List repositories for a GitHub user |
| `/api/repository/ingest` | `POST` | Ingest repository metadata and file tree |
| `/api/repository/index` | `POST` | Index repository chunks for semantic RAG |
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

---

## Security & Safety Guardrails

- **Secret Redaction:** High-entropy tokens, API keys, and passwords are automatically masked before logging, vector embedding, or UI display.
- **Untrusted Content Boundaries:** All repository code, comments, issues, and diffs are wrapped in `<untrusted_data>` prompt fences.
- **Read-Only Defaults:** Agent and fix engines cannot modify repositories without explicit user authorization.
- **Stale Commit Rejection:** Approvals against out-of-date commit SHAs are automatically rejected.
- **Command Allowlist:** Subprocess execution is restricted to safe validation commands (`tsc`, `vitest`, `lint`, `build`).

---

## Architecture & Documentation

For detailed technical references:
- **[Architecture Guide](docs/ARCHITECTURE.md):** System design, data flow diagrams, and subsystem breakdown.
- **[Security Model](docs/SECURITY.md):** Defense-in-depth, prompt injection protection, and credential handling.
- **[Production Runbook](docs/PRODUCTION_RUNBOOK.md):** Operations, health probes, smoke tests, troubleshooting, and rollback procedures.

---

## License

Private & Confidential — DevPilot Intelligence Platform.
