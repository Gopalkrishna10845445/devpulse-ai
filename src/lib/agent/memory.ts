/**
 * Phase 10 — DevPilot Agent Memory & Context Compaction
 *
 * Implements bounded, repository-isolated session memory.
 * Stores conversation turns, tool results, findings, and decisions.
 * Performs compacting and pruning to avoid unbounded context expansion.
 */

import { AGENT_LIMITS, AgentPolicy } from './policy';
import { AgentEvidence, AgentProposedAction } from './types';
import { Citation } from '../rag/types';

export interface MemoryTurn {
  id: string;
  timestamp: string;
  role: 'user' | 'agent';
  message: string;
  intent?: string;
  toolSummaries?: string[];
  findingsCount?: number;
  citations?: Citation[];
  actions?: AgentProposedAction[];
}

export class AgentSessionMemory {
  // Keyed by `repositoryId:::conversationId`
  private static sessions: Map<string, MemoryTurn[]> = new Map();
  private static repoApprovals: Map<string, AgentProposedAction[]> = new Map();

  private static getSessionKey(repositoryId: string, conversationId: string): string {
    return `${repositoryId}:::${conversationId}`;
  }

  /**
   * Retrieves conversation history for the exact repository and conversation ID.
   * Enforces repository isolation.
   */
  public static getHistory(repositoryId: string, conversationId: string): MemoryTurn[] {
    const key = this.getSessionKey(repositoryId, conversationId);
    return this.sessions.get(key) || [];
  }

  /**
   * Adds a new turn to session memory with automatic context compaction.
   */
  public static addTurn(
    repositoryId: string,
    conversationId: string,
    turn: Omit<MemoryTurn, 'id' | 'timestamp'>
  ): void {
    const key = this.getSessionKey(repositoryId, conversationId);
    const existing = this.sessions.get(key) || [];

    const newTurn: MemoryTurn = {
      ...turn,
      id: `turn-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      message: AgentPolicy.sanitizeUntrustedContent(turn.message),
    };

    existing.push(newTurn);

    // Compact if exceeding max memory turns
    if (existing.length > AGENT_LIMITS.MAX_MEMORY_MESSAGES) {
      const compacted = this.compactHistory(existing);
      this.sessions.set(key, compacted);
    } else {
      this.sessions.set(key, existing);
    }
  }

  /**
   * Compacts conversation history by summarizing older turns and keeping recent turns.
   */
  private static compactHistory(turns: MemoryTurn[]): MemoryTurn[] {
    const retainCount = 6;
    if (turns.length <= retainCount) return turns;

    const olderTurns = turns.slice(0, turns.length - retainCount);
    const recentTurns = turns.slice(turns.length - retainCount);

    const summaryItems = olderTurns.map(
      (t) => `[${t.role.toUpperCase()} @ ${t.timestamp.substring(11, 19)}]: ${t.message.substring(0, 100)}${t.message.length > 100 ? '...' : ''}`
    );

    const compactedSummaryTurn: MemoryTurn = {
      id: `compacted-${Date.now()}`,
      timestamp: new Date().toISOString(),
      role: 'agent',
      message: `Previous conversation summary:\n${summaryItems.join('\n')}`,
    };

    return [compactedSummaryTurn, ...recentTurns];
  }

  /**
   * Records a proposed action for approval tracking.
   */
  public static storePendingAction(action: AgentProposedAction): void {
    const repoKey = `${action.targetRepository}:::${action.targetCommit}`;
    const list = this.repoApprovals.get(repoKey) || [];
    list.push(action);
    this.repoApprovals.set(repoKey, list);
  }

  /**
   * Retrieves a pending action by ID and verifies repository/commit scope.
   */
  public static getAction(
    actionId: string,
    repositoryId: string,
    commitSha: string
  ): AgentProposedAction | undefined {
    const repoKey = `${repositoryId}:::${commitSha}`;
    const list = this.repoApprovals.get(repoKey) || [];
    return list.find((a) => a.id === actionId);
  }

  /**
   * Updates an action status.
   */
  public static updateActionStatus(
    actionId: string,
    repositoryId: string,
    commitSha: string,
    status: AgentProposedAction['status']
  ): boolean {
    const action = this.getAction(actionId, repositoryId, commitSha);
    if (action) {
      action.status = status;
      return true;
    }
    return false;
  }

  /**
   * Clears session memory for a repository conversation (useful in testing or reset).
   */
  public static clearSession(repositoryId: string, conversationId: string): void {
    const key = this.getSessionKey(repositoryId, conversationId);
    this.sessions.delete(key);
  }

  /**
   * Clears all agent memory (testing use).
   */
  public static clearAll(): void {
    this.sessions.clear();
    this.repoApprovals.clear();
  }
}
