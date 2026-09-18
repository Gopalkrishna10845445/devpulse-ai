/**
 * Phase 11 — Structured Server-Side Observability & Logging
 *
 * Emits structured JSON logs for backend operations, API calls, and agent actions.
 * Enforces automatic secret and token redaction, prevents leaking chain-of-thought,
 * and maintains execution context (requestId, traceId, repositoryId, commitSha, duration).
 */

import { maskTextSecrets } from './security/redactor';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  traceId?: string;
  repositoryId?: string;
  commitSha?: string;
  operation?: string;
  durationMs?: number;
  statusCode?: number;
  errorCategory?:
    | 'VALIDATION_ERROR'
    | 'AUTH_ERROR'
    | 'GITHUB_API_ERROR'
    | 'RATE_LIMIT_ERROR'
    | 'INGESTION_ERROR'
    | 'INDEXING_ERROR'
    | 'RETRIEVAL_ERROR'
    | 'LLM_ERROR'
    | 'SECURITY_ERROR'
    | 'AGENT_ERROR'
    | 'INTERNAL_ERROR';
  [key: string]: any;
}

export class Logger {
  private static redactData(data: any): any {
    if (data === null || data === undefined) return data;
    if (typeof data === 'string') {
      return maskTextSecrets(data);
    }
    if (Array.isArray(data)) {
      return data.map(item => this.redactData(item));
    }
    if (typeof data === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        if (/token|secret|password|key|auth|credential|authorization|x-hub-signature/i.test(key)) {
          sanitized[key] = '[REDACTED_SECRET]';
        } else if (/prompt|chainOfThought|systemInstruction/i.test(key)) {
          // Avoid logging raw internal prompts or hidden chain-of-thought
          sanitized[key] = '[REDACTED_INTERNAL_PROMPT]';
        } else {
          sanitized[key] = this.redactData(value);
        }
      }
      return sanitized;
    }
    return data;
  }

  private static emit(level: LogLevel, message: string, context?: LogContext, error?: any) {
    const timestamp = new Date().toISOString();
    const cleanMessage = maskTextSecrets(message);

    const logEntry: Record<string, any> = {
      timestamp,
      level,
      message: cleanMessage,
    };

    if (context) {
      Object.assign(logEntry, this.redactData(context));
    }

    if (error) {
      logEntry.error = {
        message: maskTextSecrets(error.message || String(error)),
        code: error.code,
        name: error.name,
      };
      // In non-production, include error name; never log full unredacted stack with credentials in prod
    }

    const jsonString = JSON.stringify(logEntry);

    switch (level) {
      case 'error':
        console.error(jsonString);
        break;
      case 'warn':
        console.warn(jsonString);
        break;
      case 'debug':
        if (process.env.NODE_ENV !== 'production') {
          console.debug(jsonString);
        }
        break;
      case 'info':
      default:
        console.log(jsonString);
        break;
    }
  }

  public static info(message: string, context?: LogContext) {
    this.emit('info', message, context);
  }

  public static warn(message: string, context?: LogContext, error?: any) {
    this.emit('warn', message, context, error);
  }

  public static error(message: string, context?: LogContext, error?: any) {
    this.emit('error', message, context, error);
  }

  public static debug(message: string, context?: LogContext) {
    this.emit('debug', message, context);
  }
}
