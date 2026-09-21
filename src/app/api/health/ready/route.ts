/**
 * Dedicated Readiness Probe Endpoint
 * GET /api/health/ready
 *
 * Checks if all critical dependencies (PostgreSQL, Redis) are ready to accept traffic.
 * Returns HTTP 200 if ready (or operating safely with bounded deterministic fallbacks).
 * Never leaks database credentials, secrets, or internal connection strings.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { RedisClient } from '@/lib/redis/client';
import { envConfig } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isDbLive = await db.isAvailable();
    const isRedisLive = await RedisClient.isAvailable();
    const envStatus = envConfig.getStatus();

    // In hybrid/resilient architectures, if services are configured, we check their liveliness
    const dbConfigured = !!process.env.DATABASE_URL;
    const redisConfigured = !!process.env.REDIS_URL;

    const dbHealthy = !dbConfigured || isDbLive;
    const redisHealthy = !redisConfigured || isRedisLive;

    const isReady = dbHealthy && redisHealthy;

    const payload = {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: {
          configured: dbConfigured,
          connected: isDbLive,
        },
        redis: {
          configured: redisConfigured,
          connected: isRedisLive,
        },
        environment: envStatus.environment,
      },
    };

    return NextResponse.json(payload, {
      status: isReady ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error.message || 'Readiness probe failure',
      },
      { status: 503 }
    );
  }
}
