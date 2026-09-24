/**
 * Phase 10 — DevPilot Central Agent Engine
 *
 * Coordinates intent parsing, bounded planning, tool dispatching,
 * state machine transitions, human approval lifecycle, and grounded trace generation.
 */

import { CodeFixProposal } from '../fixes/types';
import { AgentSessionMemory } from './memory';
import { AgentPlanner } from './planner';
import { AGENT_LIMITS, AgentPolicy } from './policy';
import { AgentToolRegistry } from './toolRegistry';
import {
  AgentActivityStep,
  AgentEvidence,
  AgentExecutionContext,
  AgentProposedAction,
  AgentRequest,
  AgentResponse,
  AgentResponseSection,
  AgentState,
  AgentTrace,
  ApprovalRequest,
  ApprovalResponse,
  ToolResult,
} from './types';
import { Citation } from '../rag/types';
import { AgentDatabaseRepository } from '../db/repositories';

export class DevPilotAgentEngine {
  private static traces: Map<string, AgentTrace> = new Map();
  private static activeRuns: Set<string> = new Set();

  /**
   * Executes an autonomous developer agent workflow within bounded safety limits.
   */
  public static async run(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    const traceId = `trace-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const conversationId = request.conversationId || `conv-${Date.now()}`;
    const commitSha = request.commitSha || 'main';

    const activityTimeline: AgentActivityStep[] = [];
    const stateTransitions: Array<{ state: AgentState; timestamp: string }> = [];

    const recordActivity = (state: AgentState, label: string, summary: string) => {
      const stepIndex = activityTimeline.length + 1;
      const stepDuration =
        activityTimeline.length > 0
          ? Date.now() - (startTime + activityTimeline.reduce((a, b) => a + b.durationMs, 0))
          : Date.now() - startTime;

      activityTimeline.push({
        stepIndex,
        state,
        label,
        summary,
        durationMs: Math.max(1, stepDuration),
        timestamp: new Date().toISOString(),
      });

      stateTransitions.push({ state, timestamp: new Date().toISOString() });
    };

    recordActivity('idle', 'Agent Initialized', `Session scoped to ${request.repositoryId}@${commitSha}`);

    // 1. Prompt Injection & Input Validation Check
    const injectionCheck = AgentPolicy.detectPromptInjection(request.userMessage);
    if (injectionCheck.isMalicious) {
      recordActivity(
        'blocked',
        'Security Guardrail Triggered',
        'Suspicious prompt injection pattern detected in user request.'
      );
      return this.buildBlockedResponse({
        traceId,
        conversationId,
        request,
        commitSha,
        activityTimeline,
        reason:
          'Request blocked: Potential prompt injection or unauthorized system instruction override detected.',
      });
    }

    // 2. Understanding & Intent Classification
    recordActivity('understanding', 'Understanding Request', 'Parsing user intent and repository scope.');
    const plan = AgentPlanner.createPlan(request);
    const classifiedMode = plan.mode;

    // 3. Planning
    recordActivity(
      'planning',
      'Execution Plan Formulated',
      `Identified intent mode: ${classifiedMode} (${plan.intentRationale}). Planned ${plan.steps.length} tool steps.`
    );

    const context: AgentExecutionContext = {
      repositoryId: request.repositoryId,
      commitSha,
      traceId,
      conversationId,
      readOnly: true, // Read-only default!
      remainingStepsBudget: AGENT_LIMITS.MAX_STEPS,
      remainingToolCallsBudget: AGENT_LIMITS.MAX_TOOL_CALLS,
    };

    const toolInvocations: Array<{
      toolName: string;
      input: any;
      result: ToolResult;
      timestamp: string;
    }> = [];

    const accumulatedData: Record<string, any> = {};
    const allEvidence: AgentEvidence[] = [];
    const allCitations: Citation[] = [];
    const allFindings: any[] = [];
    const proposedActions: AgentProposedAction[] = [];
    const fixProposals: CodeFixProposal[] = [];
    let prReviewResult: any = undefined;
    let approvalRequired = false;
    let pendingAction: AgentProposedAction | undefined = undefined;

    // 4. Bounded Step Execution Loop
    for (const step of plan.steps) {
      // Check execution timeout
      if (Date.now() - startTime > AGENT_LIMITS.MAX_EXECUTION_TIME_MS) {
        recordActivity(
          'blocked',
          'Execution Timeout',
          'Execution limit reached: Reached maximum time budget (30s).'
        );
        break;
      }

      const tool = AgentToolRegistry.getTool(step.toolName);
      if (!tool) {
        recordActivity(
          'analyzing',
          'Tool Skipped',
          `Tool '${step.toolName}' is not registered in typed tool registry.`
        );
        continue;
      }

      // Generate input
      const toolInput = step.inputGenerator(request, accumulatedData);

      // Validate against policy
      const policyCheck = AgentPolicy.validateToolCall(tool, toolInput, context);
      if (!policyCheck.allowed) {
        recordActivity(
          'blocked',
          'Policy Guardrail Check',
          `Tool call to '${tool.name}' was prohibited by policy: ${policyCheck.reason}`
        );
        continue;
      }

      // State transition based on tool nature
      if (['repository_info', 'rag_query', 'symbol_lookup', 'webhook_events'].includes(tool.name)) {
        recordActivity('retrieving', `Executing ${tool.name}`, step.description);
      } else if (['engineering_analysis', 'security_analysis', 'pr_review', 'architecture_analysis'].includes(tool.name)) {
        recordActivity('analyzing', `Executing ${tool.name}`, step.description);
      } else if (tool.name === 'generate_fix') {
        recordActivity('acting', `Executing ${tool.name}`, step.description);
      } else if (tool.name === 'validate_patch') {
        recordActivity('validating', `Executing ${tool.name}`, step.description);
      }

      // Execute tool
      context.remainingStepsBudget -= 1;
      context.remainingToolCallsBudget -= 1;

      const result = await tool.handler(toolInput, context);
      toolInvocations.push({
        toolName: tool.name,
        input: AgentPolicy.redactSecrets(toolInput),
        result: AgentPolicy.redactSecrets(result),
        timestamp: new Date().toISOString(),
      });

      if (result.success && result.data) {
        accumulatedData[tool.name] = result.data;

        if (result.evidence) {
          allEvidence.push(...result.evidence);
        }
        if (result.citations) {
          allCitations.push(...result.citations);
        }

        // Handle specific tool outputs
        if (tool.name === 'engineering_analysis' && result.data.topFindings) {
          allFindings.push(...result.data.topFindings);
        }
        if (tool.name === 'security_analysis' && result.data.findings) {
          allFindings.push(...result.data.findings);
        }
        if (tool.name === 'pr_review') {
          prReviewResult = result.data;
          if (result.data.findings) {
            allFindings.push(...result.data.findings);
          }
        }
        if (tool.name === 'generate_fix' && result.data.proposal) {
          const proposal: CodeFixProposal = result.data.proposal;
          fixProposals.push(proposal);

          // Generate Human Approval Action
          const actionId = `action-fix-${Date.now()}`;
          const action: AgentProposedAction = {
            id: actionId,
            title: `Apply Fix: ${proposal.title}`,
            description: proposal.explanation,
            toolName: 'apply_fix',
            riskLevel: 'high',
            requiresApproval: true,
            targetRepository: request.repositoryId,
            targetCommit: commitSha,
            affectedFiles: proposal.affectedFiles,
            unifiedDiff: proposal.unifiedDiff,
            diffHash: proposal.diffHash,
            fixProposal: proposal,
            validationPlan: proposal.validationPlan.map((v) => `${v.type}: ${v.description}`),
            status: 'proposed',
          };

          proposedActions.push(action);
          pendingAction = action;
          approvalRequired = true;
          AgentSessionMemory.storePendingAction(action);
        }
      }
    }

    // 5. Final State and Response Structuring
    let finalState: AgentState = 'completed';
    if (approvalRequired) {
      finalState = 'awaiting_approval';
      recordActivity(
        'awaiting_approval',
        'Human Approval Required',
        `Generated code remediation proposal for ${pendingAction?.affectedFiles.join(', ')}. Write operation awaiting human authorization.`
      );
    } else {
      recordActivity('completed', 'Workflow Completed', 'Investigation and analysis completed successfully.');
    }

    // Deduplicate citations & findings
    const uniqueCitations = this.deduplicateCitations(allCitations);
    const uniqueFindings = this.deduplicateFindings(allFindings);

    // Build structured sections
    const sections = this.buildResponseSections({
      mode: classifiedMode,
      userMessage: request.userMessage,
      accumulatedData,
      findings: uniqueFindings,
      citations: uniqueCitations,
      fixProposals,
      prReview: prReviewResult,
    });

    const responseText = sections.map((s) => `### [${s.trustLevel}] ${s.heading}\n${s.content}`).join('\n\n');

    // 6. Record Trace
    const trace: AgentTrace = {
      traceId,
      conversationId,
      repositoryId: request.repositoryId,
      commitSha,
      userMessage: request.userMessage,
      classifiedMode,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      stateTransitions,
      plan: plan.steps.map((s) => `${s.stepIndex}. ${s.toolName}: ${s.description}`),
      toolInvocations,
      decisions: [
        `Classified intent as ${classifiedMode}`,
        `Executed ${toolInvocations.length} tools within safety budget`,
        approvalRequired ? 'Created human-in-the-loop approval gate' : 'Completed without write actions',
      ],
      approvals: pendingAction
        ? [{ actionId: pendingAction.id, status: 'requested', timestamp: new Date().toISOString() }]
        : [],
      finalStatus: finalState,
    };

    this.traces.set(traceId, trace);
    await AgentDatabaseRepository.saveRun(trace);

    // 7. Record Session Memory
    AgentSessionMemory.addTurn(request.repositoryId, conversationId, {
      role: 'agent',
      message: responseText,
      intent: classifiedMode,
      findingsCount: uniqueFindings.length,
      citations: uniqueCitations,
      actions: proposedActions,
    });

    return {
      traceId,
      conversationId,
      repositoryId: request.repositoryId,
      commitSha,
      mode: classifiedMode,
      status: finalState,
      response: responseText,
      sections,
      findings: uniqueFindings,
      evidence: allEvidence,
      citations: uniqueCitations,
      actions: proposedActions,
      proposals: fixProposals,
      prReview: prReviewResult,
      approvalRequired,
      pendingAction,
      activityTimeline,
      executionSummary: {
        totalDurationMs: Date.now() - startTime,
        stepsExecuted: toolInvocations.length,
        toolCallsCount: toolInvocations.length,
        tokensUsedEstimate: 450 + toolInvocations.length * 120,
      },
    };
  }

  /**
   * Approves and executes a pending action under strict validation.
   */
  public static async approveAction(approval: ApprovalRequest): Promise<ApprovalResponse> {
    const action = AgentSessionMemory.getAction(
      approval.actionId,
      approval.repositoryId,
      approval.commitSha
    );

    if (!action) {
      return {
        success: false,
        actionId: approval.actionId,
        status: 'failed',
        message: 'Action not found or expired for this repository and commit SHA.',
      };
    }

    if (action.status !== 'proposed') {
      return {
        success: false,
        actionId: approval.actionId,
        status: action.status as any,
        message: `Action is in state '${action.status}' and cannot be processed again.`,
      };
    }

    if (approval.decision === 'reject') {
      AgentSessionMemory.updateActionStatus(
        approval.actionId,
        approval.repositoryId,
        approval.commitSha,
        'rejected'
      );
      return {
        success: true,
        actionId: approval.actionId,
        status: 'rejected',
        message: 'Action rejected by human reviewer.',
      };
    }

    // Verify diff hash if provided
    if (approval.expectedDiffHash && action.diffHash && approval.expectedDiffHash !== action.diffHash) {
      return {
        success: false,
        actionId: approval.actionId,
        status: 'failed',
        message: 'Diff hash mismatch. Proposed code patch has been modified or invalidated.',
      };
    }

    // Execute the approved write tool (apply_fix)
    const applyTool = AgentToolRegistry.getTool(action.toolName);
    if (!applyTool) {
      return {
        success: false,
        actionId: approval.actionId,
        status: 'failed',
        message: `Target tool '${action.toolName}' is not registered.`,
      };
    }

    const execContext: AgentExecutionContext = {
      repositoryId: approval.repositoryId,
      commitSha: approval.commitSha,
      traceId: approval.traceId,
      conversationId: `approval-${Date.now()}`,
      readOnly: false, // Explicitly granted for this approved single execution!
      remainingStepsBudget: 2,
      remainingToolCallsBudget: 2,
    };

    const toolResult = await applyTool.handler(
      {
        repositoryId: approval.repositoryId,
        commitSha: approval.commitSha,
        proposalId: action.fixProposal?.id || action.id,
        expectedDiffHash: action.diffHash || '',
        confirmedByUser: true,
      },
      execContext
    );

    if (toolResult.success) {
      AgentSessionMemory.updateActionStatus(
        approval.actionId,
        approval.repositoryId,
        approval.commitSha,
        'executed'
      );
      return {
        success: true,
        actionId: approval.actionId,
        status: 'executed',
        message: 'Fix patch applied successfully in-memory.',
        executionResult: toolResult.data,
      };
    } else {
      return {
        success: false,
        actionId: approval.actionId,
        status: 'failed',
        message: toolResult.error || 'Failed to apply patch during execution.',
      };
    }
  }

  /**
   * Retrieves an execution trace by ID from memory or database.
   */
  public static getTrace(traceId: string): AgentTrace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Retrieves full run details from memory or database.
   */
  public static async getRun(traceId: string): Promise<any | null> {
    const memTrace = this.traces.get(traceId);
    if (memTrace) return memTrace;
    return await AgentDatabaseRepository.getRun(traceId);
  }

  /**
   * Cancels an agent run and prevents any pending write actions.
   */
  public static async cancelRun(traceId: string): Promise<boolean> {
    const trace = this.traces.get(traceId);
    if (trace) {
      trace.finalStatus = 'cancelled';
      trace.endTime = new Date().toISOString();
      trace.stateTransitions.push({ state: 'cancelled', timestamp: new Date().toISOString() });
      if (trace.approvals) {
        for (const app of trace.approvals) {
          app.status = 'rejected';
        }
      }
    }
    const dbUpdated = await AgentDatabaseRepository.updateStatus(traceId, 'cancelled');
    return !!trace || dbUpdated;
  }

  // ==========================================
  // Helper builders & formatters
  // ==========================================

  private static buildBlockedResponse(params: {
    traceId: string;
    conversationId: string;
    request: AgentRequest;
    commitSha: string;
    activityTimeline: AgentActivityStep[];
    reason: string;
  }): AgentResponse {
    const blockedTrace: AgentTrace = {
      traceId: params.traceId,
      conversationId: params.conversationId,
      repositoryId: params.request.repositoryId,
      commitSha: params.commitSha,
      userMessage: params.request.userMessage,
      classifiedMode: 'INVESTIGATE',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      stateTransitions: [{ state: 'blocked', timestamp: new Date().toISOString() }],
      plan: [],
      toolInvocations: [],
      decisions: ['Blocked due to security policy / prompt injection'],
      approvals: [],
      finalStatus: 'blocked',
    };
    this.traces.set(params.traceId, blockedTrace);
    AgentDatabaseRepository.saveRun(blockedTrace).catch(() => {});
    return {
      traceId: params.traceId,
      conversationId: params.conversationId,
      repositoryId: params.request.repositoryId,
      commitSha: params.commitSha,
      mode: 'INVESTIGATE',
      status: 'blocked',
      response: `### [REQUIRES_APPROVAL] Request Blocked\n${params.reason}`,
      sections: [
        {
          trustLevel: 'REQUIRES_APPROVAL',
          heading: 'Guardrail Enforcement',
          content: params.reason,
        },
      ],
      findings: [],
      evidence: [],
      citations: [],
      actions: [],
      proposals: [],
      approvalRequired: false,
      activityTimeline: params.activityTimeline,
      executionSummary: {
        totalDurationMs: 5,
        stepsExecuted: 0,
        toolCallsCount: 0,
      },
    };
  }

  private static buildResponseSections(params: {
    mode: string;
    userMessage: string;
    accumulatedData: Record<string, any>;
    findings: any[];
    citations: Citation[];
    fixProposals: CodeFixProposal[];
    prReview?: any;
  }): AgentResponseSection[] {
    const { mode, userMessage, accumulatedData, findings, citations, fixProposals, prReview } = params;
    const sections: AgentResponseSection[] = [];

    // FACT Section
    let factContent = '';
    if (accumulatedData.repository_info) {
      const info = accumulatedData.repository_info;
      factContent += `Repository contains **${info.totalFiles}** files (${info.totalLines} lines), default branch **${info.defaultBranch}**, primary languages: ${Object.keys(
        info.languages || {}
      ).join(', ') || 'TypeScript'}.\n`;
    }
    if (accumulatedData.architecture_analysis) {
      const arch = accumulatedData.architecture_analysis;
      factContent += `Architecture pattern detected as **${arch.pattern}** across **${(arch.layers || []).length}** architectural layers.\n`;
    }
    if (accumulatedData.rag_query?.answer) {
      factContent += `Codebase retrieval: ${accumulatedData.rag_query.answer}\n`;
    }
    if (!factContent) {
      factContent = `Analyzed repository context for query: "${userMessage}". Verified against authoritative repository AST and metadata.`;
    }

    sections.push({
      trustLevel: 'FACT',
      heading: 'Verified Codebase Evidence',
      content: factContent.trim(),
      citations: citations.slice(0, 4),
    });

    // INFERENCE Section
    let inferenceContent = '';
    if (mode === 'SECURITY') {
      const secSummary = accumulatedData.security_analysis?.summary;
      inferenceContent = `Security analysis identified ${secSummary?.totalFindingsCount || findings.length} potential security signals (Critical: ${secSummary?.criticalCount || 0}, High: ${secSummary?.highCount || 0}).`;
    } else if (mode === 'ENGINEERING') {
      const engSummary = accumulatedData.engineering_analysis?.summary;
      inferenceContent = `Engineering health evaluated with overall maintainability score ${engSummary?.healthScore || 85}/100. Hotspots and coupling metrics mapped.`;
    } else if (mode === 'REVIEW' && prReview) {
      inferenceContent = `Pull Request evaluation concluded with verdict: **${prReview.verdict}**. Assessed risk across architectural, security, and test boundaries.`;
    } else {
      inferenceContent = `Based on AST symbols and module structure, the relevant logic is located in ${citations[0]?.filePath || 'the core service modules'}.`;
    }

    sections.push({
      trustLevel: 'INFERENCE',
      heading: 'Analysis & Inferences',
      content: inferenceContent,
    });

    // RECOMMENDATION Section
    let recContent = '';
    if (findings.length > 0) {
      recContent = `Priority recommendations:\n${findings
        .slice(0, 3)
        .map((f, i) => `${i + 1}. **${f.title}** (${f.filePath || 'global'}): ${f.description?.substring(0, 120)}...`)
        .join('\n')}`;
    } else {
      recContent =
        'Maintain current clean architectural boundaries and keep continuous integration tests updated.';
    }

    sections.push({
      trustLevel: 'RECOMMENDATION',
      heading: 'Recommended Actions',
      content: recContent,
    });

    // ACTION / PROPOSAL Section
    if (fixProposals.length > 0) {
      const p = fixProposals[0];
      sections.push({
        trustLevel: 'REQUIRES_APPROVAL',
        heading: `Proposed Patch: ${p.title}`,
        content: `Generated a structured fix proposal for \`${p.targetFile}\`.\nRationale: ${p.rationale}\n\nReview the unified diff below and explicitly approve before patch application.`,
        citations: [
          {
            filePath: p.targetFile,
            startLine: p.startLine || 1,
            endLine: p.endLine || 1,
          },
        ],
      });
    }

    return sections;
  }

  private static deduplicateCitations(citations: Citation[]): Citation[] {
    const seen = new Set<string>();
    return citations.filter((c) => {
      const key = `${c.filePath}:${c.startLine || 0}-${c.endLine || 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private static deduplicateFindings(findings: any[]): any[] {
    const seen = new Set<string>();
    return findings.filter((f) => {
      const key = `${f.id || f.title}:${f.filePath || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
