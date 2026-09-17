/**
 * Phase 9 — GitHub Webhook Event Parser Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { parseGitHubWebhookEvent, determineRequiredOperations } from '../eventParser';

describe('Phase 9 Event Parser', () => {
  it('parses a push event payload correctly', () => {
    const rawPayload = JSON.stringify({
      ref: 'refs/heads/main',
      before: '0000000000000000000000000000000000000000',
      after: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
      repository: {
        id: 1296269,
        name: 'Hello-World',
        full_name: 'octocat/Hello-World',
        owner: { login: 'octocat' },
        default_branch: 'main',
      },
      sender: { login: 'octocat' },
      commits: [
        {
          id: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
          message: 'Update README',
          added: [],
          removed: [],
          modified: ['README.md'],
        },
      ],
    });

    const event = parseGitHubWebhookEvent(rawPayload, 'push', 'del-123');
    expect(event.eventName).toBe('push');
    expect(event.deliveryId).toBe('del-123');
    expect(event.repository.fullName).toBe('octocat/Hello-World');
    expect(event.afterSha).toBe('6dcb09b5b57875f334f61aebed695e2e4193db5e');
    expect(event.commits).toHaveLength(1);

    const ops = determineRequiredOperations(event);
    expect(ops).toContain('INGEST');
    expect(ops).toContain('CODEBASE_ANALYSIS');
    expect(ops).toContain('SECURITY_ANALYSIS');
  });

  it('parses a pull_request synchronize event payload correctly', () => {
    const rawPayload = JSON.stringify({
      action: 'synchronize',
      number: 42,
      pull_request: {
        number: 42,
        title: 'Feature: new auth flow',
        state: 'open',
        head: { sha: 'def456', ref: 'feature/auth' },
        base: { sha: 'abc123', ref: 'main' },
      },
      repository: {
        name: 'devpulse-ai',
        full_name: 'org/devpulse-ai',
        owner: { login: 'org' },
      },
      sender: { login: 'developer-bob' },
    });

    const event = parseGitHubWebhookEvent(rawPayload, 'pull_request', 'del-456');
    expect(event.eventName).toBe('pull_request');
    expect(event.action).toBe('synchronize');
    expect(event.pullRequestNumber).toBe(42);
    expect(event.headSha).toBe('def456');

    const ops = determineRequiredOperations(event);
    expect(ops).toContain('PR_REVIEW');
    expect(ops).toContain('SECURITY_ANALYSIS');
  });

  it('handles ping event gracefully', () => {
    const rawPayload = JSON.stringify({
      zen: 'Responsive is better than fast.',
      hook_id: 12345,
    });

    const event = parseGitHubWebhookEvent(rawPayload, 'ping', 'del-ping');
    expect(event.eventName).toBe('ping');
    const ops = determineRequiredOperations(event);
    expect(ops).toEqual([]);
  });

  it('rejects malformed JSON payload', () => {
    expect(() => parseGitHubWebhookEvent('{ not-json }', 'push', 'del-1')).toThrow();
  });
});
