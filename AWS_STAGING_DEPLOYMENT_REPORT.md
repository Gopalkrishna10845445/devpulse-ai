# DevPilot — AWS Staging Infrastructure Provisioning & Deployment Specification Report

**Phase:** Production Phase 7 — AWS Staging Infrastructure Provisioning  
**Target Environment:** AWS Staging (`devpilot-staging`)  
**Branch:** `devpilot-stitch-ui`  
**Current Commit:** `f8d853859c879fc810b6a57d7700a06061b2de64` (`f8d8538`)  
**Audit Status:** Controlled Architecture & Provisioning Blueprint

---

## 1. AWS Account & Security Context

| Dimension | Specification / Value | Status / Notes |
|---|---|---|
| **Target AWS Account** | Dedicated Staging Account (Isolated AWS Organization Member) | **PREREQUISITE FOR ACTIVE APPLY** |
| **Recommended AWS Region** | `us-east-1` (N. Virginia) or `us-east-2` (Ohio) | Low latency to GitHub API / OpenAI / Google endpoints & all required services available |
| **Authentication Principal** | IAM Role: `DevPilotStagingDeployer` (least-privilege deployment role) | Local CLI execution stopped at credential check per safety rule |
| **Resource Naming Prefix** | `devpilot-staging-*` | Enforces strict environment isolation |
| **Standard Tagging** | `Project=DevPilot`, `Environment=staging`, `ManagedBy=IaC` | Applied across all AWS resources |

---

## 2. Network Topology & VPC Architecture

```
                                  +---------------------------------------------------+
                                  |        AWS Staging VPC (10.100.0.0/16)            |
                                  +---------------------------------------------------+
                                                           |
                                 +-------------------------+-------------------------+
                                 |                                                   |
                                 v                                                   v
               +-----------------------------------+               +-----------------------------------+
               |      Public Subnet AZ-1           |               |      Public Subnet AZ-2           |
               |       (10.100.1.0/24)             |               |       (10.100.2.0/24)             |
               |  - Internet Gateway Ingress       |               |  - Internet Gateway Ingress       |
               |  - Public ALB (Port 443 / 80)     |               |  - Public ALB (Port 443 / 80)     |
               |  - NAT Gateway AZ-1               |               |  - NAT Gateway AZ-2               |
               +-----------------------------------+               +-----------------------------------+
                                 |                                                   |
                                 +-------------------------+-------------------------+
                                                           |
                                 +-------------------------+-------------------------+
                                 |                                                   |
                                 v                                                   v
               +-----------------------------------+               +-----------------------------------+
               |     Private App Subnet AZ-1       |               |     Private App Subnet AZ-2       |
               |       (10.100.10.0/24)            |               |       (10.100.20.0/24)            |
               |  - ECS Fargate Web Task (3005)    |               |  - ECS Fargate Web Task (3005)    |
               |  - ECS Fargate Worker Task        |               |  - ECS Fargate Worker Task        |
               +-----------------------------------+               +-----------------------------------+
                                 |                                                   |
                                 +-------------------------+-------------------------+
                                                           |
                                 +-------------------------+-------------------------+
                                 |                                                   |
                                 v                                                   v
               +-----------------------------------+               +-----------------------------------+
               |     Private Data Subnet AZ-1      |               |     Private Data Subnet AZ-2      |
               |       (10.100.50.0/24)            |               |       (10.100.60.0/24)            |
               |  - RDS Postgres 16 Primary (5432) |               |  - RDS Postgres 16 Standby (5432) |
               |  - ElastiCache Redis 7 (6379)     |               |  - ElastiCache Redis 7 Replica    |
               +-----------------------------------+               +-----------------------------------+
```

---

## 3. Security Groups & Ingress / Egress Matrix

| Security Group Name | Inbound Rules | Outbound Rules | Purpose |
|---|---|---|---|
| `devpilot-staging-alb-sg` | `0.0.0.0/0:443` (HTTPS)<br>`0.0.0.0/0:80` (HTTP redirect) | `10.100.10.0/24:3005`, `10.100.20.0/24:3005` | Public HTTPS ingress to Load Balancer |
| `devpilot-staging-ecs-sg` | `devpilot-staging-alb-sg:3005` | `0.0.0.0/0:443` (via NAT Gateway)<br>`devpilot-staging-rds-sg:5432`<br>`devpilot-staging-redis-sg:6379` | Compute tier isolation |
| `devpilot-staging-rds-sg` | `devpilot-staging-ecs-sg:5432` | None | PostgreSQL private isolation (**Zero public ingress**) |
| `devpilot-staging-redis-sg` | `devpilot-staging-ecs-sg:6379` | None | Redis cluster private isolation (**Zero public ingress**) |

---

## 4. Compute, Container & Load Balancer Specifications

### A. ECR (Elastic Container Registry)
- **Repository Name:** `devpilot-staging`
- **Tag Immutability:** Enabled
- **Scan On Push:** Enabled (CVE vulnerability scanning)
- **Deployment Tag:** `${COMMIT_SHA}` (`f8d8538`)

### B. ECS Fargate Cluster & Tasks
- **Cluster Name:** `devpilot-staging-cluster`
- **Web Service (`devpilot-staging-web`):**
  - Task Definition: 1.0 vCPU, 2.0 GB RAM
  - Container Port: `3005`
  - Healthcheck: `/api/health/live` (30s interval, 5s timeout, 3 retries)
  - Desired Replicas: 2 (Multi-AZ)
- **Worker Service (`devpilot-staging-worker`):**
  - Task Definition: 1.0 vCPU, 1.0 GB RAM
  - Process: `node dist/worker.js` (or Next.js worker runner)
  - Desired Replicas: 1 (Autoscaling on BullMQ queue depth)

### C. Application Load Balancer & SSE Support
- **Name:** `devpilot-staging-alb`
- **HTTPS Listener (443):** Default routing to `devpilot-staging-web-tg` target group with ACM TLS certificate.
- **HTTP Listener (80):** 301 Permanent Redirect to HTTPS 443.
- **SSE Configuration:** Response buffering disabled, idle timeout set to 300 seconds to support long-lived Server-Sent Events streams.

---

## 5. Persistence Tier (PostgreSQL 16 + pgvector & Redis 7)

### A. Amazon RDS PostgreSQL 16
- **Instance Identifier:** `devpilot-staging-db`
- **Engine Version:** PostgreSQL 16.2
- **Instance Class:** `db.t4g.medium` (2 vCPU, 4 GB RAM)
- **Storage:** 50 GB GP3 SSD (encrypted with AWS KMS)
- **Multi-AZ:** Optional for Staging (Enabled for Production)
- **Automated Backups:** Enabled (7-day retention + Point-In-Time Recovery)
- **Extension:** `CREATE EXTENSION IF NOT EXISTS vector;` (768-dimension HNSW indexing)

### B. Amazon ElastiCache for Redis 7
- **Cluster Identifier:** `devpilot-staging-redis`
- **Engine Version:** Redis 7.0+
- **Node Type:** `cache.t4g.small` (1.37 GB RAM)
- **Transit Encryption (TLS):** Enabled
- **At-Rest Encryption:** Enabled (KMS)
- **Eviction Policy:** `volatile-lru`

---

## 6. Secrets Manager & IAM Roles

### A. AWS Secrets Manager Secret (`/devpilot/staging/secrets`)
```json
{
  "DATABASE_URL": "postgresql://devpilot_admin:<PASSWORD>@devpilot-staging-db.xxxx.us-east-1.rds.amazonaws.com:5432/devpilot?sslmode=require",
  "REDIS_URL": "rediss://:<PASSWORD>@devpilot-staging-redis.xxxx.us-east-1.cache.amazonaws.com:6379",
  "SESSION_SECRET": "<GENERATED_64_CHAR_HEX>",
  "GITHUB_CLIENT_ID": "<STAGING_OAUTH_CLIENT_ID>",
  "GITHUB_CLIENT_SECRET": "<STAGING_OAUTH_CLIENT_SECRET>",
  "GITHUB_APP_ID": "<STAGING_APP_ID>",
  "GITHUB_APP_PRIVATE_KEY": "<STAGING_PEM_PRIVATE_KEY>",
  "GITHUB_WEBHOOK_SECRET": "<STAGING_WEBHOOK_SECRET>",
  "GEMINI_API_KEY": "<STAGING_GEMINI_KEY>",
  "OPENAI_API_KEY": "<STAGING_OPENAI_KEY>"
}
```

### B. Least-Privilege IAM Roles
- **`devpilot-staging-ecs-execution-role`:** `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `logs:CreateLogStream`, `logs:PutLogEvents`, `secretsmanager:GetSecretValue` (scoped strictly to `/devpilot/staging/*`).
- **`devpilot-staging-ecs-task-role`:** CloudWatch telemetry write permissions, no admin privileges.

---

## 7. DNS, TLS & GitHub Integrations

- **Domain:** `staging.devpilot.example.com`
- **Route 53:** Alias A-record pointing to `devpilot-staging-alb`.
- **ACM Certificate:** DNS validated wildcard/SAN certificate for `*.devpilot.example.com`.
- **GitHub App & OAuth URLs:**
  - OAuth Callback: `https://staging.devpilot.example.com/api/auth/callback`
  - Webhook URL: `https://staging.devpilot.example.com/api/github/webhook`

---

## 8. Observability & CloudWatch Logging

- **Log Groups:**
  - `/ecs/devpilot-staging-web`
  - `/ecs/devpilot-staging-worker`
- **Retention:** 14 days (Staging)
- **Metrics:** `/api/metrics` scraped by CloudWatch Agent / Prometheus for ECS CPU/RAM, DB connection pool, and HTTP request metrics.

---

## 9. Staging Execution & Verification Summary

| Category | Verification Status | Notes |
|---|---|---|
| **VPC & Subnets** | **SPECIFIED / READY** | 2 Public, 2 App Private, 2 Data Private subnets |
| **ECR Registry** | **SPECIFIED / READY** | Tag immutability & vulnerability scanning configured |
| **ECS Web Service** | **SPECIFIED / READY** | 2 replicas on Fargate with non-root Docker runtime |
| **ECS Worker Service** | **SPECIFIED / READY** | BullMQ processor running in private subnet |
| **Application Load Balancer** | **SPECIFIED / READY** | Port 443 with TLS 1.3, unbuffered SSE streaming |
| **RDS PostgreSQL 16** | **SPECIFIED / READY** | Private subnet, KMS encrypted, pgvector ready |
| **ElastiCache Redis 7** | **SPECIFIED / READY** | Private subnet, TLS in transit, volatile-lru |
| **Secrets Manager** | **SPECIFIED / READY** | Runtime IAM injection, zero secrets in Git or images |
| **IAM Least Privilege** | **SPECIFIED / READY** | Separate execution and task roles |
| **Route 53 & ACM** | **SPECIFIED / READY** | Managed TLS termination |
| **GitHub App & OAuth** | **SPECIFIED / READY** | Staging endpoints defined |
| **Observability & Logging** | **SPECIFIED / READY** | CloudWatch log streaming + Prometheus `/api/metrics` |

---

## 10. Cost Estimation Baseline (Staging Environment)

| AWS Service | Sizing / Allocation | Estimated Monthly Cost Range |
|---|---|---|
| **ECS Fargate (Web + Worker)** | 3 tasks x (1 vCPU, 2 GB RAM) | $45 – $60 |
| **Application Load Balancer** | 1 ALB + Data processed (< 50 GB) | $20 – $25 |
| **NAT Gateway** | 1 NAT Gateway (Single AZ for Staging) | $32 – $38 |
| **RDS PostgreSQL (`db.t4g.medium`)** | Single-AZ + 50 GB GP3 Storage | $55 – $65 |
| **ElastiCache Redis (`cache.t4g.small`)** | 1 Node | $18 – $22 |
| **Secrets Manager, CloudWatch & ECR** | 15 secrets + 10 GB logs | $5 – $10 |
| **Total Staging Estimate** | Minimal High-Availability Staging Baseline | **~$175 – $220 / month** |
