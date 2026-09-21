# DevPilot Production Runbook & Operations Guide

**System:** DevPilot Platform  
**Target Environment:** Production / Staging  
**Document Version:** 2.0.0 (Production Phase 5 Hardened)  

---

## 1. Production Deployment Procedure

### A. Pre-Deployment Validation
Run the automated pre-flight checks locally or in staging:
```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Unit & Integration Tests (381 tests)
npm test

# 4. Production Build Verification
npm run build
```

### B. Container Image Build & Tagging
Never use `latest` as the sole deployment identifier. Use immutable commit SHA and semver tags:
```bash
# Define deployment tags
export COMMIT_SHA=$(git rev-parse --short HEAD)
export RELEASE_TAG="v1.0.0"

# Build production container
docker build -t ghcr.io/devpilot/devpilot:${COMMIT_SHA} -t ghcr.io/devpilot/devpilot:${RELEASE_TAG} .

# Run container locally for smoke test
docker run -d --name devpilot-smoke -p 3005:3005 \
  -e NODE_ENV=production \
  -e SESSION_SECRET="example_secret_for_local_smoke_test_only_replace_in_prod" \
  ghcr.io/devpilot/devpilot:${COMMIT_SHA}

# Verify liveness
curl -f http://localhost:3005/api/health/live
docker rm -f devpilot-smoke
```

---

## 2. Rollback Procedure

If a critical regression or failure is detected in production:
1. **Container Image Rollback:**
   ```bash
   # Re-point Kubernetes deployment / ECS task definition to previous known-good image SHA
   kubectl set image deployment/devpilot-api devpilot=ghcr.io/devpilot/devpilot:<PREVIOUS_STABLE_SHA>
   kubectl rollout status deployment/devpilot-api
   ```
2. **Database Rollback Compatibility:**
   - DevPilot schema migrations follow the **expand-contract** pattern. New columns and tables are created additively (`IF NOT EXISTS`). Rolling back the container image to version $N-1$ is backwards-compatible and does not break existing database queries.
3. **Queue Drain & Recovery:**
   - Unprocessed BullMQ jobs will continue processing under previous worker version.

---

## 3. Database Migrations

### A. Migration Execution Procedure
Database DDL is stored in `src/lib/db/schema.sql` and uses strictly idempotent statements.
```bash
# Execute schema migration against target PostgreSQL database
psql "$DATABASE_URL" -f src/lib/db/schema.sql
```

### B. Rules of Migration Safety
- **Never** include `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE` in automatic startup scripts.
- Schema changes that rename columns must be executed across two release phases (1: add new column and dual-write; 2: switch reads and drop old column).
- Always verify vector extension presence: `CREATE EXTENSION IF NOT EXISTS vector;`.

---

## 4. Database Backup Strategy

### A. Schedule & Retention
- **Daily Full Snapshot:** Automated snapshot taken daily at 02:00 UTC, retained for 30 days.
- **Continuous WAL Archiving:** Point-in-time recovery (PITR) enabled with 7-day retention.
- **RPO Target:** < 1 hour.
- **RTO Target:** < 30 minutes.

### B. Manual Backup Command
```bash
# Take a point-in-time compressed backup
pg_dump "$DATABASE_URL" --format=custom --no-owner --file="devpilot_backup_$(date +%Y%m%d_%H%M%S).dump"
```

---

## 5. Database Restore Procedure

To restore database to an isolated environment or disaster recovery instance:
```bash
# 1. Provision target clean PostgreSQL 16 database
createdb -h "$PGHOST" -U "$PGUSER" devpilot_recovery

# 2. Enable pgvector extension
psql -d devpilot_recovery -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 3. Restore data from dump file
pg_restore -h "$PGHOST" -U "$PGUSER" -d devpilot_recovery --clean --if-exists "devpilot_backup_<timestamp>.dump"

# 4. Verify table integrity
psql -d devpilot_recovery -c "SELECT count(*) FROM repositories; SELECT count(*) FROM rag_chunks;"
```

---

## 6. Worker Restart & Management

BullMQ background queue workers process asynchronous repository ingestions, code analyses, and webhook deliveries.
```bash
# Graceful worker restart (Docker / systemd)
docker restart devpilot-worker

# Or scale worker replicas
kubectl scale deployment/devpilot-worker --replicas=3
```
- Inflight jobs are protected by Redis job locks and will be retried automatically if a worker terminates unexpectedly.

---

## 7. Redis Restart & Recovery

Redis 7 provides caching, sliding-window rate limiting, and BullMQ queue state.
```bash
# Restart Redis
docker restart devpilot-redis
```
- If Redis is temporarily down, the DevPilot application gracefully falls back to bounded in-memory rate limiting and synchronous processing without dropping inbound requests.

---

## 8. Health Checks & Readiness Monitoring

The platform provides 3 distinct probe endpoints:
1. **Liveness Probe:** `GET /api/health/live`
   - Purpose: Validates process responsive state. Returns HTTP 200 `{"status": "alive"}`.
2. **Readiness Probe:** `GET /api/health/ready`
   - Purpose: Evaluates PostgreSQL and Redis connection pool availability. Returns HTTP 200 if ready, HTTP 503 if critical dependencies are unreachable.
3. **Comprehensive Diagnostics:** `GET /api/health`
   - Purpose: Aggregated telemetry for dashboard and SRE monitoring.

---

## 9. GitHub Outage / Rate Limit Handling

- **Symptom:** GitHub API returns 403 Forbidden or 429 Too Many Requests.
- **Remediation:**
  1. Inspect `/api/health` to verify GitHub App token validity.
  2. Single-flight coalescer prevents duplicate concurrent calls for identical repositories.
  3. The system respects `x-ratelimit-reset` timestamps and aborts long-running requests gracefully.

---

## 10. AI Provider Outage & Failover

- **Symptom:** Google Gemini or OpenAI endpoints respond with 502/504 or timeout.
- **Remediation:**
  1. DevPilot RAG and analysis engines automatically fall back to deterministic AST and rule-based code synthesis.
  2. To switch providers, update `GEMINI_API_KEY` or `OPENAI_API_KEY` in environment secrets.

---

## 11. Emergency Shutdown Procedure

In the event of a critical security incident or upstream compromise:
```bash
# 1. Scale web and worker pods to 0
kubectl scale deployment/devpilot-api --replicas=0
kubectl scale deployment/devpilot-worker --replicas=0

# 2. Revoke active OAuth and App installation tokens in GitHub Developer Settings

# 3. Rotate SESSION_SECRET and database passwords
```

---

## 12. Secret Rotation Procedure

1. **Session Secret (`SESSION_SECRET`):**
   - Generate new 64-char key: `openssl rand -hex 32`
   - Update in secret manager and restart application. Existing user sessions will prompt for re-authentication.
2. **GitHub App Private Key (`GITHUB_APP_PRIVATE_KEY`):**
   - Generate new private key in GitHub App settings.
   - Deploy new PEM string to secret manager. Delete old key from GitHub after verification.
3. **Database Credentials (`DATABASE_URL`):**
   - Update PostgreSQL user password and connection string in secret manager.

---

## 13. Incident Response Severity Matrix

| Severity | Definition | Response SLA | Action Required |
|---|---|---|---|
| **SEV-1 (Critical)** | Core service unavailable, data corruption, active security breach | < 15 minutes | Page on-call SRE; execute Emergency Shutdown or Rollback if necessary. |
| **SEV-2 (High)** | Background queues backed up, AI provider failure, degraded performance | < 1 hour | Inspect `/api/metrics` and Redis connection pool; restart workers. |
| **SEV-3 (Medium)** | Non-critical UI glitch, isolated single-repo ingestion failure | < 24 hours | Create bug ticket; inspect telemetry trace ID in logs. |
