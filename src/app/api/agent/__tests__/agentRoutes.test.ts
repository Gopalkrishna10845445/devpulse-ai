/**
 * Phase 10 — DevPilot Agent API Routes Integration Tests
 *
 * Tests:
 * - POST /api/agent/run
 * - GET /api/agent/run/:id
 * - POST /api/agent/run/:id/cancel
 * - POST /api/agent/approve
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { POST as runHandler } from '../run/route';
import { GET as getRunHandler } from '../run/[id]/route';
import { POST as cancelHandler } from '../run/[id]/cancel/route';
import { POST as approveHandler } from '../approve/route';
import { AgentSessionMemory } from '@/lib/agent/memory';
import { AgentToolRegistry } from '@/lib/agent/toolRegistry';
import { AgentDatabaseRepository } from '@/lib/db/repositories';
import { createMockRepoIndex } from '@/lib/security/__tests__/testHelpers';
import { analyzeCodebase } from '@/lib/intelligence/codebaseAnalyzer';
import * as authModule from '@/lib/auth/accessControl';

describe('DevPilot Agent API Routes', () => {
  const repoFullName = 'Gopalkrishna10845445/devpulse-ai';

  beforeEach(async () => {
    AgentSessionMemory.clearAll();
    AgentToolRegistry.clearCache();
    AgentDatabaseRepository.clearCache();
    vi.restoreAllMocks();

    const mockRepo = createMockRepoIndex({
      repository: {
        owner: 'Gopalkrishna10845445',
        name: 'devpulse-ai',
        fullName: repoFullName,
        defaultBranch: 'main',
        url: 'https://github.com/Gopalkrishna10845445/devpulse-ai',
        description: 'DevPulse AI codebase',
        stars: 10,
        forks: 2,
        openIssues: 0,
        isPrivate: false,
        isFork: false,
        isArchived: false,
        sizeKb: 350,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      },
      files: [
        {
          path: 'src/auth/token.ts',
          name: 'token.ts',
          type: 'file',
          language: 'typescript',
          isBinary: false,
          isSensitive: false,
          status: 'indexed',
          skipReason: null,
          content: 'export const token = "ghp_123456789012345678901234567890123456";',
          sizeBytes: 60,
          extension: '.ts',
          sha: 'sha_token',
        },
      ],
    });

    const intelligence = await analyzeCodebase({ index: mockRepo });
    AgentToolRegistry.setRepoContext(repoFullName, { index: mockRepo, intelligence });

    // Mock authentication and access control
    vi.spyOn(authModule, 'requireAuth').mockResolvedValue({
      id: 'usr_test_123',
      githubId: '123456',
      githubLogin: 'Gopalkrishna10845445',
      displayName: 'Gopalkrishna',
      role: 'ADMIN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    vi.spyOn(authModule, 'authorizeRepositoryAccess').mockResolvedValue({
      authorized: true,
      role: 'OWNER',
    });
  });

  it('POST /api/agent/run executes agent workflow and returns response', async () => {
    const req = new Request('http://localhost/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryId: repoFullName,
        userMessage: 'What is the structure of this repo?',
      }),
    });

    const res = await runHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.traceId).toBeDefined();
    expect(data.status).toBe('completed');
    expect(data.sections.length).toBeGreaterThan(0);
  });

  it('POST /api/agent/run returns 400 on missing parameters', async () => {
    const req = new Request('http://localhost/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryId: '',
      }),
    });

    const res = await runHandler(req);
    expect(res.status).toBe(400);
  });

  it('GET /api/agent/run/:id retrieves status of an agent run', async () => {
    // Run first
    const runReq = new Request('http://localhost/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryId: repoFullName,
        userMessage: 'Analyze repository health.',
      }),
    });
    const runRes = await runHandler(runReq);
    const runData = await runRes.json();

    // Get status
    const getReq = new Request(`http://localhost/api/agent/run/${runData.traceId}`);
    const getRes = await getRunHandler(getReq, { params: { id: runData.traceId } });
    expect(getRes.status).toBe(200);
    const data = await getRes.json();
    expect(data.success).toBe(true);
    expect(data.traceId).toBe(runData.traceId);
    expect(data.status).toBe('completed');
  });

  it('POST /api/agent/run/:id/cancel cancels an agent run', async () => {
    // Run first
    const runReq = new Request('http://localhost/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryId: repoFullName,
        userMessage: 'Fix token issue',
        requestedMode: 'FIX',
      }),
    });
    const runRes = await runHandler(runReq);
    const runData = await runRes.json();

    // Cancel run
    const cancelReq = new Request(`http://localhost/api/agent/run/${runData.traceId}/cancel`, {
      method: 'POST',
    });
    const cancelRes = await cancelHandler(cancelReq, { params: { id: runData.traceId } });
    expect(cancelRes.status).toBe(200);
    const cancelData = await cancelRes.json();
    expect(cancelData.success).toBe(true);
    expect(cancelData.status).toBe('cancelled');
  });

  it('POST /api/agent/approve approves and applies proposed fix', async () => {
    // Run fix mode
    const runReq = new Request('http://localhost/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryId: repoFullName,
        userMessage: 'Fix secret issue in token.ts',
        requestedMode: 'FIX',
      }),
    });
    const runRes = await runHandler(runReq);
    const runData = await runRes.json();
    expect(runData.status).toBe('awaiting_approval');
    const action = runData.pendingAction;

    // Approve
    const approveReq = new Request('http://localhost/api/agent/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        traceId: runData.traceId,
        actionId: action.id,
        repositoryId: repoFullName,
        commitSha: 'main',
        decision: 'approve',
      }),
    });
    const approveRes = await approveHandler(approveReq);
    expect(approveRes.status).toBe(200);
    const approveData = await approveRes.json();
    expect(approveData.success).toBe(true);
    expect(approveData.status).toBe('executed');
  });
});
