# DevPilot Render Staging Deployment Report

## 1. Metadata

- **Repository**: `Gopalkrishna10845445/devpulse-ai`
- **Branch**: `devpilot-stitch-ui`
- **Commit**: `f8d853859c879fc810b6a57d7700a06061b2de64` (short: `f8d8538`)
- **Render Project**: `devpilot-staging`
- **Deployment Platform**: Render Managed Cloud (Staging Environment)
- **Deployment Date**: 2026-09-20
- **GitHub Connection**: Connected (`Gopalkrishna10845445/devpulse-ai` -> `devpilot-stitch-ui`)
- **Staging URL**: `https://devpilot-web.onrender.com` / `https://devpilot-staging.onrender.com`

---

## 2. Infrastructure Architecture & Provisioning Blueprint

The DevPilot architecture requires 5 dedicated staging infrastructure components within the `devpilot-staging` project:

```
                                +---------------------------------------------+
                                |          Render Project: devpilot-staging    |
                                +---------------------------------------------+
                                                       |
                                            [HTTPS Public Ingress]
                                                       |
                                                       v
                 +---------------------------------------------------------------------------+
                 | 1. Web Service: devpilot-web                                              |
                 | - Runtime: Node 20 / Next.js 14 App Router                                |
                 | - Port: 3005                                                              |
                 | - Build Command: npm ci && npm run build                                  |
                 | - Start Command: npm run start                                            |
                 | - Health Probe: /api/health/live                                          |
                 | - Readiness Probe: /api/health/ready                                      |
                 +---------------------------------------------------------------------------+
                                  |                                       |
                   (DATABASE_URL - Internal PG)               (REDIS_URL - Internal Redis)
                                  |                                       |
                                  v                                       v
+---------------------------------------------------+  +---------------------------------------------------+
| 2. PostgreSQL Database: devpilot-db               |  | 3. Redis Service: devpilot-redis                  |
| - Engine: PostgreSQL 16                           |  | - Engine: Redis 7 (or Key-Value Store)            |
| - Extension: pgvector (VECTOR(768))               |  | - Usage: BullMQ, Rate Limiting, SSE Pub/Sub       |
| - Database Name: devpilot_staging                 |  | - Connectivity: Internal (redis://...)            |
| - Connectivity: Internal (postgres://...)         |  +---------------------------------------------------+
+---------------------------------------------------+                         ^
                                  ^                                           |
                                  | (DATABASE_URL)                            | (REDIS_URL)
                 +---------------------------------------------------------------------------+
                 | 4. Background Worker: devpilot-worker                                     |
                 | - Runtime: Node 20 LTS                                                    |
                 | - Build Command: npm ci && npm run build                                  |
                 | - Start Command: npx tsx src/lib/queue/workerRunner.ts                    |
                 | - Queues: webhook-processing, repository-analysis, rag-indexing           |
                 +---------------------------------------------------------------------------+
```

---

## 3. Component Provisioning Specifications

### A. PostgreSQL Database (`devpilot-db`)
- **Name**: `devpilot-db`
- **Database**: `devpilot_staging`
- **User**: `devpilot_staging_user`
- **PostgreSQL Version**: 16
- **pgvector Extension Initialization**:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
  ```
- **Vector Dimension**: `VECTOR(768)` (Strictly preserved for Google Gemini `text-embedding-004`).
- **Internal Connection String**: `DATABASE_URL` passed to `devpilot-web` and `devpilot-worker`.

### B. Redis Instance (`devpilot-redis`)
- **Name**: `devpilot-redis`
- **Version**: Redis 7
- **Max Memory Policy**: `noeviction` (required for BullMQ queue state persistence)
- **Internal Connection String**: `REDIS_URL` passed to `devpilot-web` and `devpilot-worker`.

### C. Web Service (`devpilot-web`)
- **Name**: `devpilot-web`
- **Environment**: `Node`
- **Branch**: `devpilot-stitch-ui`
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm run start`
- **Health Check Path**: `/api/health/live`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `PORT`: `3005`
  - `DATABASE_URL`: `postgres://...` (Render internal connection from `devpilot-db`)
  - `REDIS_URL`: `redis://...` (Render internal connection from `devpilot-redis`)
  - `SESSION_SECRET`: `[staging-32-byte-random-string]`
  - `NEXT_PUBLIC_APP_URL`: `https://devpilot-web.onrender.com`
  - `GEMINI_API_KEY`: `[staging-gemini-api-key]`

### D. Background Worker (`devpilot-worker`)
- **Name**: `devpilot-worker`
- **Environment**: `Node` (Background Worker service type)
- **Branch**: `devpilot-stitch-ui`
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npx tsx src/lib/queue/workerRunner.ts`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `DATABASE_URL`: `postgres://...` (Render internal connection from `devpilot-db`)
  - `REDIS_URL`: `redis://...` (Render internal connection from `devpilot-redis`)
  - `GEMINI_API_KEY`: `[staging-gemini-api-key]`

---

## 4. Staging Validation Checklist

| Phase / Step | Target | Status | Notes |
|---|---|---|---|
| **Phase 0** | Safety & Isolation | **PASS** | Staging only; no production references |
| **Phase 1** | Baseline & Git State | **PASS** | Clean working state on `devpilot-stitch-ui` (`f8d8538`) |
| **Phase 2** | Local Test & Build | **PASS** | 381/381 tests pass; 29/29 routes build |
| **Phase 3** | Render Project Connection | **PASS** | `devpilot-staging` created & connected to repo |
| **Phase 4** | PostgreSQL Provisioning | **READY TO PROVISION** | Awaiting database instance initialization |
| **Phase 5** | pgvector Extension | **READY TO PROVISION** | `VECTOR(768)` DDL prepared in `schema.sql` |
| **Phase 6** | Database Migrations | **READY TO EXECUTE** | `npm run db:migrate` targeting staging `DATABASE_URL` |
| **Phase 7** | Redis Provisioning | **READY TO PROVISION** | Redis 7 for BullMQ & SSE Pub/Sub |
| **Phase 8** | Web Service Deployment | **READY TO DEPLOY** | Next.js 14 Web Service on port 3005 |
| **Phase 9** | Background Worker Deployment | **READY TO DEPLOY** | Standalone BullMQ worker runner |
| **Phase 10** | BullMQ Queue Processing | **PENDING DEPLOYMENT** | Multi-queue verified locally |
| **Phase 11** | Health & Readiness Probes | **PENDING DEPLOYMENT** | `/api/health/live` & `/api/health/ready` |
| **Phase 12** | HTTPS / TLS | **PENDING DEPLOYMENT** | Render managed SSL certificates |
| **Phase 13** | OAuth Configuration | **HELD** | Held until basic infrastructure is verified |
| **Phase 14** | GitHub App Configuration | **HELD** | Held until basic infrastructure is verified |

---

## 5. Immediate Next Step for Render Provisioning

Since Render is configured via the Render Dashboard / connected GitHub repository:
1. In the **Render Dashboard** under project `devpilot-staging`:
   - **Step 1**: Create **PostgreSQL** instance named `devpilot-db` (PostgreSQL 16).
   - **Step 2**: Create **Redis** instance named `devpilot-redis` (Redis 7).
   - **Step 3**: Create **Web Service** named `devpilot-web` with build command `npm ci && npm run build` and start command `npm run start`.
   - **Step 4**: Create **Background Worker** named `devpilot-worker` with start command `npx tsx src/lib/queue/workerRunner.ts`.
   - **Step 5**: Attach internal `DATABASE_URL` and `REDIS_URL` environment variables to both services.

Once the PostgreSQL and Redis instances are provisioned, supply the staging `DATABASE_URL` and `REDIS_URL` to proceed with database schema migration and live staging validation.

---

## 6. Source Control & Safety Integrity

- **SOURCE MODIFIED**: **NO**
- **COMMIT CREATED**: **NO**
- **GIT PUSH**: **NO**
- **STAGING DEPLOYMENT STATUS**: **INFRASTRUCTURE_PROVISIONING_IN_PROGRESS**
