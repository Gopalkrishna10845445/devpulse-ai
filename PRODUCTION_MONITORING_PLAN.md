# DevPilot — Production Monitoring, Observability & Alerting Plan

**Phase:** Production Phase 6 — Staging Deployment Readiness  
**Mode:** READ-ONLY AUDIT  
**Commit:** `f8d8538`  
**Standard:** OpenTelemetry Distributed Tracing & Prometheus Metrics Exposition

---

## 1. Observability Architecture

DevPilot embeds native OpenTelemetry instrumentation and Prometheus metric collectors exposed on `/api/metrics`:

```
+-------------------------------------------------------------------------------+
|                       DevPilot Next.js API & Workers                          |
|  - W3C traceparent Propagation                                                |
|  - Redacted OpenTelemetry Spans (HTTP, Ingestion, RAG, BullMQ, DB, SSE)       |
|  - Prometheus Metrics Registry (/api/metrics)                                 |
+-------------------------------------------------------------------------------+
                                       |
                                       | (Prometheus Pull / OTLP Push)
                                       v
+-------------------------------------------------------------------------------+
|                Monitoring Backend (Prometheus / Grafana / Datadog)            |
|  - Dashboards (Application, Database, Redis, Queues, Security)                |
|  - Alertmanager (PagerDuty / Opsgenie / Slack Notifications)                  |
+-------------------------------------------------------------------------------+
```

---

## 2. Production Dashboard Specifications

### A. API & Web Tier Dashboard
- **Request Rate (RPS):** `rate(http_requests_total[1m])` by route and HTTP status code.
- **Latency Distribution (p50, p95, p99):** `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`.
- **HTTP Error Rate:** Percentage of 4xx and 5xx responses over total requests.
- **Active SSE Streams:** Gauge tracking concurrent live job progress connections (`sse_active_connections`).

### B. Database & Cache Dashboard
- **PostgreSQL Pool Utilization:** Active connections vs maximum pool size (20/pod) (`db_pool_active_connections` / `db_pool_max_connections`).
- **Database Query Latency:** Average duration of parameterized queries and transaction blocks.
- **Redis Connectivity & Latency:** Redis ping response time and sliding-window rate limit checks.

### C. Background Queue & Worker Dashboard
- **BullMQ Queue Depths:** Number of waiting, active, and delayed jobs in `webhook-processing`, `repository-analysis`, and `rag-indexing` queues.
- **Job Processing Duration:** Time taken per repository analysis and AST indexing run.
- **Job Failure & Retry Rate:** Rate of jobs entering retry or failed status.

### D. External Dependencies & AI Integrations
- **GitHub API Rate Limit Depletion:** Remaining quota on GitHub App installation tokens.
- **GitHub API Response Latency:** Time taken to fetch repository trees and pull request diffs.
- **AI LLM Latency & Error Rate:** Gemini / OpenAI request duration, rate limit throttles (429), and fallback activations.
- **Webhook Ingestion Volume:** Incoming deliveries vs HMAC verification failures.

---

## 3. Recommended Production Alerting Rules

| Alert Name | Metric Condition | Severity | Evaluation Window | Recommended Response Action |
|---|---|---|---|---|
| `HighHttp5xxRate` | Error rate > 1.0% | **SEV-1** | 3 minutes | Page On-Call SRE; inspect recent deployments and error logs. |
| `HighApiLatencyP95` | p95 Latency > 2,000 ms | **SEV-2** | 5 minutes | Inspect database slow queries and CPU utilization. |
| `DatabaseDown` | `/api/health/ready` reports DB unreachable | **SEV-1** | 1 minute | Check PostgreSQL instance status and network connectivity. |
| `RedisDown` | `/api/health/ready` reports Redis unreachable | **SEV-2** | 1 minute | Inspect Redis service; verify in-memory fallback operation. |
| `QueueBacklogSpike` | Queue depth > 200 jobs *(REQUIRES BASELINE)* | **SEV-2** | 10 minutes | Scale background worker replicas. |
| `WorkerCrashLoop` | Worker restart count > 3 in 10 mins | **SEV-1** | 10 minutes | Inspect worker logs for unhandled exceptions or OOM errors. |
| `GitHubRateLimitExhaustion` | Remaining rate limit < 100 requests | **SEV-2** | 5 minutes | Verify token rotation; check for runaway ingestion loops. |
| `WebhookVerificationFailureSpike` | HMAC failures > 20/min | **SEV-3** | 5 minutes | Inspect potential webhook secret mismatch or spoofing attempts. |
| `TlsCertExpiringSoon` | Certificate validity < 15 days | **SEV-3** | 24 hours | Renew TLS certificate via Let's Encrypt / Cloud provider ACM. |
| `HighPodMemoryUsage` | Memory utilization > 85% *(REQUIRES BASELINE)* | **SEV-2** | 5 minutes | Investigate potential memory leak or trigger autoscaling. |
