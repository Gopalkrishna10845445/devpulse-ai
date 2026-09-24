# DevPilot — Technical Interview & Architecture Mastery Guide

This guide provides an exhaustive technical breakdown of **DevPilot** structured around 20 core engineering topics. Each topic includes architectural explanations, implementation decisions, and likely technical interview questions paired with concise, accurate answers.

---

## 1. What Problem DevPilot Solves

### Architectural Explanation
Engineering teams struggle with architectural drift, undocumented codebases, silent security vulnerabilities, and slow pull request reviews. Traditional static analysis tools (like SonarQube or Snyk) operate in silos and lack codebase-wide semantic understanding. Generative AI tools (like raw ChatGPT) lack grounding, commit-level context, and safety boundaries. 

DevPilot unifies AST-level static analysis, commit-isolated semantic RAG, automated PR review, deterministic security scanning, and autonomous agent orchestration into a single, high-assurance developer workflow with human-in-the-loop safety.

### Interview Q&A
- **Q: How does DevPilot differ from standard AI coding assistants like GitHub Copilot or Cursor?**  
  **A:** Copilot operates locally inside an IDE at the file/cursor level. DevPilot is a repository-wide intelligence platform that analyzes full architectural topologies, detects cross-module circular dependencies, calculates PR blast radius, generates verifiable fix diffs, and orchestrates multi-step developer agent workflows backed by PostgreSQL/pgvector and Redis.
- **Q: What is DevPilot's core value proposition?**  
  **A:** Reducing developer onboarding time and review overhead by providing instant, grounded answers to architectural questions, automated risk scorecards for PRs, and verifiable remediation diffs without hallucinations.

---

## 2. System Architecture

### Architectural Explanation
DevPilot is designed with a layered, decoupled architecture:
1. **Frontend:** Next.js 14 App Router, React 18, Tailwind CSS, Lucide icons, and Recharts.
2. **API & Security Gateway:** Centralized authentication (`requireAuth`), repository RBAC (`authorizeRepositoryAccess`), sliding-window rate limiting, and zero-stack-trace error handling.
3. **Core Analysis Engines:** Repository Ingestor, Multi-language AST Parser, pgvector RAG Pipeline, Engineering Health Engine, 6-Layer Security Engine, PR Review Engine, and AI Fix Engine.
4. **Agent Orchestrator:** Bounded ReAct engine with typed tool registry, 8-step execution budget, and human approval gates.
5. **Storage & Messaging:** PostgreSQL 16 + `pgvector` for relational data and vector similarity; Redis 7 + BullMQ for distributed caching, rate limiting, and background queues.

### Interview Q&A
- **Q: How do the different engines communicate?**  
  **A:** Engines communicate via strongly-typed TypeScript domain models. High-volume background workflows (such as webhook processing and heavy repository indexing) are queued into BullMQ jobs and processed asynchronously with progress streamed over Server-Sent Events (SSE).
- **Q: Is the system stateless or stateful?**  
  **A:** The Next.js API layer is completely stateless. All persistent state is delegated to PostgreSQL 16 and Redis 7, allowing seamless horizontal scaling across container instances.

---

## 3. Repository Ingestion Flow

### Architectural Explanation
Ingestion converts raw GitHub repository trees into a structured, indexed in-memory and on-disk representation:
1. **Tree Fetching:** Recursively fetches Git trees via GitHub REST API or local clones.
2. **Safety Bounding:** Enforces strict limits: max 2,000 files, max 256 KB per single file.
3. **Filtering:** Ignores binaries, lockfiles (`package-lock.json`), build artifacts (`dist/`, `.next/`), and dependencies (`node_modules/`).
4. **Metadata Extraction:** Computes byte-weighted language shares, detects package manifests, and identifies frameworks (Next.js, Express, Fastify, Django, etc.).

### Interview Q&A
- **Q: How do you prevent repository ingestion from overwhelming server memory?**  
  **A:** We enforce hard bounds (2,000 files, 256 KB max file size) and strip out binaries, media, and third-party dependencies during the traversal stage before loading file content into memory.
- **Q: How are large repositories handled?**  
  **A:** Files exceeding the size threshold or matching binary signatures are flagged as `skipped` in the `RepositoryIndex`, preserving repository structure without consuming memory.

---

## 4. How Code Analysis Works

### Architectural Explanation
DevPilot uses a multi-language AST parser (TypeScript/JavaScript, Python, Go) that extracts:
- **Symbols:** Function definitions, classes, interfaces, types, methods, exported variables, and docstrings with line numbers.
- **Dependency Graphs:** Internal relative imports, module aliases, and external third-party package dependencies.
- **Architectural Topology:** Classifies architectural pattern (Clean Architecture, Layered/N-Tier, Hexagonal, Modular Monolith, Microservices, or Flat) by analyzing directory depth, layer boundaries, and dependency flows.

### Interview Q&A
- **Q: Why use AST parsing instead of purely relying on LLMs?**  
  **A:** AST parsing is 100% deterministic, instant (<50ms), zero-cost, and immune to hallucinations. It provides an exact ground-truth symbol graph that guides the LLM during RAG and agent tasks.
- **Q: How does DevPilot detect circular dependencies?**  
  **A:** We build a directed import graph where modules are nodes and import statements are directed edges, then run Tarjan's Strongly Connected Components algorithm (or DFS cycle detection) to find import loops.

---

## 5. How RAG Works

### Architectural Explanation
DevPilot's Retrieval-Augmented Generation pipeline connects repository code to LLMs:
1. **Symbol-Aware Chunking:** Chunks code along function/class boundaries (max 60 lines / ~1,500 chars) while preserving enclosing class/function signatures.
2. **Embedding & Vector Storage:** Generates vector embeddings stored in PostgreSQL with `pgvector` or local fallback memory.
3. **Hybrid Retrieval:** Combines cosine distance similarity (`<=>`) with BM25 lexical keyword matching to retrieve top-K relevant chunks.
4. **Grounded Synthesis:** Injects retrieved chunks into the prompt wrapped in strict untrusted data delimiters and prompts the LLM to cite specific line ranges.

### Interview Q&A
- **Q: Why is chunking along AST boundaries superior to naive character-count chunking?**  
  **A:** Naive fixed-size chunking can split a function mid-expression, severing context. Symbol-aware chunking keeps full function/class definitions intact with their signatures, significantly improving retrieval relevance.
- **Q: How does hybrid retrieval improve code search?**  
  **A:** Vector embeddings capture conceptual semantics ("user authentication logic"), while BM25 keyword search captures exact identifier names (`handleLoginCallback`). Combining them yields superior precision.

---

## 6. Why pgvector is Used

### Architectural Explanation
`pgvector` is an open-source extension for PostgreSQL that enables storing vector embeddings directly alongside relational tables and performing exact or approximate nearest neighbor (ANN) search via HNSW (Hierarchical Navigable Small World) or IVFFlat indexes.

### Interview Q&A
- **Q: Why choose pgvector over dedicated vector databases like Pinecone, Qdrant, or Milvus?**  
  **A:** `pgvector` eliminates distributed system complexity by co-locating relational data (users, repositories, commits, findings) with vector embeddings in a single PostgreSQL database. It supports ACID transactions, foreign key cascades, and unified backups without paying for external vector SaaS services.
- **Q: How do you enforce commit isolation in pgvector?**  
  **A:** Every chunk in `rag_chunks` has a composite foreign key on `(repository_id, commit_sha)`. Vector queries filter on `WHERE repository_id = $1 AND commit_sha = $2`, completely preventing cross-repository and cross-commit data leakage.

---

## 7. How Hallucinations are Reduced

### Architectural Explanation
Hallucination mitigation is built directly into the pipeline:
1. **Mandatory Citations:** AI responses must include verified file paths, start lines, and end lines (`filePath:startLine-endLine`).
2. **Post-Synthesis Citation Validator:** Programmatically checks that every cited file exists in the repository index and that the cited line numbers contain the relevant code.
3. **Strict Fallback to Uncertainty:** If no relevant code is retrieved, the engine is instructed to explicitly state that no evidence was found rather than inventing an answer.

### Interview Q&A
- **Q: How does DevPilot guarantee that line citations are real?**  
  **A:** The `CitationValidator` cross-references every citation in the LLM output against the authoritative `RepositoryIndex`. If a cited line range or file does not exist, the citation is stripped or flagged.

---

## 8. How Security Scanning Works

### Architectural Explanation
DevPilot implements a 6-layer static security intelligence engine:
1. **Secret Scanner:** High-entropy string detection, regex signatures for GitHub PATs, AWS access keys, GCP keys, OpenAI/Gemini keys, JWTs, and private keys.
2. **Sensitive File Scanner:** Flags committed `.env` files, `.pem` certificates, private keys, and credential stores.
3. **Code Pattern Scanner:** Detects SQL injection, `eval()`, hardcoded secrets, insecure deserialization, and SSRF.
4. **Auth Pattern Scanner:** Identifies insecure cookie configurations, missing authentication middleware, and permissive CORS headers.
5. **Config Scanner:** Audits Dockerfiles, environment templates, and server configs for security misconfigurations.
6. **Dependency Scanner:** Matches package manifests against known CVE vulnerability patterns.

### Interview Q&A
- **Q: How does secret redaction work in DevPilot?**  
  **A:** Centralized utility `maskTextSecrets` scans strings recursively across logs, traces, RAG inputs, and API responses, replacing any matching credential pattern with `[REDACTED_SECRET]`.
- **Q: Are security scans deterministic or AI-based?**  
  **A:** The primary scan is 100% deterministic (regex, AST token inspection, and heuristic rule matching). The LLM is only used optionally to format human-readable explanations.

---

## 9. How PR Review Works

### Architectural Explanation
The PR Review Engine deterministically evaluates GitHub Pull Requests:
1. **Diff Parsing:** Parses unified diffs into structured file modifications, additions, deletions, and hunks.
2. **Symbol Mapping:** Maps changed lines to AST symbols to identify modified functions, classes, and exported interfaces.
3. **Blast Radius Analysis:** Traverses the import dependency graph to identify downstream callers impacted by modified exports.
4. **Impact Scorecards:** Computes architecture, security, test coverage, and dependency impact scores, generating an automated review summary with risk warnings.

### Interview Q&A
- **Q: How does DevPilot calculate the blast radius of a PR?**  
  **A:** By identifying all symbols modified in the PR diff and querying the dependency graph for all internal modules that import or call those symbols.
- **Q: Can the PR review engine automatically approve or merge PRs?**  
  **A:** No. DevPilot operates in read-only analysis mode for PR reviews. Automatic merging or approval is strictly prohibited by policy.

---

## 10. How AI Fix Proposals Work

### Architectural Explanation
The AI Fix Engine resolves detected security and engineering findings:
1. **Context Assembly:** Extracts the affected file, line range, finding rule, and surrounding AST context.
2. **Patch Synthesis:** Generates a minimal, clean unified diff addressing the issue without introducing unrelated changes.
3. **Cryptographic Hash Validation:** Computes SHA-256 hash of the patch diff to ensure patch integrity.
4. **State Persistence:** Saves the proposal in `fix_proposals` table with `proposed` status.

### Interview Q&A
- **Q: How does DevPilot ensure that generated fix diffs apply cleanly?**  
  **A:** `patchValidator` performs AST syntax checking on the proposed code and verifies that the before-code hunks match the target commit's source lines.

---

## 11. Why Human Approval is Required

### Architectural Explanation
Autonomous code modification carries severe risks: broken builds, subtle logic regressions, and supply chain tampering. DevPilot enforces a strict **Human-in-the-Loop (HITL)** architecture:
- Write actions (`apply_fix`, `fix_apply`) are classified as high-risk.
- When an agent or user requests a fix, the system generates a proposal and enters `WAITING_FOR_APPROVAL` (`awaiting_approval`).
- Applying the fix requires an explicit POST to `/api/agent/approve` or `/api/fixes/[id]/apply` with diff hash verification and user authentication.

### Interview Q&A
- **Q: Why does DevPilot forbid autonomous code commits?**  
  **A:** To maintain absolute engineering safety. Developers must always review and authorize modifications before code is mutated or committed.

---

## 12. How the Agent Orchestrates Tools

### Architectural Explanation
The DevPilot Agent is a bounded ReAct (Reasoning + Acting) orchestrator:
1. **Intent Classification:** Classifies requests into 7 modes (`INVESTIGATE`, `EXPLAIN`, `REVIEW`, `SECURITY`, `ENGINEERING`, `FIX`, `SUMMARIZE`).
2. **Bounded Planning:** Formulates a step-by-step plan using registered typed tools (`repository_info`, `symbol_lookup`, `architecture_analysis`, `engineering_analysis`, `security_analysis`, `rag_query`, `pr_review`, `generate_fix`, `apply_fix`).
3. **Execution Guardrails:** Max 8 steps, 10 tool calls, 30s timeout, command allowlisting (`npm test`, `npx tsc --noEmit`), and prompt injection detection.
4. **Audit Trail:** Persists complete run trace in `agent_runs` table in PostgreSQL.

### Interview Q&A
- **Q: How do you prevent the agent from getting stuck in infinite execution loops?**  
  **A:** We enforce hard budget limits: `MAX_STEPS = 8`, `MAX_TOOL_CALLS = 10`, and `MAX_EXECUTION_TIME_MS = 30000`. When budgets are exhausted, execution halts immediately.

---

## 13. PostgreSQL Design

### Architectural Explanation
The PostgreSQL 16 schema enforces relational integrity and strict commit isolation:
- `users`, `sessions`, `repository_memberships`, `github_installations`: Identity, sessions, and RBAC.
- `repositories`, `repository_commits`: Ingestion trees and commit isolation boundaries.
- `rag_documents`, `rag_chunks`: Vector chunks with 768-dim `vector` column and HNSW cosine distance index.
- `engineering_reports`, `security_reports`, `pull_request_reviews`: Structured JSONB report stores.
- `webhook_deliveries`, `fix_proposals`, `approval_records`, `agent_runs`: Audit trails and mutation state.

### Interview Q&A
- **Q: Why are repository reports keyed by commit SHA?**  
  **A:** Codebases change across commits. Keying by `(repository_id, commit_sha)` ensures reports and vector chunks remain historically immutable and accurate to the exact Git state.

---

## 14. Redis/BullMQ Role

### Architectural Explanation
Redis 7 provides low-latency distributed state management:
1. **Distributed Caching:** Namespaced cache with request coalescing (`RedisCache.wrap`) to prevent thundering herds.
2. **Atomic Rate Limiting:** Sliding-window counters per user and operation.
3. **BullMQ Background Queues:** Asynchronous queueing for webhook events, deep repository analysis, and vector indexing with exponential backoff retries.
4. **Redis Pub/Sub:** Event bus powering Server-Sent Events (SSE) for real-time progress updates across replicas.

### Interview Q&A
- **Q: What happens if Redis goes offline?**  
  **A:** DevPilot incorporates automatic fallback: caching reverts to local bounded memory, queues run synchronously in fallback mode, and health probes report degraded status without crashing the API.

---

## 15. GitHub OAuth Flow

### Architectural Explanation
1. User clicks **Login with GitHub** -> redirected to `https://github.com/login/oauth/authorize` with client ID, minimized scopes (`repo`, `read:user`), and a cryptographically generated `state` nonce.
2. GitHub redirects back to `/api/auth/callback` with `code` and `state`.
3. Backend verifies `state` nonce, exchanges `code` for an access token via server-to-server POST, fetches the GitHub user profile, upserts user in PostgreSQL `users`, creates a 256-bit session token in `sessions`, and sets an HTTP-only `SameSite=Lax` cookie.

### Interview Q&A
- **Q: Why is the OAuth state parameter critical?**  
  **A:** It prevents Cross-Site Request Forgery (CSRF) attacks by binding the authorization request to the user's browser session.

---

## 16. RBAC and IDOR Protection

### Architectural Explanation
- **Roles:** `OWNER`, `MEMBER`, `VIEWER`.
- **Permissions:** `view`, `analyze`, `qa`, `engineering`, `security`, `pr_review`, `propose_fix`, `approve_fix`, `manage_members`.
- **IDOR Defense:** Centralized middleware `requireAuth` extracts user ID from the verified server-side session. `authorizeRepositoryAccess` queries `repository_memberships` to verify user permissions before any data access.

### Interview Q&A
- **Q: What is IDOR and how does DevPilot prevent it?**  
  **A:** Insecure Direct Object Reference occurs when a user accesses another tenant's repository by guessing its ID. DevPilot prevents this by validating that the authenticated user has an active membership record with appropriate permissions for that specific repository.

---

## 17. Webhook Security

### Architectural Explanation
1. **HMAC-SHA256 Signature:** Validates `X-Hub-Signature-256` header against `GITHUB_WEBHOOK_SECRET` using `crypto.timingSafeEqual` to prevent timing attacks.
2. **Replay Protection:** Checks `X-GitHub-Delivery` GUID against PostgreSQL `webhook_deliveries` to reject duplicate payloads.
3. **Idempotent Queueing:** Jobs pushed to BullMQ use delivery GUID as the job ID.

### Interview Q&A
- **Q: Why use timingSafeEqual for webhook signature verification?**  
  **A:** Standard string comparison operators (`===`) return `false` on the first mismatched byte, leaking timing information that attackers can exploit. `timingSafeEqual` executes in constant time.

---

## 18. Failure Handling

### Architectural Explanation
DevPilot follows a **Graceful Degradation** philosophy:
- **Database Offline:** In-memory fallback allows API to serve cached requests and AST analysis.
- **Redis Offline:** In-memory rate limiting and synchronous processing activate automatically.
- **AI / LLM Offline / Rate-Limited:** Deterministic AST analysis engines provide 100% of architectural, engineering, and security findings without third-party APIs.
- **GitHub API Rate-Limited:** Ingestor falls back to local cached snapshots and reports 429 status cleanly.

### Interview Q&A
- **Q: How does DevPilot handle AI provider downtime?**  
  **A:** The entire core analysis (AST symbols, circular dependencies, security vulnerabilities, PR blast radius) is computed by local deterministic TypeScript engines. If Gemini/OpenAI are unavailable, the platform still delivers complete reports.

---

## 19. Scaling Considerations

### Architectural Explanation
- **Stateless Next.js API:** Horizontally scalable across any number of container instances.
- **PostgreSQL Connection Pooling:** Centralized pg.Pool with configurable max connections.
- **Redis Request Coalescing:** Multiple concurrent requests for the same repository analysis collapse into a single execution.
- **BullMQ Worker Concurrency:** Background tasks scale independently from the user-facing web server.

### Interview Q&A
- **Q: How would you scale DevPilot to handle 10,000 concurrent developers?**  
  **A:** Separate Next.js web traffic from BullMQ background worker nodes, place PostgreSQL behind a connection pooler (e.g. PgBouncer), use Redis Cluster for caching, and shard vector embeddings across read replicas.

---

## 20. Known Limitations

### Architectural Explanation & Transparency
- **Render Free Tier Cold Starts:** Free instances spin down on idle, introducing a 30–50s cold start on initial wake-up.
- **Unauthenticated GitHub Rate Limits:** Without a configured `GITHUB_TOKEN`, public repository analysis is subject to GitHub's 60 req/hr IP limit (configuring a token raises this to 5,000 req/hr).
- **Single-Node In-Memory Fallback:** When running without PostgreSQL/Redis, state is stored in memory and resets upon process restart.

### Interview Q&A
- **Q: What are the current architectural bottlenecks and how would you resolve them?**  
  **A:** On free single-node deployments, heavy repository indexing shares CPU with API requests. In production, we separate background ingestion onto dedicated BullMQ worker clusters and use authenticated GitHub App tokens.
