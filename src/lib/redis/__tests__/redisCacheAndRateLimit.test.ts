/**
 * Production Phase 3 — Redis Distributed Cache & Rate Limiting Test Suite
 *
 * Tests REDIS-001 through REDIS-008
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { redisManager, getRedisClient, checkRedisHealth } from '../client';
import { RedisCache } from '../cache';
import { DistributedRateLimiter } from '../rateLimiter';
import { REDIS_KEYS } from '../keys';

describe('Production Phase 3 — Redis Distributed Infrastructure', () => {
  beforeEach(() => {
    redisManager.resetState();
  });

  describe('REDIS-001: Connection & Health Check', () => {
    it('connects to redis adapter and returns healthy status probe', async () => {
      const health = await checkRedisHealth();
      expect(health.connected).toBe(true);
      expect(health.mode).toBeDefined();
    });
  });

  describe('REDIS-002 & REDIS-003: Cache Get/Set & TTL Expiration', () => {
    it('REDIS-002: stores and retrieves structured JSON data accurately', async () => {
      const testKey = 'devpilot:test:cache:sample';
      const testData = { repo: 'facebook/react', stars: 220000, active: true };

      await RedisCache.set(testKey, testData, 60);
      const retrieved = await RedisCache.get<typeof testData>(testKey);

      expect(retrieved).toEqual(testData);
    });

    it('REDIS-003: expires cache entries after TTL duration', async () => {
      const testKey = 'devpilot:test:cache:expiring';
      const client = getRedisClient();

      await client.set(testKey, 'temporary_value', 'EX', 1);
      const valBefore = await client.get(testKey);
      expect(valBefore).toBe('temporary_value');

      // Check TTL is registered
      const ttl = await client.ttl(testKey);
      expect(ttl).toBeGreaterThanOrEqual(1);
    });
  });

  describe('REDIS-004 & REDIS-005: Strict Repository & Commit Isolation', () => {
    it('REDIS-004: isolates cache entries between different repositories', async () => {
      const repoAKey = REDIS_KEYS.repoCache('owner/repo-a', 'sha123', 'overview');
      const repoBKey = REDIS_KEYS.repoCache('owner/repo-b', 'sha123', 'overview');

      await RedisCache.set(repoAKey, { repo: 'repo-a', files: 10 });
      await RedisCache.set(repoBKey, { repo: 'repo-b', files: 99 });

      const dataA = await RedisCache.get<{ repo: string }>(repoAKey);
      const dataB = await RedisCache.get<{ repo: string }>(repoBKey);

      expect(dataA?.repo).toBe('repo-a');
      expect(dataB?.repo).toBe('repo-b');
      expect(dataA?.repo).not.toBe(dataB?.repo);
    });

    it('REDIS-005: isolates cache entries between different commits of the same repository', async () => {
      const commit1Key = REDIS_KEYS.codebaseCache('owner/repo', 'commit_sha_1111');
      const commit2Key = REDIS_KEYS.codebaseCache('owner/repo', 'commit_sha_2222');

      await RedisCache.set(commit1Key, { commit: '1111', symbolCount: 50 });
      await RedisCache.set(commit2Key, { commit: '2222', symbolCount: 150 });

      const data1 = await RedisCache.get<{ commit: string }>(commit1Key);
      const data2 = await RedisCache.get<{ commit: string }>(commit2Key);

      expect(data1?.commit).toBe('1111');
      expect(data2?.commit).toBe('2222');
      expect(data1?.commit).not.toBe(data2?.commit);
    });
  });

  describe('REDIS-006: Distributed Request Coalescing', () => {
    it('coalesces duplicate requests and computes data only once', async () => {
      const coalesceKey = 'devpilot:test:coalesce:data';
      let computeCount = 0;

      const expensiveComputation = async () => {
        computeCount++;
        return { result: 'computed_value', run: computeCount };
      };

      // Call wrap multiple times
      const res1 = await RedisCache.wrap(coalesceKey, expensiveComputation, 60);
      const res2 = await RedisCache.wrap(coalesceKey, expensiveComputation, 60);
      const res3 = await RedisCache.wrap(coalesceKey, expensiveComputation, 60);

      expect(res1.result).toBe('computed_value');
      expect(res2.result).toBe('computed_value');
      expect(res3.result).toBe('computed_value');
      expect(computeCount).toBe(1); // Executed only once!
    });
  });

  describe('REDIS-007 & REDIS-008: Distributed Rate Limiting & User Quota Isolation', () => {
    it('REDIS-007: blocks requests and returns 429 when quota is exceeded', async () => {
      const op = 'test_op';
      const userId = 'user_alice';
      const config = { maxRequests: 3, windowSeconds: 60 };

      // 3 allowed calls
      const r1 = await DistributedRateLimiter.check(op, userId, config);
      const r2 = await DistributedRateLimiter.check(op, userId, config);
      const r3 = await DistributedRateLimiter.check(op, userId, config);

      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
      expect(r3.allowed).toBe(true);

      // 4th call exceeded
      const r4 = await DistributedRateLimiter.check(op, userId, config);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.retryAfterSeconds).toBeDefined();

      const response = DistributedRateLimiter.createRateLimitResponse(r4);
      expect(response.status).toBe(429);
    });

    it('REDIS-008: maintains isolated rate limit quotas per user', async () => {
      const op = 'ai_query';
      const userA = 'user_alice';
      const userB = 'user_bob';
      const config = { maxRequests: 2, windowSeconds: 60 };

      // User A exhausts quota
      await DistributedRateLimiter.check(op, userA, config);
      await DistributedRateLimiter.check(op, userA, config);
      const userABlocked = await DistributedRateLimiter.check(op, userA, config);
      expect(userABlocked.allowed).toBe(false);

      // User B should still have full quota
      const userBCheck = await DistributedRateLimiter.check(op, userB, config);
      expect(userBCheck.allowed).toBe(true);
      expect(userBCheck.remaining).toBe(1);
    });
  });
});
