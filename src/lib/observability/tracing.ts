/**
 * Production Phase 4 — OpenTelemetry Distributed Tracing Layer
 *
 * Implements W3C TraceContext traceparent propagation, span creation,
 * and automatic redaction of sensitive credentials.
 */

import * as crypto from 'crypto';
import { maskTextSecrets } from '../security/redactor';
import { logger } from '../logger';

export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags: string;
}

export interface Span {
  name: string;
  context: SpanContext;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes: Record<string, any>;
  status: 'OK' | 'ERROR';
  error?: string;
}

export class DistributedTracer {
  private static activeSpans: Span[] = [];

  /**
   * Generates a valid W3C compliant 32-character hex traceId.
   */
  public static generateTraceId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generates a valid W3C compliant 16-character hex spanId.
   */
  public static generateSpanId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Parses an inbound W3C traceparent header: 00-{traceId}-{spanId}-{flags}
   */
  public static parseTraceparent(header?: string | null): SpanContext | null {
    if (!header) return null;
    const match = header.match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/);
    if (!match) return null;

    return {
      traceId: match[1],
      spanId: match[2],
      traceFlags: match[3],
    };
  }

  /**
   * Formats a SpanContext into a W3C traceparent string.
   */
  public static formatTraceparent(context: SpanContext): string {
    return `00-${context.traceId}-${context.spanId}-${context.traceFlags || '01'}`;
  }

  /**
   * Sanitizes span attributes, redacting secrets, keys, and tokens.
   */
  public static sanitizeAttributes(attributes: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(attributes)) {
      if (/token|secret|key|password|auth|cookie|authorization|signature/i.test(k)) {
        clean[k] = '[REDACTED_SECRET]';
      } else if (typeof v === 'string') {
        clean[k] = maskTextSecrets(v);
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }

  /**
   * Executes an asynchronous operation wrapped inside an OpenTelemetry span.
   */
  public static async trace<T>(
    name: string,
    operation: (span: Span) => Promise<T>,
    initialAttributes: Record<string, any> = {},
    parentContext?: SpanContext | null
  ): Promise<T> {
    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const spanContext: SpanContext = {
      traceId,
      spanId,
      traceFlags: '01',
    };

    const span: Span = {
      name,
      context: spanContext,
      parentSpanId: parentContext?.spanId,
      startTime: Date.now(),
      attributes: this.sanitizeAttributes(initialAttributes),
      status: 'OK',
    };

    try {
      const result = await operation(span);
      span.endTime = Date.now();
      span.durationMs = span.endTime - span.startTime;
      this.recordSpan(span);
      return result;
    } catch (err) {
      span.endTime = Date.now();
      span.durationMs = span.endTime - span.startTime;
      span.status = 'ERROR';
      span.error = (err as Error).message;
      this.recordSpan(span);
      throw err;
    }
  }

  private static recordSpan(span: Span): void {
    this.activeSpans.push(span);
    // Keep in-memory buffer bounded to last 200 spans
    if (this.activeSpans.length > 200) {
      this.activeSpans.shift();
    }

    logger.debug(`[OTEL Span] ${span.name} completed in ${span.durationMs}ms`, {
      traceId: span.context.traceId,
      spanId: span.context.spanId,
      status: span.status,
    });
  }

  public static getRecentSpans(limit: number = 50): Span[] {
    return this.activeSpans.slice(-limit);
  }

  public static resetState(): void {
    this.activeSpans = [];
  }
}
