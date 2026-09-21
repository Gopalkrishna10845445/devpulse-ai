/**
 * DevPilot Database Repositories
 *
 * Typed database access services mapping application domain models to PostgreSQL 16
 * tables and pgvector similarity search with strict commit and repository isolation.
 */

import { db } from './client';
import { VectorRecord, IndexStatus, CodeChunk } from '../rag/types';
import { WebhookDeliveryRecord } from '../webhook/types';
import { CodeFixProposal } from '../fixes/types';

// ─── 1. RAG & pgvector Store ──────────────────────────────────────────────────

export class RagDatabaseRepository {
  /**
   * Upserts code chunks with their vector embeddings in PostgreSQL.
   */
  public static async upsertChunks(
    repositoryId: string,
    commitSha: string,
    records: VectorRecord[]
  ): Promise<IndexStatus> {
    const isLive = await db.isAvailable();
    if (!isLive) {
      throw new Error('Database not available for RAG chunk persistence.');
    }

    const cleanRepoId = repositoryId.toLowerCase().trim();
    const cleanCommitSha = commitSha.trim();

    await db.transaction(async (client) => {
      // 1. Ensure repository record exists
      await client.query(
        `INSERT INTO repositories (id, full_name, owner, name)
         VALUES ($1, $1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [cleanRepoId, cleanRepoId.split('/')[0] || cleanRepoId, cleanRepoId.split('/')[1] || cleanRepoId]
      );

      // 2. Register commit
      await client.query(
        `INSERT INTO repository_commits (repository_id, commit_sha, indexed_at, chunks_count)
         VALUES ($1, $2, NOW(), $3)
         ON CONFLICT (repository_id, commit_sha) 
         DO UPDATE SET indexed_at = NOW(), chunks_count = $3`,
        [cleanRepoId, cleanCommitSha, records.length]
      );

      // 3. Delete existing chunks for this specific commit to prevent stale duplication
      await client.query(
        `DELETE FROM rag_chunks WHERE repository_id = $1 AND commit_sha = $2`,
        [cleanRepoId, cleanCommitSha]
      );

      // 4. Batch insert chunks
      for (const r of records) {
        const chunk = r.chunk;
        const chunkId = chunk.id || `${cleanRepoId}@${cleanCommitSha}:${chunk.filePath}:${chunk.startLine}-${chunk.endLine}`;
        const embeddingStr = r.embedding && r.embedding.length > 0 ? `[${r.embedding.join(',')}]` : null;

        await client.query(
          `INSERT INTO rag_chunks (
            id, repository_id, commit_sha, file_path, start_line, end_line,
            symbol_name, symbol_type, content, content_hash, embedding
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector)`,
          [
            chunkId,
            cleanRepoId,
            cleanCommitSha,
            chunk.filePath,
            chunk.startLine,
            chunk.endLine,
            chunk.symbolName || null,
            chunk.symbolType || null,
            chunk.content,
            chunk.id || 'hash',
            embeddingStr,
          ]
        );
      }
    });

    const uniqueFiles = new Set(records.map((r) => r.filePath)).size;

    return {
      repositoryId: cleanRepoId,
      commitSha: cleanCommitSha,
      isIndexed: true,
      indexedAt: new Date().toISOString(),
      filesIndexed: uniqueFiles,
      chunksIndexed: records.length,
      indexVersion: 1,
    };
  }

  /**
   * Retrieves top-K similar chunks using pgvector cosine distance (<=>) with strict commit isolation.
   */
  public static async similaritySearch(
    repositoryId: string,
    commitSha: string,
    queryEmbedding: number[],
    limit: number = 5
  ): Promise<{ chunk: CodeChunk; score: number }[]> {
    const isLive = await db.isAvailable();
    if (!isLive) {
      return [];
    }

    const cleanRepoId = repositoryId.toLowerCase().trim();
    const cleanCommitSha = commitSha.trim();
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const res = await db.query(
      `SELECT 
        id, repository_id, commit_sha, file_path, start_line, end_line,
        symbol_name, symbol_type, content, content_hash,
        1 - (embedding <=> $1::vector) as similarity
       FROM rag_chunks
       WHERE repository_id = $2 AND commit_sha = $3 AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector ASC
       LIMIT $4`,
      [embeddingStr, cleanRepoId, cleanCommitSha, limit]
    );

    return res.rows.map((row) => ({
      chunk: {
        id: row.id,
        repositoryId: row.repository_id,
        commitSha: row.commit_sha,
        filePath: row.file_path,
        language: 'typescript',
        module: row.file_path.split('/')[0] || '',
        startLine: row.start_line,
        endLine: row.end_line,
        symbolName: row.symbol_name || undefined,
        symbolType: row.symbol_type || undefined,
        content: row.content,
        tokenCountEstimate: Math.ceil(row.content.length / 4),
      },
      score: Math.max(0, Math.min(1, parseFloat(row.similarity) || 0)),
    }));
  }

  /**
   * Checks index status for a repository and commit in PostgreSQL.
   */
  public static async getIndexStatus(
    repositoryId: string,
    commitSha: string
  ): Promise<IndexStatus | null> {
    const isLive = await db.isAvailable();
    if (!isLive) return null;

    const cleanRepoId = repositoryId.toLowerCase().trim();
    const cleanCommitSha = commitSha.trim();

    const res = await db.query(
      `SELECT repository_id, commit_sha, indexed_at, chunks_count
       FROM repository_commits
       WHERE repository_id = $1 AND commit_sha = $2`,
      [cleanRepoId, cleanCommitSha]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      repositoryId: row.repository_id,
      commitSha: row.commit_sha,
      isIndexed: true,
      indexedAt: row.indexed_at.toISOString(),
      filesIndexed: 0,
      chunksIndexed: row.chunks_count || 0,
      indexVersion: 1,
    };
  }
}

// ─── 2. Webhook Deliveries & Deduplication Store ───────────────────────────────

export class WebhookDatabaseRepository {
  /**
   * Persists a webhook delivery record.
   */
  public static async recordDelivery(delivery: WebhookDeliveryRecord): Promise<void> {
    const isLive = await db.isAvailable();
    if (!isLive) return;

    await db.query(
      `INSERT INTO webhook_deliveries (
        delivery_id, event_name, action, repository_id, status, received_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (delivery_id) DO UPDATE SET status = $5`,
      [
        delivery.deliveryId,
        delivery.eventName,
        delivery.action || null,
        delivery.repositoryId,
        delivery.status,
        delivery.receivedAt,
      ]
    );
  }

  /**
   * Checks if a delivery ID already exists in PostgreSQL (Deduplication across restarts).
   */
  public static async isDuplicateDelivery(deliveryId: string): Promise<boolean> {
    const isLive = await db.isAvailable();
    if (!isLive) return false;

    const res = await db.query(
      `SELECT 1 FROM webhook_deliveries WHERE delivery_id = $1 LIMIT 1`,
      [deliveryId]
    );
    return res.rows.length > 0;
  }
}

// ─── 3. Code Fix Proposals & Approval Store ────────────────────────────────────

export class FixDatabaseRepository {
  /**
   * Persists a code fix proposal.
   */
  public static async saveProposal(proposal: CodeFixProposal): Promise<void> {
    const isLive = await db.isAvailable();
    if (!isLive) return;

    await db.query(
      `INSERT INTO fix_proposals (
        id, repository_id, commit_sha, finding_id, file_path, title,
        description, patch, patch_hash, status, rejection_reason, warnings, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        status = $10,
        rejection_reason = $11,
        updated_at = NOW()`,
      [
        proposal.id,
        proposal.repositoryId,
        proposal.commitSha,
        proposal.findingId,
        proposal.targetFile,
        proposal.title || null,
        proposal.explanation || null,
        proposal.unifiedDiff,
        proposal.diffHash,
        proposal.status,
        proposal.rejectionReason || null,
        JSON.stringify(proposal.warnings || []),
      ]
    );
  }

  /**
   * Retrieves a fix proposal by ID.
   */
  public static async getProposal(proposalId: string): Promise<CodeFixProposal | null> {
    const isLive = await db.isAvailable();
    if (!isLive) return null;

    const res = await db.query(
      `SELECT * FROM fix_proposals WHERE id = $1 LIMIT 1`,
      [proposalId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    return {
      id: row.id,
      repositoryId: row.repository_id,
      commitSha: row.commit_sha,
      findingId: row.finding_id,
      category: 'security',
      title: row.title || 'Code Remediation',
      explanation: row.description || '',
      rationale: row.description || '',
      affectedFiles: [row.file_path],
      affectedSymbols: [],
      targetFile: row.file_path,
      beforeCode: '',
      afterCode: '',
      unifiedDiff: row.patch || '',
      diffHash: row.patch_hash,
      evidence: { summary: '', references: [] },
      confidence: 'high',
      validationPlan: [],
      warnings: row.warnings || [],
      generatedAt: row.created_at.toISOString(),
      status: row.status,
      appliedAt: row.updated_at.toISOString(),
      rejectionReason: row.rejection_reason || undefined,
    };
  }

  /**
   * Records a human approval action into the immutable audit table.
   */
  public static async recordApproval(
    actionId: string,
    repositoryId: string,
    commitSha: string,
    actionType: string,
    status: string,
    diffHash: string
  ): Promise<void> {
    const isLive = await db.isAvailable();
    if (!isLive) return;

    await db.query(
      `INSERT INTO approval_records (
        action_id, repository_id, commit_sha, action_type, status, diff_hash, executed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [actionId, repositoryId, commitSha, actionType, status, diffHash]
    );
  }
}

// ─── 4. Engineering & Security Reports Store ───────────────────────────────────

export class ReportDatabaseRepository {
  /**
   * Persists an Engineering Health Report.
   */
  public static async saveEngineeringReport(
    repositoryId: string,
    commitSha: string,
    report: any
  ): Promise<void> {
    const isLive = await db.isAvailable();
    if (!isLive) return;

    await db.query(
      `INSERT INTO engineering_reports (
        repository_id, commit_sha, overall_score, maintainability_score,
        architecture_type, cycle_count, layers, hotspot_files, report_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb)
      ON CONFLICT (repository_id, commit_sha) DO UPDATE SET
        overall_score = $3,
        maintainability_score = $4,
        architecture_type = $5,
        cycle_count = $6,
        report_data = $9::jsonb`,
      [
        repositoryId,
        commitSha,
        report.overallHealthScore || 0,
        report.maintainabilityIndex || 0,
        report.architectureType || 'Modular',
        (report.circularDependencies && report.circularDependencies.length) || 0,
        JSON.stringify(report.layerAdherence || []),
        JSON.stringify(report.hotspots || []),
        JSON.stringify(report),
      ]
    );
  }

  /**
   * Persists a Security Intelligence Report.
   */
  public static async saveSecurityReport(
    repositoryId: string,
    commitSha: string,
    report: any
  ): Promise<void> {
    const isLive = await db.isAvailable();
    if (!isLive) return;

    await db.query(
      `INSERT INTO security_reports (
        repository_id, commit_sha, status, total_findings, high_severity,
        medium_severity, low_severity, findings_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      ON CONFLICT (repository_id, commit_sha) DO UPDATE SET
        status = $3,
        total_findings = $4,
        high_severity = $5,
        medium_severity = $6,
        low_severity = $7,
        findings_data = $8::jsonb`,
      [
        repositoryId,
        commitSha,
        report.status || 'secure',
        report.totalFindings || 0,
        report.highCount || 0,
        report.mediumCount || 0,
        report.lowCount || 0,
        JSON.stringify(report.findings || []),
      ]
    );
  }
}
