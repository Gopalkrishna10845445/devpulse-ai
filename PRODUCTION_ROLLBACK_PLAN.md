# DevPilot — Production Rollback Strategy & Emergency Procedures

**Phase:** Production Phase 6 — Staging Deployment Readiness  
**Mode:** READ-ONLY AUDIT  
**Commit:** `f8d8538`  
**Purpose:** Standard operating procedures for mitigating critical regressions during or following production deployment.

---

## 1. Rollback Decision Matrix

A production rollback must be initiated immediately if any of the following conditions occur within 60 minutes of deployment:

| Trigger Condition | Threshold | Severity | Immediate Action |
|---|---|---|---|
| **Elevated HTTP 5xx Error Rate** | > 1.0% of total requests over 3 consecutive minutes | **SEV-1** | Immediate Container Rollback |
| **High API Latency (p95)** | > 2,000 ms on core endpoints for > 5 minutes | **SEV-1** | Immediate Container Rollback |
| **Database Connection Pool Exhaustion** | > 90% pool utilization with query timeouts | **SEV-1** | Immediate Container Rollback |
| **Worker Queue Starvation / Failures** | > 10% BullMQ job failure rate | **SEV-2** | Worker Rollback |
| **Critical Security / Auth Flaw** | Authorization bypass or secret leakage detected | **SEV-1** | Emergency Rollback & Key Rotation |

---

## 2. Step-by-Step Rollback Execution

### Step 1: Application & Worker Container Rollback (T + 0 to 5 mins)
Roll back Web/API and Worker workloads to the previous stable container image tag:
```bash
# Example Kubernetes deployment rollback
kubectl set image deployment/devpilot-api devpilot=ghcr.io/devpilot/devpilot:<PREVIOUS_STABLE_COMMIT_SHA>
kubectl set image deployment/devpilot-worker devpilot=ghcr.io/devpilot/devpilot:<PREVIOUS_STABLE_COMMIT_SHA>
kubectl rollout status deployment/devpilot-api --timeout=3m

# Example AWS ECS rollback
aws ecs update-service --cluster devpilot-prod --service devpilot-api \
  --task-definition devpilot-api:<PREVIOUS_TASK_REVISION>
```

### Step 2: Database Compatibility Evaluation (Forward Fix vs Rollback)
**CRITICAL RULE:** Do NOT blindly execute database rollbacks (such as restoring backups over live data) if the application rollback resolves the user-facing issue.

1. **Why Schema Rollback is Usually NOT Required:**
   - Because DevPilot migrations follow the additive **Expand-Contract** protocol (`CREATE TABLE IF NOT EXISTS`, nullable new columns), the database schema $N+1$ remains fully compatible with application version $N$.
   - Reverting the application container image allows the previous code version to run seamlessly against the upgraded database without data loss.
2. **When Database Point-In-Time Restore (PITR) IS Required:**
   - A database restore is executed ONLY if widespread data corruption or unintentional record deletion occurred.
   - In that scenario, execute PITR to the timestamp immediately preceding the deployment event.

### Step 3: Redis & BullMQ Queue Drain
1. Revert worker image to drain and reprocess any failed BullMQ jobs.
2. If Redis state is suspected to be corrupted:
   ```bash
   # Flush cache and rate-limit keys without deleting durable queue data
   redis-cli -u "$REDIS_URL" --scan --pattern "devpilot:prod:cache:*" | xargs redis-cli -u "$REDIS_URL" DEL
   ```

### Step 4: Verification & Post-Rollback Smoke Test
1. Confirm `/api/health/live` returns HTTP 200 `status: "alive"`.
2. Confirm `/api/health/ready` returns HTTP 200 `status: "ready"`.
3. Verify error rates drop to baseline (< 0.1%).
4. Initiate incident post-mortem within 24 hours.
