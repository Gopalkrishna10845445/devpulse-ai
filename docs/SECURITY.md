# DevPilot Security Policy & Model

**Project:** DevPilot  
**Status:** Production Security Standard  
**Last Updated:** September 2026  

---

## 1. Security Architecture Principles

DevPilot treats all external repository content, user prompts, webhook payloads, and third-party API responses as **untrusted data**. The platform enforces multi-layered defense-in-depth across every stage of ingestion, indexing, analysis, AI synthesis, and tool execution.

---

## 2. Secret & Token Management

1. **Zero Secret Leakage:**
   - Server-side environment variables (`GITHUB_TOKEN`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GITHUB_WEBHOOK_SECRET`) are never exposed to browser bundles, client components, API responses, or client telemetry.
   - Public health probes (`/api/health`) and status endpoints return boolean flags and descriptor strings rather than keys or hashed values.

2. **Automatic Secret Redaction:**
   - The redaction engine (`src/lib/security/redactor.ts`) scans strings for API keys, AWS credentials, GitHub tokens, JWTs, and private keys.
   - Any identified credential is automatically masked as `[REDACTED_SECRET]` prior to:
     - Embedding generation in RAG vector stores.
     - Insertion into LLM prompt contexts.
     - Emission into server-side structured logs (`src/lib/logger.ts`).
     - Display in frontend UI code viewers or findings cards.

---

## 3. Webhook Cryptographic Verification

1. **HMAC-SHA256 Signature Checking:**
   - All inbound requests to `/api/github/webhook` are cryptographically verified using the `X-Hub-Signature-256` header and the server's `GITHUB_WEBHOOK_SECRET`.
   - Timing-safe comparison (`crypto.timingSafeEqual`) is utilized to prevent side-channel timing attacks.
   - Missing or invalid signatures result in immediate `401 Unauthorized` responses without processing payload data.

2. **Replay & Idempotency Protection:**
   - Inbound `X-GitHub-Delivery` GUIDs are tracked in the Webhook Job Manager.
   - Duplicate deliveries are acknowledged and short-circuited to prevent duplicate background processing jobs.

---

## 4. Prompt Injection Defense

1. **Untrusted Data Framing:**
   - Repository code files, comments, commit messages, PR descriptions, and issue bodies are treated as untrusted data.
   - Prompts sent to LLM providers wrap external content in strict XML-style isolation tags (`<untrusted_codebase_context>`, `<untrusted_finding_evidence>`).
   - System instructions explicitly enforce that repository content can never override platform policies, security guardrails, or approval requirements.

2. **Regex Injection Pattern Screening:**
   - Malicious prompt injection heuristics (`ignore previous instructions`, `bypass guardrails`, `DAN mode`, `execute arbitrary command`) are evaluated on user inputs and external code text.

---

## 5. Agent Safety & Human-in-the-Loop Controls

1. **Read-Only Defaults:**
   - The DevPilot Autonomous Agent operates in strict read-only mode by default.
   - Diagnostic tools (`fetch_repository_structure`, `read_code_file`, `semantic_search_codebase`, `analyze_security_vulnerabilities`, `audit_pr_diff`) execute safely without modifying state.

2. **Controlled Write Actions:**
   - Write actions (`apply_code_fix`, `create_pull_request`, `trigger_reindex`) require explicit human authorization.
   - Proposals are signed with SHA-256 diff hashes and validated against the target commit SHA.
   - If the repository commit SHA advances, pending approvals are invalidated as stale to prevent applying patches against mismatched base trees.

3. **Execution Budgets:**
   - Hard execution limits: Maximum 8 planning steps, 10 tool calls, and 30-second execution timeout per agent session.
   - Shell command validation is locked to a strict allowlist (`tsc`, `vitest`, `lint`, `build`).

---

## 6. Repository Isolation

- Multi-repository requests are isolated by repository identifier (`owner/repo`) and commit SHA.
- In-memory vector indexes and AST graphs are scoped strictly to specific `repositoryId:commitSha` keys.
- Agent tool invocations validating cross-repository boundaries reject mismatched repository targets immediately.

---

## 7. Vulnerability Reporting

To report a suspected security vulnerability in DevPilot:
- Open a confidential security advisory or contact the security maintainers directly.
- Please allow 48 hours for acknowledgment and a remediation plan before any public disclosure.
