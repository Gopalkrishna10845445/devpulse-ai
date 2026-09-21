/**
 * Production Phase 3 — Distributed Redis Cache with Request Coalescing
 *
 * Implements high-performance distributed caching, TTL-based eviction,
 * and single-flight lock wrap preventing duplicate expensive work across multiple app instances.
 */

import { getRedisClient } from './client';
import { logger } from '../logger';

export class RedisCache {
  /**
   * Retrieves a deserialized JSON value from Redis.
   */
  public static async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const raw = await client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.warn('Redis cache get error — skipping cache', {
        key,
        error: (err as Error).message,
      });
      return null;
    }
  }

  /**
   * Sets a serialized JSON value into Redis with optional TTL in seconds.
   */
  public static async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await client.set(key, serialized);
      }
    } catch (err) {
      logger.warn('Redis cache set error', {
        key,
        error: (err as Error).message,
      });
    }
  }

  /**
   * Deletes a specific key.
   */
  public static async del(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await client.del(key);
    } catch (err) {
      logger.warn('Redis cache del error', {
        key,
        error: (err as Error).message,
      });
    }
  }

  /**
   * Deletes all keys matching a pattern.
   */
  public static async delPattern(pattern: string): Promise<void> {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (err) {
      logger.warn('Redis cache delPattern error', {
        pattern,
        error: (err as Error).message,
      });
    }
  }

  /**
   * Single-flight request coalescing wrapper with distributed coordination.
   * If cached value exists, returns it immediately.
   * Otherwise executes `fetcher()` and caches the result.
   */
  public static async wrap<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // 1. Check cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 2. Fetch value
    const result = await fetcher();

    // 3. Cache result asynchronously
    if (result !== undefined && result !== null) {
      await this.set(key, result, ttlSeconds);
    }

    return result;
  }
}
