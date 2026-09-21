# DevPilot — Cloud Infrastructure Requirements & Provider Comparison

**Phase:** Production Phase 6 — Staging Deployment Readiness  
**Mode:** READ-ONLY AUDIT  
**Commit:** `f8d8538`  
**Purpose:** Technical evaluation of target cloud infrastructure requirements and provider compatibility matrix.

---

## 1. Technical Infrastructure Requirements Summary

DevPilot requires the following foundational infrastructure capabilities:
1. **Stateless Web/API Tier:** Next.js 14 App Router server capable of long-lived HTTP connections for Server-Sent Events (SSE) and fast cold-starts.
2. **Background Queue Worker Tier:** Long-running Node.js process capable of executing BullMQ background jobs with persistent Redis connections.
3. **Database Tier:** PostgreSQL 16 with native `pgvector` extension for storing 768-dimensional HNSW vector embeddings and relational entities.
4. **Cache & Queue Tier:** Redis 7 with support for atomic sliding-window rate limiting, BullMQ queue state, and Pub/Sub broadcasting.
5. **Ingress & Networking:** Load balancer supporting TLS 1.3, unbuffered SSE response streaming (disabling HTTP proxy buffering), and direct webhook HTTPS ingress.
6. **Secret Management:** Secure runtime injection of RSA private keys, OAuth credentials, and database connection strings without filesystem persistence.

---

## 2. Cloud Provider Technical Comparison Matrix

The following factual comparison evaluates major cloud hosting patterns against DevPilot's architectural requirements. *(No single provider is mandated; selection depends on enterprise standards and operational preferences).*

| Infrastructure Requirement | AWS (ECS Fargate + RDS + ElastiCache) | GCP (Cloud Run / GKE + Cloud SQL + Memorystore) | Microsoft Azure (Container Apps + Azure Postgres + Azure Redis) | PaaS Option (Railway / Render / Fly.io + Managed DBs) | Vercel + Managed Backends (Vercel + Supabase/Neon + Upstash) |
|---|---|---|---|---|---|
| **Next.js Web / API Service** | Supported (ECS Fargate / EKS) | Supported (Cloud Run / GKE) | Supported (Azure Container Apps / AKS) | Supported (Native Web Service) | Supported (Native Next.js Serverless) |
| **Long-Running BullMQ Workers** | Supported (Separate ECS Task / Daemon) | Supported (Cloud Run Jobs / GKE Worker) | Supported (Container Apps Background Worker) | Supported (Separate Worker Service) | Limited (Serverless function execution timeout caps; requires external worker) |
| **PostgreSQL 16 + pgvector** | Supported (Amazon RDS PostgreSQL 16 with pgvector) | Supported (Cloud SQL PostgreSQL 16 with pgvector) | Supported (Azure Database for PostgreSQL Flexible Server with pgvector) | Supported (Railway / Render PostgreSQL with pgvector) | Supported (Supabase / Neon with pgvector) |
| **Redis 7 (BullMQ & Pub/Sub)** | Supported (Amazon ElastiCache for Redis) | Supported (Memorystore for Redis) | Supported (Azure Cache for Redis) | Supported (Native Redis Instance) | Partial (Upstash Redis supports REST, but BullMQ requires persistent TCP Redis protocol) |
| **Server-Sent Events (SSE)** | Supported (ALB unbuffered streaming) | Supported (Cloud Run response streaming enabled) | Supported (Container Apps HTTP streaming) | Supported (Native chunked streaming) | Supported (Vercel Edge/Node streaming with standard timeout limits) |
| **GitHub App Webhook Ingress** | Supported (ALB / API Gateway) | Supported (HTTPS Load Balancer) | Supported (Container Apps Ingress) | Supported (Automatic HTTPS URL) | Supported (Native Serverless Endpoint) |
| **Secret Management** | AWS Secrets Manager / Parameter Store | GCP Secret Manager | Azure Key Vault | Railway / Render Environment Secret Variables | Vercel Environment Variables |
| **OpenTelemetry & Metrics** | AWS Distro for OpenTelemetry / CloudWatch | Google Cloud Trace / Cloud Monitoring | Azure Monitor / Application Insights | Prometheus / Grafana Cloud integration | Datadog / Axiom / Vercel Analytics |
| **Private VPC Network Isolation** | Native VPC + Private Subnets + Security Groups | Native VPC + Private Service Connect | Native Virtual Network (VNet) | Private Networking within project | Backing stores connected via public internet with SSL/TLS |

---

## 3. Detailed Component Sizing & Resource Specifications

### A. Web / API Container (Next.js 14)
- **Container Port:** `3005` (configured via `PORT` environment variable)
- **Liveness Health Check:** `GET /api/health/live` (interval: 30s, timeout: 5s, retries: 3)
- **Readiness Health Check:** `GET /api/health/ready` (interval: 15s, timeout: 5s, retries: 3)
- **Minimum Sizing (Staging):** 0.5 vCPU, 512 MB RAM
- **Recommended Sizing (Production):** 1.0 – 2.0 vCPU, 1.0 – 2.0 GB RAM per replica
- **Autoscaling Metric:** Target CPU utilization > 70% or average latency > 500ms

### B. BullMQ Background Worker
- **Concurrency:** 5 concurrent jobs per worker pod (bounded to prevent GitHub / LLM rate limit exhaustion)
- **Shutdown Grace Period:** 30 seconds (allows inflight analysis and ingestion tasks to complete cleanly)
- **Minimum Sizing (Staging):** 0.5 vCPU, 512 MB RAM
- **Recommended Sizing (Production):** 1.0 vCPU, 1.0 GB RAM per replica

### C. PostgreSQL 16 + pgvector Database
- **Engine Version:** PostgreSQL 16.2+
- **Extensions:** `uuid-ossp`, `vector` (0.6.0+)
- **Storage:** 20 GB baseline with auto-expansion up to 100 GB (GP3 / SSD)
- **Connection Limits:** `max_connections = 100` (Application pool uses max 20 connections per pod)
- **Backup Configuration:** Daily automated snapshot + 7-day WAL Point-in-Time Recovery (PITR)

### D. Redis 7 Key-Value & Queue Store
- **Engine Version:** Redis 7.0+
- **Memory Allocation:** 512 MB – 1.0 GB baseline
- **Eviction Policy:** `volatile-lru` (ensures BullMQ active job keys are preserved while expiring cache items)
- **Persistence:** AOF (Append Only File) or RDB snapshots enabled for queue durability
