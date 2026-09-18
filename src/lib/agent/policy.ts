/**
 * Phase 10 — DevPilot Agent Policy & Guardrails
 *
 * Enforces action budgets, read-only defaults, repository isolation,
 * prompt injection defense, secret redaction, and command allowlisting.
 */

import { maskTextSecrets } from '../security/redactor';
import { AgentExecutionContext, ToolDefinition } from './types';

export const AGENT_LIMITS = {
  MAX_STEPS: 8,
  MAX_TOOL_CALLS: 10,
  MAX_RETRIES: 3,
  MAX_EXECUTION_TIME_MS: 30000,
  MAX_MEMORY_MESSAGES: 20,
  APPROVAL_TTL_MS: 15 * 60 * 1000, // 15 minutes
};

const ALLOWED_COMMANDS = new Set([
  'npx tsc --noEmit',
  'npm test',
  'npm run lint',
  'npm run build',
  'npx vitest run',
  'npx eslint .',
]);

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior) instructions/i,
  /system prompt/i,
  /override (all )?guardrails/i,
  /you are now in developer mode/i,
  /dan mode/i,
  /bypass safety/i,
  /execute arbitrary/i,
  /rm -rf/i,
  /git push --force/i,
  /delete database/i,
  /publish secrets/i,
];

export class AgentPolicy {
  /**
   * Sanitizes untrusted repository content to prevent prompt injection.
   */
  public static sanitizeUntrustedContent(content: string): string {
    if (!content) return '';
    let sanitized = maskTextSecrets(content);
    // Neutralize backtick escaping and format marker tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[SCRIPT REDACTED]');
    return sanitized;
  }

  /**
   * Wraps repository content in strict untrusted data boundaries.
   */
  public static wrapUntrustedData(label: string, content: string): string {
    const sanitized = this.sanitizeUntrustedContent(content);
    return `<untrusted_${label}>\n${sanitized}\n</untrusted_${label}>`;
  }

  /**
   * Checks if user prompt or untrusted repository text contains malicious injection signals.
   */
  public static detectPromptInjection(text: string): { isMalicious: boolean; matchedPattern?: string } {
    if (!text) return { isMalicious: false };
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return { isMalicious: true, matchedPattern: pattern.source };
      }
    }
    return { isMalicious: false };
  }

  /**
   * Validates tool invocation against policy rules:
   * - Tool existence & permissions
   * - Read-only default (blocks write tools without approval)
   * - Repository isolation
   * - Budget limits
   */
  public static validateToolCall(
    tool: ToolDefinition,
    input: any,
    context: AgentExecutionContext
  ): { allowed: boolean; reason?: string } {
    // 1. Check budget
    if (context.remainingStepsBudget <= 0) {
      return { allowed: false, reason: 'Step budget exhausted. Max steps limit reached.' };
    }
    if (context.remainingToolCallsBudget <= 0) {
      return { allowed: false, reason: 'Tool call budget exhausted. Max tool calls reached.' };
    }

    // 2. Repository isolation check
    if (input && input.repositoryId && input.repositoryId !== context.repositoryId) {
      return {
        allowed: false,
        reason: `Repository boundary violation: Tool tried to access '${input.repositoryId}' while scoped to '${context.repositoryId}'.`,
      };
    }

    // 3. Read-only mode check
    if (!tool.readOnly && context.readOnly) {
      return {
        allowed: false,
        reason: `Tool '${tool.name}' is a write action. Read-only mode prohibits autonomous execution without human approval.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Checks if a proposed validation command is in the strict allowlist.
   */
  public static isCommandAllowed(command: string): boolean {
    const trimmed = command.trim();
    return ALLOWED_COMMANDS.has(trimmed);
  }

  /**
   * Redacts secrets from any payload or object recursively.
   */
  public static redactSecrets<T>(obj: T): T {
    if (typeof obj === 'string') {
      return maskTextSecrets(obj) as unknown as T;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactSecrets(item)) as unknown as T;
    }
    if (obj !== null && typeof obj === 'object') {
      const redacted: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (/token|secret|password|key|auth/i.test(k) && typeof v === 'string') {
          redacted[k] = '[REDACTED_SECRET]';
        } else {
          redacted[k] = this.redactSecrets(v);
        }
      }
      return redacted as unknown as T;
    }
    return obj;
  }
}
