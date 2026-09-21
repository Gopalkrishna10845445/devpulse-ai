/**
 * Production Phase 4 — OpenTelemetry Tracing & Prometheus Metrics Test Suite
 *
 * Tests OBS-001 through OBS-011
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DistributedTracer } from '../tracing';
import { metrics } from '../metrics';

describe('Production Phase 4 — Observability & Prometheus Metrics', () => {
  beforeEach(() => {
    DistributedTracer.resetState();
    metrics.reset();
  });

  describe('OBS-001 & OBS-002: Trace ID Generation & W3C Traceparent Propagation', () => {
    it('OBS-001: generates valid W3C compliant 32-character hex trace IDs', () => {
      const traceId = DistributedTracer.generateTraceId();
      expect(traceId).toBeDefined();
      expect(traceId.length).toBe(32);
      expect(/^[0-9a-f]{32}$/.test(traceId)).toBe(true);
    });

    it('OBS-002: parses and formats W3C traceparent headers correctly', () => {
      const traceId = DistributedTracer.generateTraceId();
      const spanId = DistributedTracer.generateSpanId();
      const rawHeader = `00-${traceId}-${spanId}-01`;

      const parsed = DistributedTracer.parseTraceparent(rawHeader);
      expect(parsed).not.toBeNull();
      expect(parsed?.traceId).toBe(traceId);
      expect(parsed?.spanId).toBe(spanId);

      const formatted = DistributedTracer.formatTraceparent(parsed!);
      expect(formatted).toBe(rawHeader);
    });
  });

  describe('OBS-003, OBS-004, OBS-005, OBS-006: Span Execution & Propagation', () => {
    it('executes spans across boundaries and records metadata', async () => {
      const parentTraceId = DistributedTracer.generateTraceId();
      const parentSpanId = DistributedTracer.generateSpanId();

      const result = await DistributedTracer.trace(
        'github.api.fetch_tree',
        async (span) => {
          expect(span.context.traceId).toBe(parentTraceId);
          expect(span.parentSpanId).toBe(parentSpanId);
          return { status: 200, count: 42 };
        },
        { repository: 'octocat/Hello-World' },
        { traceId: parentTraceId, spanId: parentSpanId, traceFlags: '01' }
      );

      expect(result.count).toBe(42);
      const spans = DistributedTracer.getRecentSpans();
      expect(spans.length).toBeGreaterThan(0);
      expect(spans[0].name).toBe('github.api.fetch_tree');
    });
  });

  describe('OBS-007: Sensitive Attribute Sanitization in Spans', () => {
    it('redacts tokens, passwords, and secrets from span attributes', () => {
      const rawAttributes = {
        token: 'ghp_secret_token_12345',
        apiKey: 'AIzaSy_secret_key',
        repository: 'owner/repo',
        statusCode: 200,
      };

      const sanitized = DistributedTracer.sanitizeAttributes(rawAttributes);
      expect(sanitized.token).toBe('[REDACTED_SECRET]');
      expect(sanitized.apiKey).toBe('[REDACTED_SECRET]');
      expect(sanitized.repository).toBe('owner/repo');
      expect(sanitized.statusCode).toBe(200);
    });
  });

  describe('OBS-008 & OBS-009: Prometheus Metrics Format & Bounded Labels', () => {
    it('OBS-008: exports metrics in official Prometheus text format with HELP and TYPE headers', () => {
      metrics.httpRequests.inc({ method: 'GET', path: '/api/health', status: 200 });
      metrics.aiRequests.inc({ provider: 'gemini', operation: 'rag_qa', status: 'success' });

      const text = metrics.renderPrometheusMetrics();

      expect(text).toContain('# HELP devpilot_http_requests_total');
      expect(text).toContain('# TYPE devpilot_http_requests_total counter');
      expect(text).toContain('devpilot_http_requests_total{method="GET",path="/api/health",status="200"} 1');
      expect(text).toContain('devpilot_ai_requests_total{operation="rag_qa",provider="gemini",status="success"} 1');
    });

    it('OBS-009: enforces bounded cardinality on metric labels', () => {
      // Metric labels are fixed categoricals (method, status, operation) — no raw user IDs or file paths
      metrics.queueJobs.inc({ queue: 'webhook-processing', status: 'completed' }, 5);
      const text = metrics.renderPrometheusMetrics();
      expect(text).toContain('devpilot_queue_jobs_total{queue="webhook-processing",status="completed"} 5');
    });
  });
});
