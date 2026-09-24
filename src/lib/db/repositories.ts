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
import { Logger } from '../logger';

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

    try {
      const cleanRepoId = proposal.repositoryId.toLowerCase().trim();
      const cleanCommitSha = (proposal.commitSha || 'main').trim();

      await db.transaction(async (client) => {
        await client.query(
          `INSERT INTO repositories (id, full_name, owner, name)
           VALUES ($1, $1, $2, $3)
           ON CONFLICT (id) DO NOTHING`,
          [cleanRepoId, cleanRepoId.split('/')[0] || cleanRepoId, cleanRepoId.split('/')[1] || cleanRepoId]
        );

        await client.query(
          `INSERT INTO repository_commits (repository_id, commit_sha, indexed_at, chunks_count)
           VALUES ($1, $2, NOW(), 0)
           ON CONFLICT (repository_id, commit_sha) DO NOTHING`,
          [cleanRepoId, cleanCommitSha]
        );

        await client.query(
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
            cleanRepoId,
            cleanCommitSha,
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
      });
    } catch (err) {
      Logger.warn('Failed to persist fix proposal in PostgreSQL', { proposalId: proposal.id }, err);
    }
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

    try {
      const cleanRepoId = repositoryId.toLowerCase().trim();
      const cleanCommitSha = (commitSha || 'main').trim();

      await db.transaction(async (client) => {
        await client.query(
          `INSERT INTO repositories (id, full_name, owner, name)
           VALUES ($1, $1, $2, $3)
           ON CONFLICT (id) DO NOTHING`,
          [cleanRepoId, cleanRepoId.split('/')[0] || cleanRepoId, cleanRepoId.split('/')[1] || cleanRepoId]
        );

        await client.query(
          `INSERT INTO repository_commits (repository_id, commit_sha, indexed_at, chunks_count)
           VALUES ($1, $2, NOW(), 0)
           ON CONFLICT (repository_id, commit_sha) DO NOTHING`,
          [cleanRepoId, cleanCommitSha]
        );

        await client.query(
          `INSERT INTO approval_records (
            action_id, repository_id, commit_sha, action_type, status, diff_hash, executed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [actionId, cleanRepoId, cleanCommitSha, actionType, status, diffHash]
        );
      });
    } catch (err) {
      Logger.warn('Failed to record approval in PostgreSQL', { actionId }, err);
    }
  }
}

// ─── 4. Engineering & Security Reports Store ───────────────────────────────────

export class ReportDatabaseRepository {
  /**
   * Persists an Engineering Health Report in PostgreSQL with strict repository and commit isolation.
   */
  public static async saveEngineeringReport(
    repositoryId: string,
    commitSha: string,
    report: any
  ): Promise<void> {
    const isLive = await db.isAvailable();
    if (!isLive) return;

    const cleanRepoId = repositoryId.toLowerCase().trim();
    const cleanCommitSha = commitSha.trim();

    try {
      await db.transaction(async (client) => {
        // 1. Ensure repository record exists
        await client.query(
          `INSERT INTO repositories (id, full_name, owner, name)
           VALUES ($1, $1, $2, $3)
           ON CONFLICT (id) DO NOTHING`,
          [cleanRepoId, cleanRepoId.split('/')[0] || cleanRepoId, cleanRepoId.split('/')[1] || cleanRepoId]
        );

        // 2. Ensure commit record exists
        await client.query(
          `INSERT INTO repository_commits (repository_id, commit_sha, indexed_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (repository_id, commit_sha) DO NOTHING`,
          [cleanRepoId, cleanCommitSha]
        );

        const overallScore = report.summary?.findingsBySeverity?.high !== undefined
          ? Math.max(0, 100 - (report.summary.findingsBySeverity.high * 20 + report.summary.findingsBySeverity.medium * 10))
          : (report.overallHealthScore || 85);

        const maintainabilityScore = report.architecture?.modularityScore || report.maintainabilityIndex || 80;
        const archType = report.architecture?.detectedPattern || report.architectureType || 'Modular Monolith';
        const cycleCount = report.architecture?.circularDependencies?.length || (report.circularDependencies && report.circularDependencies.length) || 0;

        await client.query(
          `INSERT INTO engineering_reports (
            repository_id, commit_sha, overall_score, maintainability_score,
            architecture_type, cycle_count, layers, hotspot_files, report_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb)
          ON CONFLICT (repository_id, commit_sha) DO UPDATE SET
            overall_score = $3,
            maintainability_score = $4,
            architecture_type = $5,
            cycle_count = $6,
            layers = $7::jsonb,
            hotspot_files = $8::jsonb,
            report_data = $9::jsonb`,
          [
            cleanRepoId,
            cleanCommitSha,
            overallScore,
            maintainabilityScore,
            archType,
            cycleCount,
            JSON.stringify(report.architecture?.metrics || report.layerAdherence || []),
            JSON.stringify(report.hotspots || []),
            JSON.stringify(report),
          ]
        );
      });
    } catch (err) {
      console.warn('[ReportDatabaseRepository] Failed to persist engineering report:', err);
    }
  }

  /**
   * Retrieves an existing Engineering Health Report for a repository commit from PostgreSQL.
   */
  public static async getEngineeringReport(
    repositoryId: string,
    commitSha: string
  ): Promise<any | null> {
    const isLive = await db.isAvailable();
    if (!isLive) return null;

    const cleanRepoId = repositoryId.toLowerCase().trim();
    const cleanCommitSha = commitSha.trim();

    try {
      const res = await db.query(
        `SELECT report_data FROM engineering_reports
         WHERE repository_id = $1 AND commit_sha = $2 LIMIT 1`,
        [cleanRepoId, cleanCommitSha]
      );

      if (res.rows.length === 0) return null;
      return res.rows[0].report_data;
    } catch (err) {
      console.warn('[ReportDatabaseRepository] Failed to read engineering report from database:', err);
      return null;
    }
  }

  /**
   * Persists a Codebase Intelligence report in PostgreSQL.
   */
  public static async saveCodebaseIntelligence(
    repositoryId: string,
    commitSha: string,
    intelligence: any
  ): Promise<void> {
    const isLive = await db.isAvailable();
    if (!isLive) return;

    const cleanRepoId = repositoryId.toLowerCase().trim();
    const cleanCommitSha = commitSha.trim();

    try {
      await db.transaction(async (client) => {
        await client.query(
          `INSERT INTO repositories (id, full_name, owner, name, default_branch)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [
            cleanRepoId,
            intelligence.repository?.fullName || cleanRepoId,
            intelligence.repository?.owner || cleanRepoId.split('/')[0] || cleanRepoId,
            intelligence.repository?.name || cleanRepoId.split('/')[1] || cleanRepoId,
            intelligence.repository?.defaultBranch || 'main',
          ]
        );

        await client.query(
          `INSERT INTO repository_commits (repository_id, commit_sha, branch, indexed_at, files_count)
           VALUES ($1, $2, $3, NOW(), $4)
           ON CONFLICT (repository_id, commit_sha) DO NOTHING`,
          [
            cleanRepoId,
            cleanCommitSha,
            intelligence.repository?.defaultBranch || 'main',
            intelligence.metrics?.totalFiles || 0,
          ]
        );

        const pattern = intelligence.architecture?.pattern || intelligence.projectType || 'Modular';
        const modularity = intelligence.metrics?.modularityScore || 80;
        const layers = JSON.stringify(intelligence.architecture?.layers || []);

        await client.query(
          `INSERT INTO engineering_reports (
            repository_id, commit_sha, overall_score, maintainability_score,
            architecture_type, cycle_count, layers, hotspot_files, report_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb)
          ON CONFLICT (repository_id, commit_sha) DO UPDATE SET
            overall_score = $3,
            maintainability_score = $4,
            architecture_type = $5,
            cycle_count = $6,
            layers = $7::jsonb,
            report_data = $9::jsonb`,
          [
            cleanRepoId,
            cleanCommitSha,
            modularity,
            modularity,
            pattern,
            0,
            layers,
            JSON.stringify([]),
            JSON.stringify(intelligence),
          ]
        );
      });
    } catch (err) {
      console.warn('[ReportDatabaseRepository] Failed to save codebase intelligence in PostgreSQL:', err);
    }
  }

  /**
   * Retrieves stored Codebase Intelligence report from PostgreSQL.
   */
  public static async getCodebaseIntelligence(
    repositoryId: string,
    commitSha?: string
  ): Promise<any | null> {
    const isLive = await db.isAvailable();
    if (!isLive) return null;

    const cleanRepoId = repositoryId.toLowerCase().trim();

    try {
      let query = `SELECT report_data FROM engineering_reports WHERE repository_id = $1`;
      const params: any[] = [cleanRepoId];

      if (commitSha) {
        query += ` AND commit_sha = $2 ORDER BY created_at DESC LIMIT 1`;
        params.push(commitSha.trim());
      } else {
        query += ` ORDER BY created_at DESC LIMIT 1`;
      }

      const res = await db.query(query, params);
      if (res.rows.length === 0) return null;
      return res.rows[0].report_data;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves stored Security Intelligence report from PostgreSQL.
   */
  public static async getSecurityReport(
    repositoryId: string,
    commitSha?: string
  ): Promise<any | null> {
    const isLive = await db.isAvailable();
    if (!isLive) return null;

    const cleanRepoId = repositoryId.toLowerCase().trim();

    try {
      let query = `SELECT findings_data FROM security_reports WHERE repository_id = $1`;
      const params: any[] = [cleanRepoId];

      if (commitSha) {
        query += ` AND commit_sha = $2 ORDER BY created_at DESC LIMIT 1`;
        params.push(commitSha.trim());
      } else {
        query += ` ORDER BY created_at DESC LIMIT 1`;
      }

      const res = await db.query(query, params);
      if (res.rows.length === 0) return null;
      return res.rows[0].findings_data;
    } catch {
      return null;
    }
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

    try {
      const cleanRepoId = repositoryId.toLowerCase().trim();
      const cleanCommitSha = (commitSha || 'main').trim();

      await db.transaction(async (client) => {
        // 1. Ensure repository record exists
        await client.query(
          `INSERT INTO repositories (id, full_name, owner, name)
           VALUES ($1, $1, $2, $3)
           ON CONFLICT (id) DO NOTHING`,
          [cleanRepoId, cleanRepoId.split('/')[0] || cleanRepoId, cleanRepoId.split('/')[1] || cleanRepoId]
        );

        // 2. Ensure commit record exists
        await client.query(
          `INSERT INTO repository_commits (repository_id, commit_sha, indexed_at, chunks_count)
           VALUES ($1, $2, NOW(), 0)
           ON CONFLICT (repository_id, commit_sha) DO NOTHING`,
          [cleanRepoId, cleanCommitSha]
        );

        // 3. Upsert security report
        const status = report.summary?.overallStatus || report.status || 'secure';
        const totalFindings = report.summary?.totalFindingsCount ?? report.totalFindings ?? (report.findings ? report.findings.length : 0);
        const highSeverity = report.summary?.findingsBySeverity?.high ?? report.highCount ?? 0;
        const mediumSeverity = report.summary?.findingsBySeverity?.medium ?? report.mediumCount ?? 0;
        const lowSeverity = report.summary?.findingsBySeverity?.low ?? report.lowCount ?? 0;

        await client.query(
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
            cleanRepoId,
            cleanCommitSha,
            status,
            totalFindings,
            highSeverity,
            mediumSeverity,
            lowSeverity,
            JSON.stringify(report),
          ]
        );
      });
    } catch (err) {
      console.warn('[ReportDatabaseRepository] Failed to save security report in PostgreSQL:', err);
    }
  }
}

// ─── 5. Ingested Repository Metadata Store ────────────────────────────────────

export class RepositoryDatabaseRepository {
  /**
   * Persists an ingested repository and its commit state in PostgreSQL.
   */
  public static async saveIngestedIndex(index: any): Promise<void> {
    const isLive = await db.isAvailable();
    if (!isLive) return;

    const repo = index.repository;
    if (!repo || !repo.fullName) return;

    const cleanRepoId = repo.fullName.toLowerCase().trim();

    try {
      await db.transaction(async (client) => {
        // 1. Upsert repository record
        await client.query(
          `INSERT INTO repositories (
            id, full_name, owner, name, default_branch, description,
            languages, frameworks, is_private, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, NOW())
          ON CONFLICT (id) DO UPDATE SET
            full_name = $2,
            owner = $3,
            name = $4,
            default_branch = $5,
            description = $6,
            languages = $7::jsonb,
            frameworks = $8::jsonb,
            is_private = $9,
            updated_at = NOW()`,
          [
            cleanRepoId,
            repo.fullName,
            repo.owner,
            repo.name,
            repo.defaultBranch || 'main',
            repo.description || '',
            JSON.stringify(index.languages || []),
            JSON.stringify(index.frameworks || []),
            Boolean(repo.isPrivate),
          ]
        );

        // 2. Register commit record
        const commitSha = repo.defaultBranch || 'main';
        await client.query(
          `INSERT INTO repository_commits (
            repository_id, commit_sha, branch, indexed_at, files_count
          ) VALUES ($1, $2, $3, NOW(), $4)
          ON CONFLICT (repository_id, commit_sha) DO UPDATE SET
            branch = $3,
            indexed_at = NOW(),
            files_count = $4`,
          [
            cleanRepoId,
            commitSha,
            repo.defaultBranch || 'main',
            index.ingestion?.indexedFilesCount || 0,
          ]
        );
      });
    } catch (err) {
      console.warn('[RepositoryDatabaseRepository] Failed to persist ingested index in PostgreSQL:', err);
    }
  }

  /**
   * Retrieves an ingested repository by full name.
   */
  public static async getRepository(fullName: string): Promise<any | null> {
    const isLive = await db.isAvailable();
    if (!isLive) return null;

    const cleanRepoId = fullName.toLowerCase().trim();
    const res = await db.query(
      `SELECT * FROM repositories WHERE id = $1 LIMIT 1`,
      [cleanRepoId]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }
}

// ─── 6. Pull Request Review Store ─────────────────────────────────────────────

const inMemoryPRReviews = new Map<string, any>();

export class PRDatabaseRepository {
  /**
   * Persists a Pull Request Review in PostgreSQL.
   */
  public static async saveReview(review: any): Promise<void> {
    const cleanRepoId = (review.repositoryId || '').toLowerCase().trim();
    const prNum = review.pullRequest?.number || review.prNumber;
    const baseSha = (review.baseCommit || review.pullRequest?.baseSha || 'main').trim();
    const headSha = (review.headCommit || review.pullRequest?.headSha || 'head').trim();

    const key = `${cleanRepoId}:${prNum}:${headSha}`;
    inMemoryPRReviews.set(key, review);

    const isLive = await db.isAvailable();
    if (!isLive) return;

    try {
      await db.transaction(async (client) => {
        // 1. Ensure repository record exists
        await client.query(
          `INSERT INTO repositories (id, full_name, owner, name)
           VALUES ($1, $1, $2, $3)
           ON CONFLICT (id) DO NOTHING`,
          [cleanRepoId, cleanRepoId.split('/')[0] || cleanRepoId, cleanRepoId.split('/')[1] || cleanRepoId]
        );

        // 2. Ensure commit record exists
        await client.query(
          `INSERT INTO repository_commits (repository_id, commit_sha, indexed_at, chunks_count)
           VALUES ($1, $2, NOW(), 0)
           ON CONFLICT (repository_id, commit_sha) DO NOTHING`,
          [cleanRepoId, headSha]
        );

        // 3. Upsert PR review
        const score = review.summary?.verdict === 'approve' ? 100 : review.summary?.verdict === 'comment' ? 80 : 50;
        const blastRadiusData = {
          changedFilesCount: review.changedFiles?.length || 0,
          changedSymbolsCount: review.changedSymbols?.length || 0,
          architectureImpact: review.architectureImpact,
          securityImpact: review.securityImpact,
          testingImpact: review.testingImpact,
          dependencyImpact: review.dependencyImpact,
          documentationImpact: review.documentationImpact,
        };

        await client.query(
          `INSERT INTO pull_request_reviews (
            repository_id, pr_number, base_sha, head_sha, score,
            blast_radius_data, findings_data, summary, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, NOW())
          ON CONFLICT (repository_id, pr_number, head_sha) DO UPDATE SET
            score = $5,
            blast_radius_data = $6::jsonb,
            findings_data = $7::jsonb,
            summary = $8,
            created_at = NOW()`,
          [
            cleanRepoId,
            prNum,
            baseSha,
            headSha,
            score,
            JSON.stringify(blastRadiusData),
            JSON.stringify(review),
            review.summary?.executiveSummary || '',
          ]
        );
      });
    } catch (err) {
      Logger.warn('[PRDatabaseRepository] Failed to persist PR review in PostgreSQL', { repo: cleanRepoId, pr: prNum }, err);
    }
  }

  /**
   * Retrieves the latest review for a PR.
   */
  public static async getLatestReview(repositoryId: string, prNumber: number): Promise<any | null> {
    const cleanRepoId = repositoryId.toLowerCase().trim();

    const isLive = await db.isAvailable();
    if (!isLive) {
      for (const [key, rev] of inMemoryPRReviews.entries()) {
        if (key.startsWith(`${cleanRepoId}:${prNumber}:`)) {
          return rev;
        }
      }
      return null;
    }

    try {
      const res = await db.query(
        `SELECT findings_data FROM pull_request_reviews
         WHERE repository_id = $1 AND pr_number = $2
         ORDER BY created_at DESC LIMIT 1`,
        [cleanRepoId, prNumber]
      );
      if (res.rows.length === 0) {
        for (const [key, rev] of inMemoryPRReviews.entries()) {
          if (key.startsWith(`${cleanRepoId}:${prNumber}:`)) {
            return rev;
          }
        }
        return null;
      }
      return res.rows[0].findings_data;
    } catch {
      for (const [key, rev] of inMemoryPRReviews.entries()) {
        if (key.startsWith(`${cleanRepoId}:${prNumber}:`)) {
          return rev;
        }
      }
      return null;
    }
  }

  /**
   * Retrieves review for specific commit SHA.
   */
  public static async getReviewBySha(repositoryId: string, prNumber: number, headSha: string): Promise<any | null> {
    const cleanRepoId = repositoryId.toLowerCase().trim();
    const cleanSha = headSha.trim();
    const key = `${cleanRepoId}:${prNumber}:${cleanSha}`;

    const isLive = await db.isAvailable();
    if (!isLive) {
      return inMemoryPRReviews.get(key) || null;
    }

    try {
      const res = await db.query(
        `SELECT findings_data FROM pull_request_reviews
         WHERE repository_id = $1 AND pr_number = $2 AND head_sha = $3
         LIMIT 1`,
        [cleanRepoId, prNumber, cleanSha]
      );
      if (res.rows.length === 0) {
        return inMemoryPRReviews.get(key) || null;
      }
      return res.rows[0].findings_data;
    } catch {
      return inMemoryPRReviews.get(key) || null;
    }
  }
}

// ─── 7. Autonomous Agent Runs Store ──────────────────────────────────────────

const inMemoryAgentRuns: Map<string, any> = new Map();

export class AgentDatabaseRepository {
  /**
   * Saves or updates an agent run trace.
   */
  public static async saveRun(trace: any): Promise<void> {
    const traceId = trace.traceId || trace.id;
    const cleanRepoId = (trace.repositoryId || '').toLowerCase().trim();
    const cleanSha = (trace.commitSha || 'main').trim();
    const intent = trace.classifiedMode || trace.intent || 'INVESTIGATE';
    const status = trace.finalStatus || trace.status || 'completed';
    const stepsCount = (trace.toolInvocations || []).length;
    const planSummary = Array.isArray(trace.plan) ? trace.plan.join('\n') : (trace.planSummary || '');
    const toolExecutions = trace.toolInvocations || [];

    const record = {
      id: traceId,
      traceId,
      repository_id: cleanRepoId,
      repositoryId: cleanRepoId,
      commit_sha: cleanSha,
      commitSha: cleanSha,
      intent,
      status,
      finalStatus: status,
      steps_count: stepsCount,
      plan_summary: planSummary,
      plan: Array.isArray(trace.plan) ? trace.plan : [],
      tool_executions: toolExecutions,
      toolInvocations: toolExecutions,
      trace_data: trace,
      created_at: new Date().toISOString(),
    };

    inMemoryAgentRuns.set(traceId, record);

    const isLive = await db.isAvailable();
    if (!isLive) return;

    try {
      await db.query(
        `INSERT INTO agent_runs (
          id, repository_id, commit_sha, intent, status, steps_count, plan_summary, tool_executions, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          status = $5,
          steps_count = $6,
          plan_summary = $7,
          tool_executions = $8::jsonb`,
        [traceId, cleanRepoId, cleanSha, intent, status, stepsCount, planSummary, JSON.stringify(toolExecutions)]
      );
    } catch (err) {
      Logger.warn('[AgentDatabaseRepository] Failed to persist agent run in PostgreSQL', { traceId }, err);
    }
  }

  /**
   * Retrieves an agent run by ID.
   */
  public static async getRun(traceId: string): Promise<any | null> {
    const inMem = inMemoryAgentRuns.get(traceId);
    const isLive = await db.isAvailable();
    if (!isLive) return inMem || null;

    try {
      const res = await db.query(
        `SELECT id, repository_id, commit_sha, intent, status, steps_count, plan_summary, tool_executions, created_at
         FROM agent_runs WHERE id = $1 LIMIT 1`,
        [traceId]
      );
      if (res.rows.length === 0) return inMem || null;
      const row = res.rows[0];
      return {
        ...inMem,
        id: row.id,
        traceId: row.id,
        repositoryId: row.repository_id,
        commitSha: row.commit_sha,
        intent: row.intent,
        status: row.status,
        finalStatus: row.status,
        stepsCount: row.steps_count,
        planSummary: row.plan_summary,
        toolInvocations: row.tool_executions || [],
        createdAt: row.created_at,
      };
    } catch {
      return inMem || null;
    }
  }

  /**
   * Updates status of an agent run (e.g. for cancellation or completion).
   */
  public static async updateStatus(traceId: string, status: string): Promise<boolean> {
    const inMem = inMemoryAgentRuns.get(traceId);
    if (inMem) {
      inMem.status = status;
      inMem.finalStatus = status;
    }

    const isLive = await db.isAvailable();
    if (!isLive) return !!inMem;

    try {
      const res = await db.query(
        `UPDATE agent_runs SET status = $1 WHERE id = $2`,
        [status, traceId]
      );
      return (res.rowCount || 0) > 0 || !!inMem;
    } catch {
      return !!inMem;
    }
  }

  /**
   * Lists runs for a repository.
   */
  public static async listRuns(repositoryId: string, limit = 20): Promise<any[]> {
    const cleanRepoId = repositoryId.toLowerCase().trim();
    const isLive = await db.isAvailable();
    if (!isLive) {
      return Array.from(inMemoryAgentRuns.values())
        .filter((r) => r.repository_id === cleanRepoId || r.repositoryId === cleanRepoId)
        .slice(0, limit);
    }

    try {
      const res = await db.query(
        `SELECT id, repository_id, commit_sha, intent, status, steps_count, plan_summary, tool_executions, created_at
         FROM agent_runs WHERE repository_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [cleanRepoId, limit]
      );
      return res.rows;
    } catch {
      return Array.from(inMemoryAgentRuns.values())
        .filter((r) => r.repository_id === cleanRepoId || r.repositoryId === cleanRepoId)
        .slice(0, limit);
    }
  }

  /**
   * Clears in-memory test cache.
   */
  public static clearCache(): void {
    inMemoryAgentRuns.clear();
  }
}



