# DevPilot Production Architecture Recommendation

## 1. Executive Overview

This document outlines the evolutionary transition of DevPilot from its current **high-assurance in-memory reference prototype** into an **enterprise-grade, horizontally scalable, multi-tenant SaaS / On-Premise architecture**.

---

## 2. Current Architecture (Single-Tenant In-Memory)

```
+-----------------------------------------------------------------------------+
|                               Next.js App Server                            |
|                                                                             |
|   +---------------------------------------------------------------------+   |
|   |                          Stitch UI Frontend                         |   |
|   +---------------------------------------------------------------------+   |
|                                      │                                      |
|                                      ▼                                      |
|   +---------------------------------------------------------------------+   |
|   |                         Next.js 14 API Routes                       |   |
|   +---------------------------------------------------------------------+   |
|          │                    │                    │               │        |
|          ▼                    ▼                    ▼               ▼        |
|   +--------------+    +---------------+    +--------------+  +-----------+  |
|   | Ingestion    |    | RAG Pipeline  |    | Security     |  | Agent     |  |
|   | Engine       |    | & AST Parser  |    | Scanner      |  | Planner   |  |
|   +--------------+    +---------------+    +--------------+  +-----------+  |
|          │                    │                    │               │        |
|          ▼                    ▼                    ▼               ▼        |
|   +---------------------------------------------------------------------+   |
|   |                 In-Memory Node.js Heap Storage                      |   |
|   |   - VectorStore Map (Embeddings & Chunks)                           |   |
|   |   - AST Symbol Graphs & Dependency Maps                             |   |
|   |   - Webhook Delivery Queue & Deduplication Map                      |   |
|   |   - Fix Proposals & Pending Action Approvals                        |   |
|   +---------------------------------------------------------------------+   |
|                                      │                                      |
|                                      ▼                                      |
|                       External APIs (GitHub PAT, Gemini)                    |
+-----------------------------------------------------------------------------+
```

### Characteristics:
- Single process handling both HTTP serving, CPU-heavy AST parsing, embedding generation, and in-memory caching.
- Zero persistent database; container restarts wipe all indexed repositories and conversation memory.
- Single shared GitHub Personal Access Token (`GITHUB_TOKEN`) with a 5,000 req/hr rate limit across all operations.

---

## 3. Target Production Architecture (Scalable Multi-Tenant Enterprise)

```
+-----------------------------------------------------------------------------+
|                             Client Layer (Browser)                          |
|         Stitch UI (Next.js 14, React 18, Server Components, WebSockets)     |
+-----------------------------------------------------------------------------+
                                       │
                                       ▼ HTTPS (TLS 1.3 / HTTP/2)
+-----------------------------------------------------------------------------+
|                         Cloudflare WAF / AWS CloudFront                     |
|            - DDoS Mitigation, Edge Caching, Rate Limiting, SSL/TLS          |
+-----------------------------------------------------------------------------+
                                       │
                                       ▼
+-----------------------------------------------------------------------------+
|                     Next.js 14 API Gateway (Web Tier)                       |
|   - Stateless Replicas (Auto-scaled via Kubernetes HPA / ECS Fargate)       |
|   - Authentication (NextAuth.js / Auth.js with GitHub OAuth)                |
|   - Authorization & RBAC Middleware                                         |
|   - Fast API Endpoints (Health, Auth, Read Queries, Approvals)              |
|   - Webhook Ingestion & Cryptographic Verification                          |
+-----------------------------------------------------------------------------+
          │                                  │                        │
          ▼ Enqueue Tasks                    ▼ Query State            ▼ Cache & Locks
+-------------------+              +-------------------+    +-------------------+
|  Redis Queue      |              |   PostgreSQL 16   |    |    Redis Cache    |
|  (BullMQ Cluster) |              |   + pgvector      |    |  (ElastiCache)    |
|  - Ingest Jobs    |              |  - Users & Orgs   |    |  - Session Store  |
|  - Indexing Jobs  |              |  - Repos & Trees  |    |  - Fast AST Cache |
|  - Security Scans |              |  - Vector Chunks  |    |  - API Rate Limits|
|  - Agent ReAct    |              |  - Findings & PRs |    |  - Distributed    |
|  - Webhook Events |              |  - Audit Log      |    |    Locks          |
+-------------------+              +-------------------+    +-------------------+
          │
          ▼
+-----------------------------------------------------------------------------+
|                       Asynchronous Worker Pool                              |
|   - Dedicated Node.js / Rust Background Workers (BullMQ Processors)         |
|   - High-Memory & High-CPU Worker Nodes                                     |
|   - Parallel Repository Ingestion & Tree Flattening                         |
|   - AST Parsing & Dependency Cycle Graph Computations                       |
|   - Embedding Generation & Vector Upserts                                   |
|   - ReAct Agent Multi-Step Execution                                        |
+-----------------------------------------------------------------------------+
          │                                           │
          ▼                                           ▼
+-----------------------+                   +-----------------------+
|  GitHub App Service   |                   |  AI Gateway & LLMs    |
|  - Installation Tokens|                   |  - Google Gemini API  |
|  - Octokit App SDK    |                   |  - OpenAI GPT-4o      |
|  - Webhook Dispatcher |                   |  - Anthropic Claude   |
|  - PR Diff Generator  |                   |  - Token Quota Engine |
+-----------------------+                   +-----------------------+
```

---

## 4. Subsystem Components & Responsibilities

### 4.1 Frontend & Web Gateway (Stateless Next.js Replicas)
- **Role:** Handles UI rendering, server components, user interactions, and incoming API traffic.
- **Why Needed:** By remaining completely stateless, the web tier can scale horizontally from 2 to 50+ pods based on CPU/HTTP request metrics without state fragmentation.

### 4.2 Authentication & Authorization (NextAuth.js + GitHub OAuth)
- **Role:** Issues secure HTTP-only session cookies and JWTs. Manages GitHub OAuth handshake and retrieves user GitHub identities.
- **Why Needed:** Eliminates open endpoints, restricts access to verified organization developers, and enables per-user repository permissions.

### 4.3 PostgreSQL 16 + `pgvector` (Primary Data Store)
- **Role:** 
  - **Relational Tables:** Users, Organizations, Repositories, Commits, Pull Requests, Security Findings, Engineering Metrics, Fix Proposals, and Immutable Audit Trails.
  - **Vector Columns:** Stores 768-dim / 1536-dim vector embeddings with `HNSW` or `IVFFlat` indexing for sub-10ms nearest-neighbor semantic search.
- **Why Needed:** Replaces ephemeral in-memory Maps with durable, ACID-compliant, scalable storage that persists across server redeployments.

### 4.4 Redis Cluster (Distributed Cache & Locks)
- **Role:**
  - Token-bucket API rate limiting per IP / User / Organization.
  - Distributed mutual exclusion locks (`Redlock`) to guarantee that only one worker indexes a specific `repo@commit` at any given time.
  - Caching AST symbol tables and dependency trees for fast UI lookups.

### 4.5 BullMQ Background Worker Pool
- **Role:** Asynchronously processes compute-intensive workloads (repository ingestion, AST cycle detection, embedding generation, PR review analysis, agent planning).
- **Why Needed:** Prevents API route timeouts (e.g. 15s-30s gateway limits), isolates CPU-heavy tasks from HTTP request threads, and provides automated retry with exponential backoff and dead-letter queues.

### 4.6 GitHub App Integration Layer
- **Role:** Authenticates via GitHub App Installation Tokens rather than a single Personal Access Token.
- **Why Needed:** Automatically scales rate limits per installation (up to 12,500 req/hr per org), provides granular repository permissions, and allows DevPilot to automatically install webhooks on behalf of organizations.

### 4.7 Observability & Telemetry (OpenTelemetry + Prometheus + Grafana)
- **Role:** Emits W3C `traceparent` distributed trace headers across HTTP routes, Redis queues, and worker jobs. Exports Prometheus metrics (`/metrics`) and structured logs.
- **Why Needed:** Enables SRE teams to monitor p95/p99 query latencies, token consumption, GitHub API quota burn rates, and worker job throughput in real time.

---

## 5. End-to-End Data Flows in Target Architecture

### Flow A: Repository Ingestion & Indexing
1. User clicks **"Analyze Repository"** or GitHub webhook triggers `push` event.
2. Web API validates user authorization and enqueues an `ingest_repository` job to Redis.
3. Web API returns `HTTP 202 Accepted` with a `jobId`.
4. A BullMQ worker claims the job, acquires a Redis lock for `repo@commit`, and fetches the Git tree via GitHub App installation token.
5. Worker parses manifests, runs AST symbol extraction, and computes engineering metrics.
6. Worker generates embeddings and upserts chunks into PostgreSQL `pgvector`.
7. Worker marks job `completed` and broadcasts status update via WebSocket / Server-Sent Events.

### Flow B: Grounded RAG Q&A
1. User submits question via Stitch UI.
2. API validates user session and converts query into an embedding vector.
3. API executes hybrid search in PostgreSQL: Cosine similarity via `pgvector` combined with `tsvector` full-text search.
4. Top matching chunks are fetched and framed in `<untrusted_codebase_context>` tags.
5. Prompt is dispatched to AI Provider (Gemini / OpenAI).
6. Response is validated for verified line-range citations and streamed back to the client.

### Flow C: Autonomous Agent Fix & Human Approval Gate
1. User prompts Agent: *"Fix SQL injection in auth handler."*
2. Agent Planner creates ReAct execution graph; read-only tools inspect code and run vulnerability scan.
3. Fix Engine generates unified git diff patch with SHA-256 hash.
4. Mutation tool intercepts patch and creates a `PendingAction` in PostgreSQL with status `pending_approval`.
5. UI displays diff modal to developer.
6. Developer clicks **"Approve & Apply"**; API verifies commit freshness and user write permissions, applies patch, and commits to a new branch.
