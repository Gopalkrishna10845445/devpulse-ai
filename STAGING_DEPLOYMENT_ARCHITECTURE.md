# DevPilot — Staging & Production Deployment Architecture Specification

**Phase:** Production Phase 6 — Staging Deployment & Cloud Infrastructure Audit  
**Mode:** READ-ONLY AUDIT  
**Branch:** `devpilot-stitch-ui`  
**Current Commit:** `f8d853859c879fc810b6a57d7700a06061b2de64` (`f8d8538`)  
**Target Infrastructure:** Cloud Native Multi-Tier Deployment (AWS / GCP / Azure / Kubernetes / Managed PaaS)

---

## 1. System Architecture & Component Map

DevPilot operates as a decoupled, multi-tier cloud-native platform comprising a stateless web/API tier, asynchronous background workers, durable relational + vector persistence, distributed in-memory cache/queues, and bidirectional telemetry streams.

```
                                      +-------------------------------+
                                      |     Public Internet (HTTPS)   |
                                      +-------------------------------+
                                                      |
                                                      v
                                      +-------------------------------+
                                      |  Cloudflare / WAF / CDN / DNS |
                                      +-------------------------------+
                                                      |
                                                      | (TLS 1.3 / Port 443)
                                                      v
                                      +-------------------------------+
                                      |  Application Load Balancer    |
                                      +-------------------------------+
                                                      |
                                                      | (HTTP / Port 3005)
                        +-----------------------------+-----------------------------+
                        |                                                           |
                        v                                                           v
       +-----------------------------------+                       +-----------------------------------+
       |    DevPilot Next.js API Pod 1     |                       |    DevPilot Next.js API Pod 2     |
       |  - UI & App Router                |                       |  - UI & App Router                |
       |  - OAuth & Session Middleware     |                       |  - OAuth & Session Middleware     |
       |  - Single-Flight Promise Cache    |                       |  - Single-Flight Promise Cache    |
       |  - Sliding-Window Rate Limiter    |                       |  - Sliding-Window Rate Limiter    |
       |  - Webhook Ingestion & HMAC       |                       |  - Webhook Ingestion & HMAC       |
       |  - Liveness & Readiness Probes    |                       |  - Liveness & Readiness Probes    |
       +-----------------------------------+                       +-----------------------------------+
                        |                                                           |
                        +-----------------------------+-----------------------------+
                                                      |
                  +-----------------------------------+-----------------------------------+
                  |                                   |                                   |
                  v                                   v                                   v
+-----------------------------------+  +-----------------------------------+  +-----------------------------------+
|  PostgreSQL 16 + pgvector Cluster |  |         Redis 7 Cluster           |  |     BullMQ Background Workers     |
|  - Repositories & Commit Trees    |  |  - Distributed Sliding Rate Limits|  |  - Ingestion Worker (AST/Chunk)  |
|  - RAG Documents & HNSW Vectors   |  |  - Response Cache (5m TTL)        |  |  - Codebase Analysis Worker       |
|  - Security & Engineering Reports |  |  - BullMQ Job State & Locks       |  |  - Webhook Dispatch Worker        |
|  - Users & Session Records        |  |  - Pub/Sub for SSE Broadcasting   |  |  - OpenTelemetry Trace Context    |
|  - Connection Pool (Max 20/pod)   |  |  - MaxMemory: volatile-lru        |  |  - Bounded Retries (Max 3)        |
+-----------------------------------+  +-----------------------------------+  +-----------------------------------+
                  |                                                                       |
                  +-----------------------------------+-----------------------------------+
                                                      |
                                                      | (Outbound HTTPS / Port 443)
                                                      v
                                      +-------------------------------+
                                      |    External Cloud Services    |
                                      |  - GitHub REST & App API      |
                                      |  - Google Gemini 1.5 Pro / Flash
                                      |  - OpenAI GPT-4o / Embeddings |
                                      |  - OpenTelemetry OTLP Exporter|
                                      +-------------------------------+
```

---

## 2. Component Breakdown & Resource Requirements

| Component | Nature | Minimum Replicas | Recommended (Prod) | CPU Target | Memory Target | Network Scope |
|---|---|---|---|---|---|---|
| **Web / API Service** | Stateless Container | 1 (Staging) | 2–4 (Autoscaling) | 0.5 – 1.0 vCPU | 512 MB – 1.0 GB | Public Ingress (via LB) |
| **Worker Service** | Stateful Queue Worker | 1 (Staging) | 2 (Autoscaling) | 0.5 – 1.0 vCPU | 512 MB – 1.0 GB | Private VPC Only |
| **PostgreSQL 16 + pgvector** | Stateful RDBMS | 1 (Single AZ) | Multi-AZ Primary/Replica | 1.0 – 2.0 vCPU | 2.0 GB – 4.0 GB | Private VPC Only |
| **Redis 7 Cluster** | In-Memory Key-Value | 1 (Single Node) | Primary + Read Replica | 0.25 – 0.5 vCPU | 512 MB – 1.0 GB | Private VPC Only |
| **Container Registry** | Image Repository | N/A | GHCR / AWS ECR / GCP GCR | N/A | N/A | HTTPS Auth |
| **Secret Manager** | KMS / Vault | N/A | AWS Secrets / GCP Secret Mgr | N/A | N/A | IAM Authenticated |

---

## 3. Network Architecture & Security Boundaries

1. **Public Ingress Zone:**
   - HTTPS traffic on TCP port 443 terminates at Cloudflare / CDN and Application Load Balancer.
   - WAF inspects for malicious payloads, DDoS, and bad bots.
   - Forwarding port: Internal TCP port 3005 to Next.js API pods.
2. **Private Application Subnet (Isolated VPC):**
   - Web API pods and BullMQ Worker pods execute in private subnets without public IPv4 addresses.
   - Outbound internet access via NAT Gateway for GitHub API and AI LLM endpoints.
3. **Data Subnet (Strict Private Isolation):**
   - PostgreSQL (port 5432) and Redis (port 6379) are accessible ONLY from Web and Worker security groups.
   - Ingress from 0.0.0.0/0 is strictly blocked.

---

## 4. Ingress, DNS & TLS Architecture

- **Primary Web/API Domain:** `https://devpilot.example.com` (or staging: `https://staging-devpilot.example.com`)
- **Webhook Listener Endpoint:** `https://devpilot.example.com/api/github/webhook`
- **OAuth Callback Endpoint:** `https://devpilot.example.com/api/auth/callback`
- **TLS Protocol:** TLS 1.3 mandatory with TLS 1.2 fallback (modern cipher suites only). HSTS with 2-year duration and preloading.
