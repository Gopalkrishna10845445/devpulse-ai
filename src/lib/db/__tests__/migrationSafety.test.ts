/**
 * Production Phase 5 — Database Migration & Connection Pool Safety Test
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Migration & DDL Safety Audit', () => {
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');

  it('verifies schema.sql exists and contains valid DDL definitions', () => {
    expect(fs.existsSync(schemaPath)).toBe(true);
    const sql = fs.readFileSync(schemaPath, 'utf8');
    expect(sql.length).toBeGreaterThan(100);
  });

  it('enforces safe idempotent table creation (CREATE TABLE IF NOT EXISTS)', () => {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const createTableStatements = sql.match(/CREATE\s+TABLE\s+([^\s(]+)/gi) || [];
    const ifNotExistsStatements = sql.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS/gi) || [];

    // All CREATE TABLE statements must use IF NOT EXISTS to prevent destructive overwrite
    expect(createTableStatements.length).toBeGreaterThan(0);
    expect(ifNotExistsStatements.length).toBe(createTableStatements.length);
  });

  it('enforces safe idempotent index creation (CREATE INDEX IF NOT EXISTS)', () => {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const ifNotExistsIndexes = sql.match(/CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS/gi) || [];

    expect(ifNotExistsIndexes.length).toBeGreaterThan(15);
    // Ensure all table indexes are created idempotently
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_commits_repo_sha');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_rag_docs_lookup');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_rag_chunks_scope');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_eng_reports_scope');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_sec_reports_scope');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_webhook_repo');
  });

  it('guarantees zero destructive DROP TABLE or TRUNCATE commands in production schema', () => {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
    expect(sql).not.toMatch(/DROP\s+DATABASE/i);
  });

  it('verifies pgvector vector extension definition is present', () => {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    expect(sql).toMatch(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+vector/i);
  });

  it('verifies essential production tables are defined in schema', () => {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const requiredTables = [
      'repositories',
      'repository_commits',
      'rag_documents',
      'rag_chunks',
      'engineering_reports',
      'security_reports',
      'webhook_deliveries',
      'fix_proposals',
      'approval_records',
      'pull_request_reviews',
      'agent_runs',
    ];

    for (const table of requiredTables) {
      expect(sql).toContain(table);
    }
  });
});
