# DevPilot — Production Infrastructure Cost Estimation & Sizing Checklist

**Phase:** Production Phase 6 — Staging Deployment Readiness  
**Mode:** READ-ONLY AUDIT  
**Commit:** `f8d8538`  
**Purpose:** Comprehensive architectural inventory of cost drivers for production cloud hosting.

---

## 1. Cloud Infrastructure Cost Drivers Matrix

*(Note: Pricing across cloud providers fluctuates based on region, volume discounts, reserved commitments, and data egress. All pricing figures require specific provider quotes at deployment time).*

| Infrastructure Component | Staging Sizing Baseline | Production Sizing Baseline | Cost Driver / Dimension | Pricing Status |
|---|---|---|---|---|
| **Web / API Service** | 1 instance (0.5 vCPU, 512 MB RAM) | 2–4 instances (1.0 vCPU, 1.0 GB RAM) | vCPU-hours + RAM-hours (ECS Fargate / Cloud Run / Kubernetes) | **PRICE REQUIRES CURRENT PROVIDER QUOTE** |
| **Background Workers** | 1 instance (0.5 vCPU, 512 MB RAM) | 2 instances (1.0 vCPU, 1.0 GB RAM) | Compute hours for BullMQ worker tasks | **PRICE REQUIRES CURRENT PROVIDER QUOTE** |
| **PostgreSQL 16 + pgvector** | 1 instance (1 vCPU, 2 GB RAM, 20 GB SSD) | Multi-AZ (2 vCPU, 4–8 GB RAM, 50–100 GB SSD) | DB instance hours + Provisioned IOPS + Storage GB | **PRICE REQUIRES CURRENT PROVIDER QUOTE** |
| **Redis 7 Cluster** | 1 instance (Shared / 512 MB) | Primary + Read Replica (1.0 GB RAM) | Redis memory tier + Node hours | **PRICE REQUIRES CURRENT PROVIDER QUOTE** |
| **Load Balancer / Ingress** | 1 ALB / Managed Ingress | Multi-AZ Application Load Balancer | ALB hours + Processed LCU / Data processed | **PRICE REQUIRES CURRENT PROVIDER QUOTE** |
| **Container Registry** | GHCR / ECR Repository (10 GB) | GHCR / ECR Repository (50 GB) | Storage GB/month + Outbound Data transfer | **PRICE REQUIRES CURRENT PROVIDER QUOTE** |
| **Secret Manager** | 10–15 secrets | 15–20 secrets | Stored secret count + API secret retrieval calls | **PRICE REQUIRES CURRENT PROVIDER QUOTE** |
| **Observability & Logs** | 7-day retention (5 GB/mo) | 30-day retention (20–50 GB/mo) | Ingested log GB + Trace spans + Metrics storage | **PRICE REQUIRES CURRENT PROVIDER QUOTE** |
| **Database Backups** | 7-day PITR (20 GB) | 30-day Snapshots + 7-day PITR (100 GB) | Backup snapshot storage GB/month | **PRICE REQUIRES CURRENT PROVIDER QUOTE** |
| **External AI API Calls** | Pay-as-you-go Staging Quotas | Enterprise Tier AI Tokens | Input/Output tokens for Gemini 1.5 & OpenAI | **PRICE REQUIRES CURRENT PROVIDER QUOTE** |
| **Network Data Egress** | < 10 GB/month | 50–200 GB/month | Outbound bandwidth to internet / clients | **PRICE REQUIRES CURRENT PROVIDER QUOTE** |

---

## 2. Infrastructure Cost Optimization Strategies

1. **Autoscaling Ingress Tier:**
   - Configure horizontal pod autoscaling (HPA) targeting 70% CPU so capacity scales down during low-traffic overnight hours.
2. **Database Sizing Tier:**
   - Start with medium provisioned RDS instance (`db.t4g.medium` or equivalent); scale compute independently of storage via auto-expanding SSD volumes.
3. **Redis Memory Tiering:**
   - Set Redis `maxmemory-policy: volatile-lru` with 5-minute TTL on repository caches to avoid over-allocating expensive in-memory RAM.
4. **Log Retention Archiving:**
   - Stream high-volume access logs to cost-effective S3/GCS object storage with 90-day lifecycle transitions to cold archive tiers.
