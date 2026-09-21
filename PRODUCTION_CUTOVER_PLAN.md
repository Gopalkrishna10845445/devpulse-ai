# DevPilot — Production Cutover & Deployment Execution Plan

**Phase:** Production Phase 6 — Staging Deployment Readiness  
**Mode:** READ-ONLY AUDIT  
**Commit:** `f8d8538`  
**Standard:** Zero-Downtime Blue/Green or Rolling Deployment Protocol

---

## 1. Production Cutover Execution Sequence

```
[Phase 1: Pre-Flight Staging Audit]
  ├── Verify all 20 Staging Smoke Tests PASS
  └── Confirm zero regressions in Staging OpenTelemetry & error logs
         │
         v
[Phase 2: Database Safeguards & Snapshot]
  ├── Take automated full snapshot of production PostgreSQL
  ├── Verify snapshot integrity and WAL archiving
  └── Confirm pgvector extension presence
         │
         v
[Phase 3: Immutable Container Image Build]
  ├── Build production Docker image tagged with exact Git commit SHA
  ├── Push image to secure Container Registry (GHCR / ECR)
  └── Scan container image for critical/high vulnerabilities
         │
         v
[Phase 4: Database Migration Execution (Pre-Rollout)]
  ├── Execute idempotent schema migration (`src/lib/db/schema.sql`)
  ├── Verify all new tables and indexes are present
  └── Confirm backwards compatibility with currently running pods
         │
         v
[Phase 5: Rolling / Blue-Green Application Deployment]
  ├── Deploy Worker pods with new image
  ├── Deploy Web/API pods with new image (Rolling update: maxSurge 25%, maxUnavailable 0)
  └── Maintain previous pods until readiness probe succeeds
         │
         v
[Phase 6: Health & Readiness Probe Verification]
  ├── Query `GET /api/health/live` on all newly spawned pods (HTTP 200)
  ├── Query `GET /api/health/ready` (Postgres & Redis connected)
  └── Confirm Load Balancer routes traffic to new pods
         │
         v
[Phase 7: Production Smoke Testing]
  ├── Execute automated synthetic smoke tests (OAuth, Ingest, RAG, Webhook, SSE)
  └── Verify zero 5xx spikes in Prometheus metrics
         │
         v
[Phase 8: Active Monitoring & Sign-Off]
  ├── Monitor error rate, p95 latency, and queue backlog for 60 minutes
  └── Declare release successful or trigger Rollback Plan if thresholds violated
```

---

## 2. Database Migration Strategy: Expand-Contract Protocol

DevPilot enforces the **Expand-Contract (Parallel Run)** database migration pattern to guarantee zero-downtime rolling deployments:

1. **Expand Phase (Additive Only):**
   - All migrations in `src/lib/db/schema.sql` utilize `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
   - New columns must either be nullable or define safe default values.
   - Zero destructive commands (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `ALTER COLUMN TYPE`) are permitted during deployment.
2. **Backwards Compatibility Guarantee:**
   - Because all changes are strictly additive, existing application pods (version $N$) continue executing normally while the migration runs and while new pods (version $N+1$) are booting.
3. **Contract Phase (Deferred Cleanup):**
   - Removal of deprecated tables or columns is scheduled for subsequent major releases only after all running pods have transitioned.
