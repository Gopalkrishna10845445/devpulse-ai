# DevPilot — Production & Staging Environment Variable Inventory

**Phase:** Production Phase 6 — Staging Deployment Readiness  
**Mode:** READ-ONLY AUDIT  
**Commit:** `f8d8538`  
**Security Standard:** Strict Least-Privilege & Zero Client-Side Secret Leakage

---

## 1. Environment Variable Matrix

| Variable Name | Purpose / Function | Required? | Is Secret? | Staging Value Source | Production Value Source | Client / Server Scope |
|---|---|---|---|---|---|---|
| `NODE_ENV` | Runtime environment mode (`production` / `development`) | **Yes** | No | Set statically in container runtime (`production`) | Set statically in container runtime (`production`) | Server Only |
| `PORT` | Application HTTP listen port (default: 3005) | No | No | Set statically (`3005`) | Set statically (`3005`) | Server Only |
| `DATABASE_URL` | PostgreSQL 16 + pgvector pooled connection URI | **Yes** (Prod) | **YES** | Staging RDS / Cloud SQL instance via Secret Manager | Production Multi-AZ RDS / Cloud SQL via Secret Manager | Server Only |
| `REDIS_URL` | Redis 7 connection URI (cache, limits & BullMQ) | **Yes** (Prod) | **YES** | Staging ElastiCache / Redis Cloud via Secret Manager | Production Redis Cluster via Secret Manager | Server Only |
| `SESSION_SECRET` | 64-character random hex key for HMAC session cookie signing | **Yes** | **YES** | Staging Secret Manager (`openssl rand -hex 32`) | Production Secret Manager (`openssl rand -hex 32`) | Server Only |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID for developer login | **Yes** (Auth) | No | Staging GitHub OAuth App Settings | Production GitHub OAuth App Settings | Server Only |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret for code exchange | **Yes** (Auth) | **YES** | Staging Secret Manager | Production Secret Manager | Server Only |
| `GITHUB_OAUTH_REDIRECT_URI` | Whitelisted OAuth authorization callback redirect URL | **Yes** (Auth) | No | `https://staging.devpilot.example.com/api/auth/callback` | `https://devpilot.example.com/api/auth/callback` | Server Only |
| `GITHUB_APP_ID` | GitHub App numerical ID for JWT minting | **Yes** (App) | No | Staging GitHub App Settings | Production GitHub App Settings | Server Only |
| `GITHUB_APP_PRIVATE_KEY` | RSA Private Key (PEM format) for signing installation JWTs | **Yes** (App) | **YES** | Staging Secret Manager | Production Secret Manager | Server Only |
| `GITHUB_WEBHOOK_SECRET` | Secret token for validating HMAC-SHA256 webhook signatures | **Yes** (Hooks) | **YES** | Staging Secret Manager | Production Secret Manager | Server Only |
| `GITHUB_TOKEN` | Optional Personal Access Token (fallback for public repos) | No | **YES** | Staging Secret Manager (Optional) | Production Secret Manager (Optional) | Server Only |
| `GEMINI_API_KEY` | Google Gemini API Key for RAG Q&A, Fixes, & PR Review | Optional | **YES** | Google AI Studio Staging Key via Secret Manager | Google Cloud Enterprise Gemini Key via Secret Manager | Server Only |
| `OPENAI_API_KEY` | OpenAI API Key (alternative / fallback LLM provider) | Optional | **YES** | OpenAI Staging Project Key via Secret Manager | OpenAI Production Organization Key via Secret Manager | Server Only |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry OTLP Collector endpoint for distributed traces | Optional | No | `http://otel-collector.internal:4318` | `https://otel-collector.prod.internal:4318` | Server Only |
| `NEXT_TELEMETRY_DISABLED` | Opt-out of Next.js anonymous build telemetry (`1`) | Recommended | No | Set statically in Dockerfile / CI (`1`) | Set statically in Dockerfile / CI (`1`) | Build & Server |

---

## 2. Secret Storage & Injection Architecture

```
+-------------------------------------------------------------------------------+
|                      Cloud Secret Manager / KMS Vault                         |
|  - DATABASE_URL, REDIS_URL, SESSION_SECRET, GITHUB_APP_PRIVATE_KEY, AI_KEYS  |
+-------------------------------------------------------------------------------+
                                       |
                                       | (Runtime IAM-Authenticated Injection)
                                       v
+-------------------------------------------------------------------------------+
|                       Container Task / Pod Environment                        |
|   (Injected into process.env at container boot; NEVER baked into image layers)|
+-------------------------------------------------------------------------------+
                                       |
                                       v
+-------------------------------------------------------------------------------+
|                     DevPilot Environment Guard (src/lib/env.ts)               |
|   - Redacts keys from structured logs, public probes, and error traces        |
|   - Prevents exposure to frontend components (zero NEXT_PUBLIC_ secret vars)  |
+-------------------------------------------------------------------------------+
```

### Critical Rules:
1. **Never Bake Secrets into Images:** All secrets are strictly injected at runtime via container task definitions (AWS ECS Task Secrets, Kubernetes Secrets, or GCP Cloud Run Secret References).
2. **Zero `NEXT_PUBLIC_` Secrets:** None of the backend infrastructure credentials or API keys may be prefixed with `NEXT_PUBLIC_`.
3. **Secret Rotation Policy:** All production secrets (database passwords, session signing keys, GitHub App private keys) should be rotated on a 90-day cadence.
