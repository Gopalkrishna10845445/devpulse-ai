/**
 * Phase 10 — DevPilot Agent Tool Registry
 *
 * Strongly-typed tool registry that wraps existing Phase 1–9 capabilities.
 * Declares input schema, output schema, risk level, read/write permissions,
 * and approval requirements for each capability.
 */

import { analyzeEngineeringHealth } from '../engineering/engineeringEngine';
import { EngineeringHealthReport } from '../engineering/types';
import { CodeFixEngine } from '../fixes/fixEngine';
import { validateProposalPatch } from '../fixes/patchValidator';
import { CodeFixProposal, CodeFixRequest } from '../fixes/types';
import { analyzeCodebase } from '../intelligence/codebaseAnalyzer';
import { CodebaseIntelligence } from '../intelligence/types';
import { PRReviewEngine } from '../pr/prReviewEngine';
import { PRReviewRequest, PullRequestReview } from '../pr/types';
import { CodebaseRAGPipeline } from '../rag/ragPipeline';
import { QARequest } from '../rag/types';
import { ingestRepository } from '../repository/repositoryIngestor';
import { RepositoryIndex } from '../repository/types';
import { analyzeSecurityHealth } from '../security/securityEngine';
import { SecurityHealthReport } from '../security/types';
import { WebhookJobManager } from '../webhook/jobManager';
import { AgentPolicy } from './policy';
import { AgentExecutionContext, ToolDefinition, ToolResult } from './types';

// Central fix engine instance for agent tool execution
const fixEngineInstance = new CodeFixEngine();

export class AgentToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();

  // In-memory cache for ingested indices to avoid redundant network/AST operations during a run
  private static repoCache: Map<string, { index: RepositoryIndex; intelligence: CodebaseIntelligence }> = new Map();

  public static async getOrLoadRepoContext(
    repoFullName: string
  ): Promise<{ index: RepositoryIndex; intelligence: CodebaseIntelligence }> {
    const cached = this.repoCache.get(repoFullName);
    if (cached) return cached;

    const index = await ingestRepository({ fullName: repoFullName });
    const intelligence = await analyzeCodebase({ index });
    const result = { index, intelligence };
    this.repoCache.set(repoFullName, result);
    return result;
  }

  public static setRepoContext(
    repoFullName: string,
    context: { index: RepositoryIndex; intelligence: CodebaseIntelligence }
  ): void {
    this.repoCache.set(repoFullName, context);
  }

  private static aliases: Map<string, string> = new Map([
    ['repository_search', 'symbol_lookup'],
    ['repository_ask', 'rag_query'],
    ['codebase_analyze', 'architecture_analysis'],
    ['engineering_analyze', 'engineering_analysis'],
    ['security_analyze', 'security_analysis'],
    ['pull_request_get', 'pr_review'],
    ['pull_request_review', 'pr_review'],
    ['fix_propose', 'generate_fix'],
    ['fix_apply', 'apply_fix'],
    ['repository_status', 'repository_info'],
  ]);

  public static registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public static getTool(name: string): ToolDefinition | undefined {
    const direct = this.tools.get(name);
    if (direct) return direct;
    const mapped = this.aliases.get(name);
    if (mapped) return this.tools.get(mapped);
    return undefined;
  }

  public static getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public static clearCache(): void {
    this.repoCache.clear();
  }
}

// ==========================================
// 1. REPOSITORY INFO (Phase 1/2)
// ==========================================
AgentToolRegistry.registerTool({
  name: 'repository_info',
  description: 'Retrieves structural repository metadata, branches, language stats, and file tree summary.',
  riskLevel: 'low',
  readOnly: true,
  requiresApproval: false,
  inputSchemaDescription: '{ repositoryId: string }',
  handler: async (input: { repositoryId: string }, context: AgentExecutionContext): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const { index, intelligence } = await AgentToolRegistry.getOrLoadRepoContext(input.repositoryId);
      return {
        toolName: 'repository_info',
        success: true,
        data: {
          name: index.repository.name,
          owner: index.repository.owner,
          defaultBranch: index.repository.defaultBranch,
          totalFiles: index.files.length,
          totalBytes: index.ingestion.totalBytes,
          languages: index.languages,
          frameworks: index.frameworks,
          entrypoints: intelligence.architecture.entrypoints.map((e) => e.path),
        },
        evidence: [
          {
            source: 'repository',
            title: `Repository info for ${input.repositoryId}`,
            details: { files: index.files.length, branch: index.repository.defaultBranch },
          },
        ],
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        toolName: 'repository_info',
        success: false,
        error: err.message || 'Failed to retrieve repository info',
        executionTimeMs: Date.now() - start,
      };
    }
  },
});

// ==========================================
// 2. CODEBASE SEARCH / SYMBOL LOOKUP (Phase 3)
// ==========================================
AgentToolRegistry.registerTool({
  name: 'symbol_lookup',
  description: 'Searches the AST intelligence index for symbols, function definitions, classes, and exported interfaces.',
  riskLevel: 'low',
  readOnly: true,
  requiresApproval: false,
  inputSchemaDescription: '{ repositoryId: string, query: string, kind?: string }',
  handler: async (
    input: { repositoryId: string; query: string; kind?: string },
    context: AgentExecutionContext
  ): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const { intelligence } = await AgentToolRegistry.getOrLoadRepoContext(input.repositoryId);
      const queryLower = input.query.toLowerCase();

      const matchedSymbols = intelligence.symbols
        .filter((s) => {
          const nameMatches = s.name.toLowerCase().includes(queryLower);
          const kindMatches = !input.kind || s.kind === input.kind;
          return nameMatches && kindMatches;
        })
        .slice(0, 15);

      return {
        toolName: 'symbol_lookup',
        success: true,
        data: { symbols: matchedSymbols, count: matchedSymbols.length },
        evidence: matchedSymbols.map((s) => ({
          source: 'ast',
          title: `Symbol: ${s.name} (${s.kind})`,
          file: s.filePath,
          lineRange: s.line ? `${s.line}` : '1',
          snippet: s.signature || s.docComment,
        })),
        citations: matchedSymbols.map((s) => ({
          filePath: s.filePath,
          startLine: s.line || 1,
          endLine: s.line || 1,
          symbol: s.name,
          confidence: 'high' as const,
        })),
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        toolName: 'symbol_lookup',
        success: false,
        error: err.message || 'Failed to lookup symbols',
        executionTimeMs: Date.now() - start,
      };
    }
  },
});

// ==========================================
// 3. ARCHITECTURE ANALYSIS (Phase 3 & 5)
// ==========================================
AgentToolRegistry.registerTool({
  name: 'architecture_analysis',
  description: 'Analyzes architectural layers, module dependencies, circular references, and coupling metrics.',
  riskLevel: 'low',
  readOnly: true,
  requiresApproval: false,
  inputSchemaDescription: '{ repositoryId: string }',
  handler: async (input: { repositoryId: string }, context: AgentExecutionContext): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const { intelligence } = await AgentToolRegistry.getOrLoadRepoContext(input.repositoryId);
      const arch = intelligence.architecture;

      return {
        toolName: 'architecture_analysis',
        success: true,
        data: {
          pattern: arch.pattern,
          layers: arch.layers,
          entrypoints: arch.entrypoints,
          couplingIndex: arch.metrics.internalCouplingScore,
          modularityScore: arch.metrics.modularityScore,
          dataFlow: arch.dataFlow,
        },
        evidence: [
          {
            source: 'ast',
            title: `Architecture Pattern: ${arch.pattern}`,
            details: {
              layersCount: arch.layers.length,
              entrypointsCount: arch.entrypoints.length,
            },
          },
        ],
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        toolName: 'architecture_analysis',
        success: false,
        error: err.message || 'Failed to analyze architecture',
        executionTimeMs: Date.now() - start,
      };
    }
  },
});

// ==========================================
// 4. ENGINEERING INTELLIGENCE (Phase 5)
// ==========================================
AgentToolRegistry.registerTool({
  name: 'engineering_analysis',
  description: 'Executes deterministic engineering intelligence analysis: maintainability, hotspots, test gaps, and complexity.',
  riskLevel: 'low',
  readOnly: true,
  requiresApproval: false,
  inputSchemaDescription: '{ repositoryId: string }',
  handler: async (input: { repositoryId: string }, context: AgentExecutionContext): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const { index, intelligence } = await AgentToolRegistry.getOrLoadRepoContext(input.repositoryId);
      const report: EngineeringHealthReport = await analyzeEngineeringHealth({
        repoIndex: index,
        intelligence,
      });

      return {
        toolName: 'engineering_analysis',
        success: true,
        data: {
          summary: report.summary,
          topFindings: report.findings.slice(0, 10),
          hotspots: report.hotspots.slice(0, 5),
          testingStatus: report.testing.status,
        },
        evidence: report.findings.slice(0, 8).map((f) => ({
          source: 'engineering',
          title: `[${f.severity.toUpperCase()}] ${f.title}`,
          file: f.filePath,
          lineRange: f.lineRange,
          details: { rule: f.deterministicRule, category: f.category },
        })),
        citations: report.findings
          .filter((f) => f.filePath)
          .slice(0, 5)
          .map((f) => ({
            filePath: f.filePath!,
            startLine: 1,
            endLine: 1,
            symbol: f.symbol,
            confidence: 'high' as const,
          })),
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        toolName: 'engineering_analysis',
        success: false,
        error: err.message || 'Failed to execute engineering analysis',
        executionTimeMs: Date.now() - start,
      };
    }
  },
});

// ==========================================
// 5. SECURITY INTELLIGENCE (Phase 6)
// ==========================================
AgentToolRegistry.registerTool({
  name: 'security_analysis',
  description: 'Performs deterministic security scans for hardcoded secrets, sensitive files, unsafe patterns, auth gaps, and CVEs.',
  riskLevel: 'low',
  readOnly: true,
  requiresApproval: false,
  inputSchemaDescription: '{ repositoryId: string }',
  handler: async (input: { repositoryId: string }, context: AgentExecutionContext): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const { index, intelligence } = await AgentToolRegistry.getOrLoadRepoContext(input.repositoryId);
      const report: SecurityHealthReport = await analyzeSecurityHealth({
        repoIndex: index,
        intelligence,
      });

      // Redact sensitive finding details
      const safeFindings = report.findings.map((f) => ({
        ...f,
        description: AgentPolicy.sanitizeUntrustedContent(f.description),
      }));

      return {
        toolName: 'security_analysis',
        success: true,
        data: {
          summary: report.summary,
          findings: safeFindings,
          signals: {
            secretsStatus: report.secrets.status,
            sensitiveFilesStatus: report.sensitiveFiles.status,
            codePatternsStatus: report.codePatterns.status,
            authStatus: report.authentication.status,
            depsStatus: report.dependencies.status,
          },
        },
        evidence: safeFindings.slice(0, 10).map((f) => ({
          source: 'security',
          title: `[${f.severity.toUpperCase()}] ${f.title}`,
          file: f.filePath,
          lineRange: f.lineStart && f.lineEnd ? `${f.lineStart}-${f.lineEnd}` : undefined,
          details: { rule: f.deterministicRule, category: f.category },
        })),
        citations: safeFindings
          .filter((f) => f.filePath)
          .slice(0, 6)
          .map((f) => ({
            filePath: f.filePath!,
            startLine: f.lineStart || 1,
            endLine: f.lineEnd || 1,
            symbol: f.symbol,
            confidence: 'high' as const,
          })),
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        toolName: 'security_analysis',
        success: false,
        error: err.message || 'Failed to execute security analysis',
        executionTimeMs: Date.now() - start,
      };
    }
  },
});

// ==========================================
// 6. RAG QUERY (Phase 4)
// ==========================================
AgentToolRegistry.registerTool({
  name: 'rag_query',
  description: 'Searches indexed codebase chunks via hybrid lexical/semantic retrieval and constructs grounded answers with verified citations.',
  riskLevel: 'low',
  readOnly: true,
  requiresApproval: false,
  inputSchemaDescription: '{ repositoryId: string, question: string }',
  handler: async (
    input: { repositoryId: string; question: string },
    context: AgentExecutionContext
  ): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const { index, intelligence } = await AgentToolRegistry.getOrLoadRepoContext(input.repositoryId);
      const ragPipeline = new CodebaseRAGPipeline();

      // Ensure repository is indexed
      await ragPipeline.indexRepository(input.repositoryId, index, intelligence);

      const qaRequest: QARequest = {
        repositoryId: input.repositoryId,
        commitSha: context.commitSha || index.repository.defaultBranch || 'main',
        question: input.question,
      };

      const qaResponse = await ragPipeline.askQuestion(qaRequest, index, intelligence);

      return {
        toolName: 'rag_query',
        success: true,
        data: {
          answer: qaResponse.answer,
          confidence: qaResponse.confidence,
          chunksCount: (qaResponse.retrievedChunks || []).length,
        },
        evidence: (qaResponse.citations || []).map((c) => ({
          source: 'rag',
          title: `Citation in ${c.filePath}`,
          file: c.filePath,
          lineRange: c.startLine && c.endLine ? `${c.startLine}-${c.endLine}` : undefined,
          snippet: c.snippet,
        })),
        citations: qaResponse.citations || [],
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        toolName: 'rag_query',
        success: false,
        error: err.message || 'Failed to execute RAG query',
        executionTimeMs: Date.now() - start,
      };
    }
  },
});

// ==========================================
// 7. PR REVIEW (Phase 8)
// ==========================================
AgentToolRegistry.registerTool({
  name: 'pr_review',
  description: 'Evaluates a GitHub Pull Request deterministically for architecture, security, testing, and dependency impact.',
  riskLevel: 'low',
  readOnly: true,
  requiresApproval: false,
  inputSchemaDescription: '{ repositoryId: string, pullRequestNumber: number }',
  handler: async (
    input: { repositoryId: string; pullRequestNumber: number },
    context: AgentExecutionContext
  ): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const prRequest: PRReviewRequest = {
        repositoryId: input.repositoryId,
        pullRequestNumber: input.pullRequestNumber,
      };

      const review: PullRequestReview = await PRReviewEngine.reviewPullRequest(prRequest);

      return {
        toolName: 'pr_review',
        success: true,
        data: {
          summary: review.summary,
          findings: review.findings,
          changedFilesCount: review.pullRequest.changedFilesCount,
          verdict: review.summary.verdict,
        },
        evidence: review.findings.map((f) => ({
          source: 'pr',
          title: `[${f.severity.toUpperCase()}] ${f.title}`,
          file: f.file || f.evidence?.filePath,
          lineRange: f.lineRange,
          details: { category: f.category, rule: f.rule },
        })),
        citations: review.findings
          .filter((f) => f.file || f.evidence?.filePath)
          .map((f) => ({
            filePath: f.file || f.evidence.filePath,
            startLine: f.line || 1,
            endLine: f.line || 1,
            symbol: f.symbol,
            confidence: 'high' as const,
          })),
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        toolName: 'pr_review',
        success: false,
        error: err.message || 'Failed to review pull request',
        executionTimeMs: Date.now() - start,
      };
    }
  },
});

// ==========================================
// 8. GENERATE FIX PROPOSAL (Phase 7)
// ==========================================
AgentToolRegistry.registerTool({
  name: 'generate_fix',
  description: 'Generates a structured, reviewable CodeFixProposal with unified diff and validation plan. Does NOT apply changes.',
  riskLevel: 'medium',
  readOnly: true,
  requiresApproval: false,
  inputSchemaDescription:
    '{ repositoryId: string, findingId: string, category: "security" | "engineering", filePath: string, symbol?: string, lineRange?: string, findingRule?: string, requestedAction?: string }',
  handler: async (
    input: {
      repositoryId: string;
      findingId: string;
      category: 'security' | 'engineering';
      filePath: string;
      symbol?: string;
      lineRange?: string;
      findingRule?: string;
      requestedAction?: string;
      findingTitle?: string;
    },
    context: AgentExecutionContext
  ): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const { index, intelligence } = await AgentToolRegistry.getOrLoadRepoContext(input.repositoryId);

      const fixRequest: CodeFixRequest = {
        repositoryId: input.repositoryId,
        commitSha: context.commitSha || index.repository.defaultBranch || 'main',
        findingId: input.findingId,
        category: input.category,
        filePath: input.filePath,
        symbol: input.symbol,
        lineRange: input.lineRange,
        findingRule: input.findingRule,
        requestedAction: input.requestedAction || 'Remediate identified issue safely',
        findingTitle: input.findingTitle,
      };

      const proposal: CodeFixProposal = await fixEngineInstance.generateFix(fixRequest, {
        repoIndex: index,
        intelligence,
      });

      return {
        toolName: 'generate_fix',
        success: true,
        data: { proposal },
        evidence: [
          {
            source: 'repository',
            title: `Fix proposal for ${proposal.targetFile}`,
            file: proposal.targetFile,
            snippet: proposal.afterCode,
          },
        ],
        citations: [
          {
            filePath: proposal.targetFile,
            startLine: proposal.startLine || 1,
            endLine: proposal.endLine || 1,
            symbol: proposal.affectedSymbols[0],
          },
        ],
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        toolName: 'generate_fix',
        success: false,
        error: err.message || 'Failed to generate fix proposal',
        executionTimeMs: Date.now() - start,
      };
    }
  },
});

// ==========================================
// 9. VALIDATE PATCH (Phase 7)
// ==========================================
AgentToolRegistry.registerTool({
  name: 'validate_patch',
  description: 'Validates a proposed code diff against repository AST syntax, file boundaries, and integrity rules.',
  riskLevel: 'low',
  readOnly: true,
  requiresApproval: false,
  inputSchemaDescription: '{ repositoryId: string, proposal: CodeFixProposal }',
  handler: async (
    input: { repositoryId: string; proposal: CodeFixProposal },
    context: AgentExecutionContext
  ): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const { index } = await AgentToolRegistry.getOrLoadRepoContext(input.repositoryId);
      const validation = validateProposalPatch(input.proposal, index);

      return {
        toolName: 'validate_patch',
        success: true,
        data: validation,
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        toolName: 'validate_patch',
        success: false,
        error: err.message || 'Failed to validate patch',
        executionTimeMs: Date.now() - start,
      };
    }
  },
});

// ==========================================
// 10. WEBHOOK EVENTS (Phase 9)
// ==========================================
AgentToolRegistry.registerTool({
  name: 'webhook_events',
  description: 'Inspects recent GitHub webhook events and background repository jobs.',
  riskLevel: 'low',
  readOnly: true,
  requiresApproval: false,
  inputSchemaDescription: '{ repositoryId?: string }',
  handler: async (input: { repositoryId?: string }, context: AgentExecutionContext): Promise<ToolResult> => {
    const start = Date.now();
    try {
      const deliveries = WebhookJobManager.getRecentDeliveries(20);
      const filtered = input?.repositoryId
        ? deliveries.filter((d) => d.repositoryId === input.repositoryId)
        : deliveries;

      return {
        toolName: 'webhook_events',
        success: true,
        data: {
          eventsCount: filtered.length,
          recentEvents: filtered.slice(0, 10),
        },
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        toolName: 'webhook_events',
        success: false,
        error: err.message || 'Failed to inspect webhook events',
        executionTimeMs: Date.now() - start,
      };
    }
  },
});

// ==========================================
// 11. APPLY FIX (Phase 7 - WRITE ACTION)
// ==========================================
AgentToolRegistry.registerTool({
  name: 'apply_fix',
  description:
    'Applies an approved CodeFixProposal in-memory to the repository representation. Requires explicit human approval and exact commit matching.',
  riskLevel: 'high',
  readOnly: false,
  requiresApproval: true,
  inputSchemaDescription:
    '{ repositoryId: string, commitSha: string, proposalId: string, expectedDiffHash: string, confirmedByUser: boolean }',
  handler: async (
    input: {
      repositoryId: string;
      commitSha: string;
      proposalId: string;
      expectedDiffHash: string;
      confirmedByUser: boolean;
    },
    context: AgentExecutionContext
  ): Promise<ToolResult> => {
    const start = Date.now();
    try {
      if (!input.confirmedByUser) {
        return {
          toolName: 'apply_fix',
          success: false,
          error: 'User confirmation flag is missing or false. Action rejected.',
          executionTimeMs: Date.now() - start,
        };
      }

      const { index } = await AgentToolRegistry.getOrLoadRepoContext(input.repositoryId);
      const res = await fixEngineInstance.applyFix(
        {
          proposalId: input.proposalId,
          repositoryId: input.repositoryId,
          commitSha: input.commitSha,
          expectedDiffHash: input.expectedDiffHash,
          confirmedByUser: input.confirmedByUser,
        },
        index
      );

      return {
        toolName: 'apply_fix',
        success: res.success,
        data: res,
        evidence: [
          {
            source: 'repository',
            title: `Patch applied to ${res.modifiedFiles.map((m) => m.path).join(', ')}`,
            details: { modifiedCount: res.modifiedFiles.length },
          },
        ],
        executionTimeMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        toolName: 'apply_fix',
        success: false,
        error: err.message || 'Failed to apply fix',
        executionTimeMs: Date.now() - start,
      };
    }
  },
});
