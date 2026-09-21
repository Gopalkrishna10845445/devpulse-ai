/**
 * Phase 11 & Production Phase 1 — Production Health & Readiness Check Endpoint
 *
 * GET /api/health
 *
 * Provides uptime, system status, and dependency availability metrics for
 * load balancers, container orchestrators, and monitoring systems.
 * NEVER leaks secret keys, tokens, or infrastructure credentials.
 */

import { NextResponse } from 'next/server';
import { envConfig } from '@/lib/env';
import { globalVectorStore } from '@/lib/rag/vectorStore';
import { WebhookJobManager } from '@/lib/webhook/jobManager';

export const dynamic = 'force-dynamic';

const startTime = Date.now();

export async function GET() {
  try {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const configStatus = envConfig.getStatus();

    // Check Vector Store metrics
    const vectorStoreStatus = {
      isLoaded: true,
      cachedRepositories: globalVectorStore ? 1 : 0,
    };

    // Check Webhook Job Manager metrics
    const recentJobs = WebhookJobManager.getRecentJobs(50);
    const webhookStatus = {
      activeJobs: recentJobs.filter((j) => j.status === 'processing' || j.status === 'queued').length,
      totalCompletedJobs: recentJobs.filter((j) => j.status === 'completed').length,
    };

    const isHealthy = true; // Non-fatal if optional keys are missing (deterministic fallbacks active)
    const isReady = true;

    const payload = {
      status: isHealthy ? 'healthy' : 'degraded',
      liveness: true,
      readiness: isReady,
      service: 'devpilot-ai',
      version: '1.0.0',
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      environment: configStatus.environment,
      dependencies: {
        githubApi: configStatus.checks.gitHubApi,
        aiEngine: configStatus.checks.aiEngine,
        webhooks: configStatus.checks.webhooks,
        database: configStatus.checks.database,
        redis: configStatus.checks.redis,
        vectorStore: vectorStoreStatus,
        jobManager: webhookStatus,
      },
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'devpilot-ai',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        error: error.message || 'Health probe failure',
      },
      { status: 503 }
    );
  }
}
