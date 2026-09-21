-- ==============================================================================
-- DevPilot Production Database Schema
-- PostgreSQL 16 + pgvector + Authentication & RBAC
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. User Accounts & Identities
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY, -- e.g. "usr_12345" or UUID
  github_id VARCHAR(128) NOT NULL UNIQUE,
  github_login VARCHAR(128) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  email VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(64) DEFAULT 'MEMBER', -- System role: 'ADMIN' | 'MEMBER'
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_github_login ON users(github_login);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

-- 0.1 User Sessions
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 1. Repositories
CREATE TABLE IF NOT EXISTS repositories (
  id VARCHAR(255) PRIMARY KEY, -- e.g. "octocat/hello-world"
  full_name VARCHAR(255) NOT NULL UNIQUE,
  owner VARCHAR(128) NOT NULL,
  name VARCHAR(128) NOT NULL,
  default_branch VARCHAR(128) NOT NULL DEFAULT 'main',
  description TEXT,
  languages JSONB DEFAULT '{}'::jsonb,
  frameworks JSONB DEFAULT '[]'::jsonb,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repositories_owner ON repositories(owner);
CREATE INDEX IF NOT EXISTS idx_repositories_name ON repositories(name);

-- 1.1 Repository Memberships & RBAC Permissions
CREATE TABLE IF NOT EXISTS repository_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id VARCHAR(255) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  role VARCHAR(64) NOT NULL DEFAULT 'MEMBER', -- 'OWNER' | 'MEMBER' | 'VIEWER'
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_repo_membership UNIQUE (user_id, repository_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON repository_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_repo ON repository_memberships(repository_id);

-- 1.2 GitHub App Installations
CREATE TABLE IF NOT EXISTS github_installations (
  id VARCHAR(255) PRIMARY KEY, -- "inst_12345"
  installation_id BIGINT NOT NULL UNIQUE,
  account_type VARCHAR(64) NOT NULL, -- 'User' | 'Organization'
  account_id BIGINT NOT NULL,
  account_login VARCHAR(128) NOT NULL,
  repository_selection VARCHAR(64) DEFAULT 'all', -- 'all' | 'selected'
  permissions JSONB DEFAULT '{}'::jsonb,
  installed_by_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_github_installations_login ON github_installations(account_login);
CREATE INDEX IF NOT EXISTS idx_github_installations_id ON github_installations(installation_id);


-- 2. Repository Commits (Strict Commit State Isolation)
CREATE TABLE IF NOT EXISTS repository_commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id VARCHAR(255) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  commit_sha VARCHAR(64) NOT NULL,
  branch VARCHAR(128),
  message TEXT,
  author VARCHAR(255),
  committed_at TIMESTAMPTZ,
  indexed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  files_count INT DEFAULT 0,
  chunks_count INT DEFAULT 0,
  CONSTRAINT uq_repo_commit UNIQUE (repository_id, commit_sha)
);

CREATE INDEX IF NOT EXISTS idx_commits_repo_sha ON repository_commits(repository_id, commit_sha);

-- 3. RAG Source Documents
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id VARCHAR(255) NOT NULL,
  commit_sha VARCHAR(64) NOT NULL,
  file_path VARCHAR(1024) NOT NULL,
  content TEXT NOT NULL,
  line_count INT NOT NULL,
  language VARCHAR(64),
  content_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rag_doc_commit FOREIGN KEY (repository_id, commit_sha) 
    REFERENCES repository_commits(repository_id, commit_sha) ON DELETE CASCADE,
  CONSTRAINT uq_rag_doc_file UNIQUE (repository_id, commit_sha, file_path)
);

CREATE INDEX IF NOT EXISTS idx_rag_docs_lookup ON rag_documents(repository_id, commit_sha, file_path);

-- 4. RAG Vector Chunks with pgvector Embeddings
CREATE TABLE IF NOT EXISTS rag_chunks (
  id VARCHAR(255) PRIMARY KEY, -- e.g. "repo@sha:file.ts:1-60"
  repository_id VARCHAR(255) NOT NULL,
  commit_sha VARCHAR(64) NOT NULL,
  file_path VARCHAR(1024) NOT NULL,
  start_line INT NOT NULL,
  end_line INT NOT NULL,
  symbol_name VARCHAR(255),
  symbol_type VARCHAR(64),
  content TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rag_chunk_commit FOREIGN KEY (repository_id, commit_sha) 
    REFERENCES repository_commits(repository_id, commit_sha) ON DELETE CASCADE
);

-- Crucial composite index for strict repository + commit isolation
CREATE INDEX IF NOT EXISTS idx_rag_chunks_scope ON rag_chunks(repository_id, commit_sha);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_file ON rag_chunks(repository_id, commit_sha, file_path);

-- HNSW Vector index for fast cosine distance (<=>) nearest neighbor search
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'rag_chunks' AND indexname = 'idx_rag_chunks_embedding_hnsw'
  ) THEN
    CREATE INDEX idx_rag_chunks_embedding_hnsw ON rag_chunks USING hnsw (embedding vector_cosine_ops);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 5. Engineering Health Reports
CREATE TABLE IF NOT EXISTS engineering_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id VARCHAR(255) NOT NULL,
  commit_sha VARCHAR(64) NOT NULL,
  overall_score INT NOT NULL,
  maintainability_score INT NOT NULL,
  architecture_type VARCHAR(128) NOT NULL,
  cycle_count INT NOT NULL DEFAULT 0,
  layers JSONB DEFAULT '[]'::jsonb,
  hotspot_files JSONB DEFAULT '[]'::jsonb,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_eng_commit FOREIGN KEY (repository_id, commit_sha) 
    REFERENCES repository_commits(repository_id, commit_sha) ON DELETE CASCADE,
  CONSTRAINT uq_eng_report UNIQUE (repository_id, commit_sha)
);

CREATE INDEX IF NOT EXISTS idx_eng_reports_scope ON engineering_reports(repository_id, commit_sha);

-- 6. Security Intelligence Reports
CREATE TABLE IF NOT EXISTS security_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id VARCHAR(255) NOT NULL,
  commit_sha VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL, -- "secure" | "vulnerable"
  total_findings INT NOT NULL DEFAULT 0,
  high_severity INT NOT NULL DEFAULT 0,
  medium_severity INT NOT NULL DEFAULT 0,
  low_severity INT NOT NULL DEFAULT 0,
  findings_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sec_commit FOREIGN KEY (repository_id, commit_sha) 
    REFERENCES repository_commits(repository_id, commit_sha) ON DELETE CASCADE,
  CONSTRAINT uq_sec_report UNIQUE (repository_id, commit_sha)
);

CREATE INDEX IF NOT EXISTS idx_sec_reports_scope ON security_reports(repository_id, commit_sha);

-- 7. Webhook Deliveries & Replay Deduplication
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  delivery_id VARCHAR(255) PRIMARY KEY, -- X-GitHub-Delivery GUID
  event_name VARCHAR(64) NOT NULL,
  action VARCHAR(64),
  repository_id VARCHAR(255) NOT NULL,
  head_sha VARCHAR(64),
  status VARCHAR(64) NOT NULL, -- "processed" | "ignored" | "duplicate" | "failed"
  payload_summary JSONB DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_repo ON webhook_deliveries(repository_id);
CREATE INDEX IF NOT EXISTS idx_webhook_received ON webhook_deliveries(received_at DESC);

-- 8. Code Fix Proposals & Mutation Tracking
CREATE TABLE IF NOT EXISTS fix_proposals (
  id VARCHAR(255) PRIMARY KEY, -- e.g. "fix-12345"
  repository_id VARCHAR(255) NOT NULL,
  commit_sha VARCHAR(64) NOT NULL,
  finding_id VARCHAR(255) NOT NULL,
  file_path VARCHAR(1024) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  patch TEXT NOT NULL,
  patch_hash VARCHAR(64) NOT NULL, -- SHA-256 diff hash
  status VARCHAR(64) NOT NULL DEFAULT 'proposed', -- "proposed" | "approved" | "rejected" | "applied" | "failed"
  rejection_reason TEXT,
  warnings JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fix_proposals_scope ON fix_proposals(repository_id, commit_sha);
CREATE INDEX IF NOT EXISTS idx_fix_proposals_status ON fix_proposals(status);

-- 9. Human Approval Records (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS approval_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id VARCHAR(255) NOT NULL,
  repository_id VARCHAR(255) NOT NULL,
  commit_sha VARCHAR(64) NOT NULL,
  action_type VARCHAR(64) NOT NULL, -- "apply_fix" | "create_pr"
  status VARCHAR(64) NOT NULL, -- "approved" | "rejected"
  user_id VARCHAR(255) DEFAULT 'system_user',
  diff_hash VARCHAR(64) NOT NULL,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approvals_scope ON approval_records(repository_id, commit_sha);
CREATE INDEX IF NOT EXISTS idx_approvals_action ON approval_records(action_id);

-- 10. Pull Request Reviews
CREATE TABLE IF NOT EXISTS pull_request_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id VARCHAR(255) NOT NULL,
  pr_number INT NOT NULL,
  base_sha VARCHAR(64) NOT NULL,
  head_sha VARCHAR(64) NOT NULL,
  score INT NOT NULL DEFAULT 100,
  blast_radius_data JSONB DEFAULT '{}'::jsonb,
  findings_data JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_pr_review UNIQUE (repository_id, pr_number, head_sha)
);

CREATE INDEX IF NOT EXISTS idx_pr_reviews_scope ON pull_request_reviews(repository_id, pr_number);

-- 11. Autonomous Agent Execution Traces
CREATE TABLE IF NOT EXISTS agent_runs (
  id VARCHAR(255) PRIMARY KEY,
  repository_id VARCHAR(255) NOT NULL,
  commit_sha VARCHAR(64) NOT NULL,
  intent VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL, -- "completed" | "budget_exceeded" | "failed"
  steps_count INT NOT NULL DEFAULT 0,
  plan_summary TEXT,
  tool_executions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_scope ON agent_runs(repository_id, commit_sha);
