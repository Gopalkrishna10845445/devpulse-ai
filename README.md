# DevPilot

**DevPilot** is an enterprise-grade AI developer intelligence platform that performs deep static code analysis, semantic codebase Q&A (RAG), automated pull request reviews, engineering health metrics, security vulnerability audits, and bounded autonomous agent orchestration on real GitHub repositories.

---

## Overview

Modern software engineering teams manage rapidly expanding codebases with complex dependency trees, hidden security vulnerabilities, and architectural drift. DevPilot acts as an intelligent repository co-pilot and automated code reviewer. It ingests software repositories, extracts structural AST symbol graphs, performs commit-aware vector search, evaluates maintainability and security posture, generates reviewable fix proposals with unified diffs, and executes goal-oriented agent workflows—all while enforcing strict human approval gates for write actions.

---

## Core Features

- **Repository Ingestion & Indexing:** Ingests repository file trees from GitHub REST APIs or local sources with strict bounds (2,000 files, 256 KB/file), language byte-weighting, and framework detection.
- **Codebase Intelligence & Symbol Graphs:** Multi-language AST parser (TypeScript, JavaScript, Python, Go) extracting functions, classes, interfaces, types, and import relationships.
- **Codebase RAG / Q&A:** Commit-aware hybrid vector retrieval using PostgreSQL `pgvector` with BM25 lexical reranking and verified line-range citations (`file:start-end`).
- **Engineering Intelligence:** Deterministic maintainability index, god-file hotspot identification, Tarjan's cycle detection for circular dependencies, and architectural layer boundary auditing.
- **Security Intelligence:** 6-layer static security scanner detecting high-entropy secrets, committed credential files, unsafe code patterns (SQLi, eval, SSRF), auth gaps, and dependency vulnerabilities.
- **Pull Request Review Engine:** Automated PR review computing modified symbol mappings, blast radius scorecards, test gap indicators, and regression risks.
- **AI Fix / Refactor System:** Generates minimal git unified diff patches with cryptographic SHA-256 diff hash validation and strict human review gates.
- **GitHub Webhooks & Event Automation:** HMAC-SHA256 signature verification, X-GitHub-Delivery GUID replay deduplication, and BullMQ background queue processing.
- **DevPilot Agent Orchestration:** Bounded 7-mode developer agent (`INVESTIGATE`, `EXPLAIN`, `REVIEW`, `SECURITY`, `ENGINEERING`, `FIX`, `SUMMARIZE`) with typed tool registry, 8-step budget limits, and prompt injection defense.

---

## Architecture

### Intelligence Data Flow

```mermaid
flowchart TD
    GH[GitHub API / Webhooks] --> ING[Repository Ingestion]
    ING --> AST[Codebase Intelligence & AST Parser]
    AST --> RAG[RAG & pgvector Store]
    AST --> ENG[Engineering Intelligence]
    AST --> SEC[Security Intelligence]
    
    ENG --> PR[PR Review Engine]
    SEC --> PR
    
    ENG --> FIX[AI Fix & Refactor Engine]
    SEC --> FIX
    
    RAG --> AGENT[DevPilot Autonomous Agent]
    PR --> AGENT
    FIX --> AGENT
    
    AGENT --> APP[Human Approval Gate]
    APP --> APPLIED[Safe Patch Execution]
```

### Infrastructure Architecture

```mermaid
flowchart LR
    subgraph Client [Frontend Layer]
        UI[Next.js 14 / React 18 UI]
    end

    subgraph API [API & Gateway Layer]
        AUTH[Auth / RBAC Middleware]
        GW[API Route Handlers]
    end

    subgraph Storage [Persistence Layer]
        PG[(PostgreSQL 16 + pgvector)]
        REDIS[(Redis 7 / BullMQ)]
    end

    subgraph AI [AI & Analysis Layer]
        LLM[Gemini 1.5 / OpenAI]
        AST_ENGINE[Local Deterministic AST Engine]
    end

    UI --> AUTH --> GW
    GW --> PG
    GW --> REDIS
    GW --> LLM
    GW --> AST_ENGINE
```

---

## Technology Stack

- **Frontend & App Framework:** Next.js 14 (App Router), React 18, TypeScript 5.6
- **Styling & UI:** Tailwind CSS, Lucide React, Recharts
- **Database & Vectors:** PostgreSQL 16, `pgvector` extension
- **Caching & Queues:** Redis 7, BullMQ
- **Authentication:** GitHub OAuth 2.0, HTTP-Only SameSite Session Cookies, RBAC Middleware
- **AI Providers:** Google Gemini 1.5 Pro / Flash, OpenAI GPT-4o, Local Deterministic AST Synthesizer
- **Testing:** Vitest 2.1 (88 test suites, 615 passing tests)
- **Containerization & Deployment:** Docker (Node.js 20 Alpine Multi-stage), Render Web Service, GitHub Actions CI/CD

---

## Security

- **Authentication & RBAC:** GitHub OAuth 2.0 with state validation, session cookies, and repository-level roles (`OWNER`, `MEMBER`, `VIEWER`).
- **IDOR Protection:** Every protected API route validates user identity and repository membership before data access.
- **Webhook Verification:** Cryptographic HMAC-SHA256 signature verification (`X-Hub-Signature-256`) with replay attack deduplication.
- **Zero-Leak Secret Redaction:** Centralized secret masking (`maskTextSecrets`) redacts GitHub tokens, AWS keys, database credentials, and API keys across logs, traces, and UI payloads.
- **Human-in-the-Loop Approval Gates:** Write operations and code mutations (`apply_fix`) strictly require explicit human confirmation with SHA-256 diff hash matching.

---

## AI Safety & Grounding

- **Repository Content as Untrusted Data:** All repository source code, READMEs, PR bodies, and commit messages are wrapped in untrusted data boundaries to eliminate prompt injection risks.
- **Grounded Citations:** RAG answers require verifiable file paths, line ranges, and symbol names. Unsubstantiated claims are rejected.
- **Deterministic Baseline:** Full architectural, engineering, and security analysis remains functional even when third-party AI APIs are unavailable or rate-limited.

---

## Screenshots

| Codebase Intelligence & Topology | Grounded RAG & Codebase Q&A |
| :---: | :---: |
| ![Codebase Intelligence](/docs/screenshots/codebase_intelligence.png) | ![Grounded RAG](/docs/screenshots/rag_qa.png) |

| Engineering & Security Health | PR Review & Impact Blast Radius |
| :---: | :---: |
| ![Security & Engineering](/docs/screenshots/security_health.png) | ![PR Review](/docs/screenshots/pr_review.png) |

---

## Local Development

### 1. Prerequisites
- Node.js 20.x LTS or higher
- npm 10.x or higher
- Docker 24.x+ (optional for local PostgreSQL + Redis)

### 2. Environment Setup
Clone the repository and copy the environment template:
```bash
git clone https://github.com/Gopalkrishna10845445/devpulse-ai.git
cd devpulse-ai
cp .env.example .env.local
```

Configure your environment variables in `.env.local`:
```env
# PostgreSQL 16 + pgvector Database URL (Optional: in-memory fallback active if unset)
DATABASE_URL=postgresql://devpilot:devpilot_secret@localhost:5432/devpilot

# Redis URL (Optional: in-memory fallback active if unset)
REDIS_URL=redis://localhost:6379

# GitHub Token (Optional: increases rate limit from 60 to 5,000 req/hr)
GITHUB_TOKEN=your_github_token_here

# GitHub OAuth App Credentials
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_OAUTH_REDIRECT_URI=http://localhost:3005/api/auth/callback

# Webhook Secret (Required for webhook signature verification)
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# AI Provider Key (Optional: deterministic AST engine functions without AI keys)
GEMINI_API_KEY=your_gemini_api_key_here

# Application Port
PORT=3005
```

### 3. Start Local PostgreSQL & Redis (Optional)
```bash
docker compose up -d
```

### 4. Install & Run
```bash
# Install dependencies
npm install

# Run automated test suites
npm test

# Start Next.js development server
npm run dev
```
Open [http://localhost:3005](http://localhost:3005) in your browser.

---

## Environment Variables Reference

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Optional | PostgreSQL 16 connection string with pgvector enabled |
| `REDIS_URL` | Optional | Redis 7 connection string for distributed caching & BullMQ |
| `GITHUB_TOKEN` | Optional | Personal access token or GitHub App token (5,000 req/hr) |
| `GITHUB_CLIENT_ID` | Required for OAuth | GitHub OAuth Application Client ID |
| `GITHUB_CLIENT_SECRET` | Required for OAuth | GitHub OAuth Application Client Secret |
| `GITHUB_OAUTH_REDIRECT_URI` | Required for OAuth | OAuth callback URL (e.g. `http://localhost:3005/api/auth/callback`) |
| `GITHUB_WEBHOOK_SECRET` | Optional | Secret key for validating incoming GitHub webhook payloads |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for semantic reasoning |
| `OPENAI_API_KEY` | Optional | OpenAI API key (alternative LLM provider) |
| `PORT` | Optional | Server port (Default: `3005`) |

---

## Testing & Verification

DevPilot features a 100% passing test baseline across 88 comprehensive test suites:
```bash
# Run Vitest test suites
npm test -- --run

# Run TypeScript typecheck
npx tsc --noEmit

# Build production bundle
npm run build
```
- **Test Suites:** 88 passed
- **Tests:** 615 passed
- **TypeScript:** 0 type errors
- **Production Build:** Next.js optimized production bundle passed

---

## Deployment

### Docker Deployment
Build and run the production multi-stage container:
```bash
docker build -t devpilot:latest .
docker run -p 3005:3005 --env-file .env.local devpilot:latest
```

### Render Deployment
DevPilot includes native Render Web Service support:
1. Connect GitHub repository to Render.
2. Select **Web Service** with Node.js runtime.
3. Build Command: `npm run build`
4. Start Command: `npm start`
5. Configure environment variables in the Render dashboard.

---

## Known Limitations

- **Render Free Tier Cold Starts:** When deployed on Render Free instances, the service spins down after inactivity, causing a brief cold-start latency on the first request.
- **GitHub Unauthenticated Rate Limits:** If `GITHUB_TOKEN` is not configured, public repository analysis is subject to GitHub's unauthenticated IP rate limit of 60 requests/hour. Configuring a token raises this limit to 5,000 requests/hour.
