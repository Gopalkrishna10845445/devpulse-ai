# DevPilot Architecture Specification

**Product:** DevPilot — AI-powered Developer / Codebase Intelligence Platform  
**Version:** 1.0.0 (Production Ready)  
**Status:** Canonical Reference Architecture  

---

## 1. System Overview

DevPilot is a modular, high-assurance intelligence platform designed to ingest, parse, analyze, index, and reason over software repositories. It provides developers and engineering teams with deep codebase awareness, automated architectural audits, security vulnerability scanning, grounded code search (RAG), AI patch proposals, PR review automation, real-time webhook event handling, and a strictly bounded autonomous developer agent.

```
+-----------------------------------------------------------------------------------+
|                                 DevPilot Frontend                                 |
|         (Next.js 14, React 18, Tailwind CSS, Editorial Code-First UI)             |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                              API & Security Gateway                               |
|        - Request Validation & Bounds Checking                                     |
|        - Rate Limiting & Concurrency Control                                      |
|        - Cryptographic Webhook Verification (HMAC-SHA256)                         |
|        - Safe Error Formatting (Zero Stack Trace Leakage)                         |
+-----------------------------------------------------------------------------------+
                                         |
     +-----------------------------------+-----------------------------------+
     |                                   |                                   |
     v                                   v                                   v
+-------------------+           +-------------------+               +-------------------+
|  Repository Core  |           | Codebase Grounding|               |  Developer Agent  |
|  - Ingestion      |           |  - AST Parsers    |               |  - ReAct Planner  |
|  - Commit Bounds  |           |  - Semantic Graph |               |  - Tool Registry  |
|  - File Filtering |           |  - Vector Store   |               |  - Action Budget  |
|  - Lang/Framework |           |  - Citations (RAG)|               |  - Human Approval |
+-------------------+           +-------------------+               +-------------------+
     |                                   |                                   |
     +-----------------------------------+-----------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                            Specialized Engines                                    |
|   +--------------------------+  +--------------------------+                      |
|   | Engineering Intelligence |  |   Security Intelligence  |                      |
|   | - Dependency Graph       |  |   - 6-Layer Scanner      |                      |
|   | - Circular Dependencies  |  |   - Secret Redaction     |                      |
|   | - Blast Radius / Layering|  |   - CVSS / CWE Mapping   |                      |
|   +--------------------------+  +--------------------------+                      |
|   +--------------------------+  +--------------------------+                      |
|   |   AI Code Fix Engine     |  |     PR Review Engine     |                      |
|   | - Context Extraction     |  |   - Diff & Symbol Mapper |                      |
|   | - Patch Generation       |  |   - Impact Assessment    |                      |
|   | - Diff Hash Verification |  |   - Automated Findings   |                      |
|   +--------------------------+  +--------------------------+                      |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Subsystems

### 2.1 Repository Ingestion (`src/lib/repository`)
- **Capability:** Fetches repository structure, commits, branches, and contents from GitHub REST API or local clones.
- **Safety Bounds:**
  - Max files ingested: 2,000 files.
  - Max single file size: 256 KB.
  - Excludes build outputs, `node_modules`, lockfiles, binary/media assets, and compiled bytecode.
- **Detection Engines:** Automatic detection of programming languages (byte-weighted), package manifests, and architectural frameworks (Next.js, Express, React, Fastify, Django, Spring, etc.).

### 2.2 Codebase Intelligence (`src/lib/intelligence`)
- **Symbol Parsing:** Multi-language regex-based AST symbol extraction covering TypeScript, JavaScript, Python, and Go. Parses functions, classes, interfaces, types, methods, exported symbols, and docstrings.
- **Import Resolution & Dependency Mapping:** Maps internal project imports, third-party libraries, relative imports, and alias resolutions.
- **Architecture Classification:** Categorizes repositories into Clean Architecture, Layered/N-Tier, Hexagonal, Modular Monolith, Microservices, or Flat structures based on directory topology and dependency flows.

### 2.3 Codebase RAG & Grounded Q&A (`src/lib/rag`)
- **Chunking Engine:** Structural, symbol-aware chunking (max 60 lines / ~1,500 characters) preserving enclosing class/function headers.
- **Vector Store:** In-memory commit-aware vector store using Cosine Similarity on embeddings with keyword/lexical BM25 hybrid ranking.
- **Grounding Guarantee:** All AI-synthesized responses require verified file and line-range citations (`filePath:startLine-endLine`). Unsubstantiated claims are rejected.

### 2.4 Engineering Intelligence (`src/lib/engineering`)
- **Deterministic Metrics:** Code health index (0–100), maintainability index, and blast radius calculation.
- **Architectural Rules:** Detects circular dependency cycles (Tarjan's strongly connected components / DFS cycle detection), architectural layer boundary breaches, god-file hotspots, and orphaned modules.

### 2.5 Security Intelligence (`src/lib/security`)
- **6-Layer Scanner:**
  1. *Secret Scanner:* High-entropy string detection, cloud tokens (AWS, GCP, GitHub, Slack, OpenAI, Stripe, JWT, private keys).
  2. *Sensitive File Scanner:* Detects committed `.env`, `id_rsa`, `.pem`, keystores, credentials.
  3. *Code Pattern Scanner:* SQL injection, `eval()`, hardcoded crypto keys, insecure deserialization, SSRF.
  4. *Auth Pattern Scanner:* Insecure cookie settings, missing JWT verification, weak CORS policies.
  5. *Config Scanner:* Insecure Dockerfile permissions, unprotected HTTP listeners, debug flags.
  6. *Vulnerability / Dependency Scanner:* Outdated or vulnerable dependency audit matching.
- **Redaction:** Automatic masking (`[REDACTED_SECRET]`) of all detected secrets before logs, RAG embeddings, or UI rendering.

### 2.6 AI Code Fix Engine (`src/lib/fixes`)
- **Patch Generation:** Produces minimal, high-precision git unified diffs resolving flagged security and engineering findings.
- **Strict Verification:** Computes SHA-256 diff hash. Ensures target lines match current commit SHA. Blocks unauthorized writes without explicit user confirmation.

### 2.7 PR Review Engine (`src/lib/pr`)
- **Diff Parsing:** Parses unified git diffs, extracting added, removed, and modified hunks with line-level accuracy.
- **Symbol & Blast Radius Mapping:** Correlates changed lines with symbol graph to identify impacted functions, exports, and downstream callers.
- **Automated Findings:** Evaluates security violations, structural anti-patterns, and breaking changes in PR diffs.

### 2.8 GitHub Webhook Engine (`src/lib/webhook`)
- **Cryptographic Verification:** Validates `X-Hub-Signature-256` HMAC signatures using `crypto.timingSafeEqual`.
- **Replay Protection:** Deduplicates event deliveries based on `X-GitHub-Delivery` ID.
- **Background Pipeline:** Processes `push`, `pull_request`, and `ping` events asynchronously with retry bounds.

### 2.9 Autonomous Developer Agent (`src/lib/agent`)
- **Execution Model:** ReAct / Plan-and-Solve hybrid workflow engine.
- **Guardrails:**
  - Read-Only Default: Mutating tools require explicit human approval.
  - Budget Bounds: Max 8 steps, 10 tool calls, 3 retries, 30s timeout per run.
  - Proposal Signatures: Validates SHA-256 proposal hash and commit SHA to prevent stale writes.
  - Command Allowlist: Restricts shell validations strictly to safe commands (`tsc`, `vitest`, `lint`, `build`).

---

## 3. Data Flow & Security Boundaries

```
[External Webhook / User Input]
             |
             v (Sanitization & Secret Masking)
     [Untrusted Input Boundary]
             |
             +---> [Deterministic Parser & AST Engine]
             |                 |
             |                 v
             +---> [Commit-Aware Vector Store / Cache]
             |                 |
             |                 v
             +---> [Strict Context Builder (<untrusted_data>)]
                               |
                               v
                     [LLM Provider API]
                               |
                               v
                     [Citation & Diff Validator]
                               |
                               v
                    [Human Approval Gate (for Writes)]
                               |
                               v
                     [Verified Action Execution]
```

---

## 4. Persistence & State Management

- **Ephemeral Cache:** In-memory commit-keyed stores for AST graphs, vector chunks, and webhook jobs.
- **Production Persistence Model (Recommended for Horizontal Scaling):**
  - **Vector DB / PostgreSQL with pgvector:** For persistent cross-node chunk retrieval.
  - **Redis / Key-Value Store:** For distributed rate-limiting, job locks, and webhook delivery idempotency across replicas.
  - **Relational DB (Postgres/Prisma):** For persistent review audit logs, proposals, and user approval history.
