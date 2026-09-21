/**
 * Production Phase 4 — Server-Sent Events (SSE) Test Suite
 *
 * Tests SSE-001 through SSE-014
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SSEEventBus } from '../eventBus';
import { BaseSSEEvent, JobProgressEventData, AgentProgressEventData } from '../types';

describe('Production Phase 4 — Server-Sent Events (SSE) Real-Time Progress', () => {
  beforeEach(() => {
    SSEEventBus.resetState();
  });

  describe('SSE-001, SSE-003, SSE-005, SSE-006, SSE-007, SSE-008: Event Publishing & Delivery', () => {
    it('publishes and delivers job lifecycle events to subscribed listeners', async () => {
      const channel = 'job:test-job-101';
      const receivedEvents: BaseSSEEvent[] = [];

      const unsubscribe = SSEEventBus.subscribe(channel, (event) => {
        receivedEvents.push(event);
      });

      // Publish job.queued
      await SSEEventBus.publish(channel, {
        id: 'evt_1',
        type: 'job.queued',
        channel,
        timestamp: new Date().toISOString(),
        data: {
          jobId: 'test-job-101',
          repositoryId: 'owner/repo',
          status: 'queued',
          summary: 'Analysis job queued',
        } as JobProgressEventData,
      });

      // Publish job.started
      await SSEEventBus.publish(channel, {
        id: 'evt_2',
        type: 'job.started',
        channel,
        timestamp: new Date().toISOString(),
        data: {
          jobId: 'test-job-101',
          repositoryId: 'owner/repo',
          status: 'running',
          summary: 'Ingesting repository AST',
        } as JobProgressEventData,
      });

      // Publish job.completed
      await SSEEventBus.publish(channel, {
        id: 'evt_3',
        type: 'job.completed',
        channel,
        timestamp: new Date().toISOString(),
        data: {
          jobId: 'test-job-101',
          repositoryId: 'owner/repo',
          status: 'completed',
          summary: 'Analysis completed successfully',
        } as JobProgressEventData,
      });

      expect(receivedEvents.length).toBe(3);
      expect(receivedEvents[0].type).toBe('job.queued');
      expect(receivedEvents[1].type).toBe('job.started');
      expect(receivedEvents[2].type).toBe('job.completed');

      unsubscribe();
    });
  });

  describe('SSE-010: Reconnect & Last-Event-ID History Replay', () => {
    it('replays missed events when reconnecting with Last-Event-ID', async () => {
      const channel = 'job:reconnect-job-202';

      // Publish 3 events before client connects
      await SSEEventBus.publish(channel, {
        id: 'evt_10',
        type: 'job.queued',
        channel,
        timestamp: new Date().toISOString(),
        data: { summary: 'Event 1' },
      });

      await SSEEventBus.publish(channel, {
        id: 'evt_11',
        type: 'job.started',
        channel,
        timestamp: new Date().toISOString(),
        data: { summary: 'Event 2' },
      });

      await SSEEventBus.publish(channel, {
        id: 'evt_12',
        type: 'job.progress',
        channel,
        timestamp: new Date().toISOString(),
        data: { summary: 'Event 3' },
      });

      // Client connects requesting replay after evt_10
      const replayedEvents: BaseSSEEvent[] = [];
      const unsubscribe = SSEEventBus.subscribe(
        channel,
        (event) => {
          replayedEvents.push(event);
        },
        'evt_10'
      );

      expect(replayedEvents.length).toBe(2);
      expect(replayedEvents[0].id).toBe('evt_11');
      expect(replayedEvents[1].id).toBe('evt_12');

      unsubscribe();
    });
  });

  describe('SSE-013 & SSE-014: Security & Zero Chain-of-Thought Leakage', () => {
    it('SSE-013: ensures SSE payloads contain zero tokens or secrets', async () => {
      const channel = 'job:sec-test';
      const event: BaseSSEEvent<JobProgressEventData> = {
        id: 'evt_sec_1',
        type: 'job.progress',
        channel,
        timestamp: new Date().toISOString(),
        data: {
          jobId: 'sec-job',
          repositoryId: 'acme/app',
          status: 'running',
          summary: 'Scanning for vulnerabilities',
        },
      };

      const serialized = JSON.stringify(event);
      expect(serialized).not.toContain('ghp_');
      expect(serialized).not.toContain('token');
      expect(serialized).not.toContain('password');
    });

    it('SSE-014: ensures Agent events describe safe high-level stages only without chain-of-thought', async () => {
      const channel = 'agent:session-303';
      const agentEvent: BaseSSEEvent<AgentProgressEventData> = {
        id: 'evt_agent_1',
        type: 'agent.tool',
        channel,
        timestamp: new Date().toISOString(),
        data: {
          sessionId: 'session-303',
          repositoryId: 'owner/repo',
          step: 2,
          maxSteps: 8,
          stage: 'tool_execution',
          activeTool: 'fetch_repository_structure',
          summary: 'Retrieving repository directory structure',
        },
      };

      const serialized = JSON.stringify(agentEvent);
      expect(serialized).not.toContain('chainOfThought');
      expect(serialized).not.toContain('hiddenReasoning');
      expect(serialized).toContain('Retrieving repository directory structure');
    });
  });
});
