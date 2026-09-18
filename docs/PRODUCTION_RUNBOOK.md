# DevPilot Production Runbook & Operations Guide

**System:** DevPilot Platform  
**Target Environment:** Production / Staging  
**Document Version:** 1.0.0  

---

## 1. Quick Start & Production Deployment

### Prerequisites
- **Node.js:** 20.x or higher LTS
- **Package Manager:** `npm` 10.x or higher
- **Container Runtime:** Docker 24.x+ (if deploying via container)

### Environment Variables
Configure the following in `.env.local` or your orchestration platform (Kubernetes / ECS / Cloud Run):

| Variable | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | No | Application HTTP listening port | `3005` |
| `GITHUB_TOKEN` | Recommended | GitHub Personal Access Token (5,000 req/hr) | `ghp_...` |
| `GEMINI_API_KEY` | Optional | Google Gemini API Key for LLM RAG & Fixes | `AIzaSy...` |
| `OPENAI_API_KEY` | Optional | OpenAI API Key (alternative LLM provider) | `sk-...` |
| `GITHUB_WEBHOOK_SECRET` | Required for Webhooks | Secret for verifying HMAC signatures | `whsec_...` |

### Bare Metal / VM Deployment
```bash
# 1. Clone repository
git clone <repo-url> devpilot
cd devpilot

# 2. Install production dependencies
npm ci

# 3. Build optimized Next.js bundle
npm run build

# 4. Start production server
npm start
```

### Docker Deployment
```bash
# Build production image
docker build -t devpilot:latest .

# Run container
docker run -d \
  -p 3005:3005 \
  -e NODE_ENV=production \
  -e GITHUB_TOKEN="ghp_..." \
  -e GEMINI_API_KEY="AIzaSy..." \
  -e GITHUB_WEBHOOK_SECRET="whsec_..." \
  --name devpilot-app \
  devpilot:latest
```

---

## 2. Health Checks & Monitoring

### Liveness & Readiness Probe
- **Endpoint:** `GET /api/health`
- **Expected Response Code:** `200 OK`
- **Expected Payload:**
```json
{
  "status": "healthy",
  "service": "devpilot-ai",
  "version": "1.0.0",
  "uptimeSeconds": 1420,
  "timestamp": "2026-09-18T08:30:00.000Z",
  "environment": "production",
  "dependencies": {
    "githubApi": {
      "configured": true,
      "mode": "authenticated (5,000 req/hr)"
    },
    "aiEngine": {
      "configured": true,
      "provider": "google-gemini"
    },
    "webhooks": {
      "configured": true,
      "signatureVerification": "enforced"
    },
    "vectorStore": {
      "isLoaded": true,
      "cachedRepositories": 1
    },
    "jobManager": {
      "activeJobs": 0,
      "totalCompletedJobs": 12
    }
  }
}
```

---

## 3. Production Smoke-Test Checklist

Verify core capabilities after any release or deployment:

- [ ] **1. Health Probe:** `GET /api/health` returns HTTP 200 with `status: "healthy"`.
- [ ] **2. GitHub Intelligence:** Load repository list via `/api/repository/list?username=octocat`.
- [ ] **3. Repository Ingestion:** POST `/api/repository/ingest` with `fullName: "octocat/Hello-World"` succeeds.
- [ ] **4. Repository Indexing:** POST `/api/repository/index` with `repositoryId: "octocat/Hello-World"` returns indexed chunks.
- [ ] **5. Codebase Q&A (RAG):** POST `/api/repository/ask` with question returns grounded answer with valid citations.
- [ ] **6. Engineering Intelligence:** POST `/api/repository/engineering` returns health score, layer breakdown, and dependency matrix.
- [ ] **7. Security Intelligence:** POST `/api/repository/security` scans repository and outputs findings with zero secret leakage.
- [ ] **8. AI Fix Proposal:** POST `/api/repository/fix` generates unified diff patch.
- [ ] **9. PR Review Engine:** POST `/api/github/pull-request/review` analyzes diff and reports impact metrics.
- [ ] **10. Webhook Ingestion:** Ingest ping event via POST `/api/github/webhook` with HMAC signature.
- [ ] **11. Autonomous Agent:** POST `/api/agent/run` completes multi-step reasoning plan within budget limits.
- [ ] **12. Frontend Navigation:** All navigation tabs (Codebase, Q&A, Engineering, Security, PRs, Events, Agent) render seamlessly across screen sizes.

---

## 4. Incident Response & Troubleshooting

### Scenario A: GitHub API Rate Limiting (HTTP 429)
- **Symptom:** Ingestion or PR reviews fail with `RATE_LIMITED`.
- **Cause:** `GITHUB_TOKEN` is missing (anonymous pool limited to 60 req/hr) or shared token is exhausted.
- **Remediation:**
  1. Verify token presence in environment: check `/api/health`.
  2. Set or rotate `GITHUB_TOKEN` with a valid fine-grained or classic token (`public_repo` read scope).
  3. Restart container or trigger graceful reload.

### Scenario B: LLM Provider Timeout or Outage (HTTP 502 / 504)
- **Symptom:** RAG Q&A or AI fix generation times out.
- **Remediation:**
  1. The platform automatically falls back to deterministic rule synthesis.
  2. If switching providers, update `GEMINI_API_KEY` or `OPENAI_API_KEY` in environment variables.

### Scenario C: Webhook Signature Verification Failures (HTTP 401)
- **Symptom:** GitHub webhooks return 401 Unauthorized.
- **Remediation:**
  1. Compare `GITHUB_WEBHOOK_SECRET` in environment against the Webhook Secret configured in GitHub repository settings.
  2. Ensure reverse proxies or load balancers pass the raw body without altering whitespace or encoding.

### Scenario D: Stale Commit Rejection on Agent Action
- **Symptom:** User approval rejected with `STALE_COMMIT`.
- **Cause:** The repository default branch advanced with new commits between proposal generation and human approval.
- **Remediation:**
  1. Re-run agent or fix generator to inspect the latest commit SHA.
  2. Confirm proposal against the updated base tree.

---

## 5. Rollback Procedure

If a critical defect is identified post-deployment:
1. **Container Rollback:** Revert orchestrator image tag to previous stable build (`docker pull devpilot:<previous-stable-tag>`).
2. **Git Rollback:** Checkout previous release tag and execute `npm run build && npm start`.
3. **Verify:** Run the smoke-test checklist against `/api/health`.
