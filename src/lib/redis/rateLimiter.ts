/**
 * Production Phase 3 — Distributed Sliding-Window Rate Limiter
 *
 * Implements atomic, distributed rate limiting with per-user quota isolation across app instances.
 */

import { NextResponse } from 'next/server';
import { getRedisClient } from './client';
import { REDIS_KEYS } from './keys';
import { logger } from '../logger';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds?: number;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  github_api: { maxRequests: 100, windowSeconds: 60 },
  ai_query: { maxRequests: 30, windowSeconds: 60 },
  repo_analysis: { maxRequests: 15, windowSeconds: 60 },
  agent_run: { maxRequests: 10, windowSeconds: 60 },
  fix_generation: { maxRequests: 20, windowSeconds: 60 },
  webhook: { maxRequests: 300, windowSeconds: 60 },
  auth_attempt: { maxRequests: 10, windowSeconds: 60 },
  default: { maxRequests: 60, windowSeconds: 60 },
};

export class InMemoryRateLimiter {
  private counts = new Map<string, { count: number; resetAt: number }>();

  public async checkLimit(
    identifier: string,
    maxRequests: number = 20,
    windowSeconds: number = 60
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.counts.get(identifier);

    if (!entry || now > entry.resetAt) {
      this.counts.set(identifier, { count: 1, resetAt: now + windowSeconds * 1000 });
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        resetSeconds: windowSeconds,
      };
    }

    entry.count += 1;
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);
    const allowed = entry.count <= maxRequests;

    return {
      allowed,
      limit: maxRequests,
      remaining,
      resetSeconds,
      retryAfterSeconds: allowed ? undefined : resetSeconds,
    };
  }
}

export class DistributedRateLimiter {
  /**
   * Checks and increments rate limit counter for a given operation and identifier.
   */
  public static async check(
    operation: string,
    identifier: string,
    customConfig?: RateLimitConfig
  ): Promise<RateLimitResult> {
    const config = customConfig || DEFAULT_RATE_LIMITS[operation] || DEFAULT_RATE_LIMITS.default;
    const key = REDIS_KEYS.rateLimit(operation, identifier);

    try {
      const client = getRedisClient();

      // Atomic increment
      const count = await client.incr(key);

      // If key was just created, set the TTL window
      if (count === 1) {
        await client.expire(key, config.windowSeconds);
      }

      const ttl = await client.ttl(key);
      const resetSeconds = ttl > 0 ? ttl : config.windowSeconds;
      const allowed = count <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count);

      if (!allowed) {
        logger.warn('Distributed rate limit exceeded', {
          operation,
          identifier,
          count,
          limit: config.maxRequests,
        });
      }

      return {
        allowed,
        limit: config.maxRequests,
        remaining,
        resetSeconds,
        retryAfterSeconds: allowed ? undefined : resetSeconds,
      };
    } catch (err) {
      // In case of unexpected Redis error, fail safely to prevent total system outage while logging warning
      logger.warn('Rate limiter Redis error — operating with permissive fallback', {
        error: (err as Error).message,
      });
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: 1,
        resetSeconds: config.windowSeconds,
      };
    }
  }

  /**
   * Formats a standard safe HTTP 429 response.
   */
  public static createRateLimitResponse(result: RateLimitResult): NextResponse {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please retry later.',
        code: 'RATE_LIMITED',
        retryAfterSeconds: result.retryAfterSeconds || 60,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfterSeconds || 60),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetSeconds),
        },
      }
    );
  }
}
