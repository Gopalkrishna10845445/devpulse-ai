/**
 * Production Phase 3 — Redis Client Connection Layer
 *
 * Centralized, server-only Redis client connection manager with connection reuse,
 * exponential retry backoff, health-checks, and in-memory fallback for test/dev environments.
 */

import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../logger';

export interface RedisHealthStatus {
  connected: boolean;
  mode: 'standalone' | 'fallback-in-memory';
  latencyMs?: number;
  error?: string;
}

/**
 * In-memory fallback mock implementing core Redis operations when REDIS_URL is unavailable.
 */
class InMemoryRedisMock {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async ping(): Promise<string> {
    return 'PONG';
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ...args: (string | number)[]): Promise<'OK'> {
    let expiresAt: number | undefined;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX' && typeof args[i + 1] === 'number') {
        expiresAt = Date.now() + (args[i + 1] as number) * 1000;
        break;
      }
      if (args[i] === 'PX' && typeof args[i + 1] === 'number') {
        expiresAt = Date.now() + (args[i + 1] as number);
        break;
      }
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async exists(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      const item = this.store.get(key);
      if (item) {
        if (item.expiresAt && Date.now() > item.expiresAt) {
          this.store.delete(key);
        } else {
          count++;
        }
      }
    }
    return count;
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return -2;
    if (!item.expiresAt) return -1;
    const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
    if (remaining <= 0) {
      this.store.delete(key);
      return -2;
    }
    return remaining;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const val = (current ? parseInt(current, 10) : 0) + 1;
    await this.set(key, String(val));
    return val;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const result: string[] = [];
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.store.delete(key);
        continue;
      }
      if (regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  async flushall(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  async quit(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  disconnect(): void {
    this.store.clear();
  }
}

class RedisManager {
  private static instance: RedisManager;
  private client: Redis | null = null;
  private mockClient: InMemoryRedisMock | null = null;
  private isConnecting = false;
  private hasConnectionError = false;

  private constructor() {}

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  /**
   * Returns a connected Redis client or an in-memory fallback adapter.
   */
  public getClient(): Redis | InMemoryRedisMock {
    const redisUrl = process.env.REDIS_URL;

    // Fallback if no URL configured or in test mode without explicit URL
    if (!redisUrl || process.env.NODE_ENV === 'test' && !process.env.FORCE_REAL_REDIS) {
      if (!this.mockClient) {
        this.mockClient = new InMemoryRedisMock();
      }
      return this.mockClient;
    }

    if (this.client) {
      return this.client;
    }

    if (!this.isConnecting && !this.client) {
      this.isConnecting = true;
      try {
        const options: RedisOptions = {
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            if (times > 5) {
              return null; // Stop retrying after 5 attempts
            }
            return Math.min(times * 100, 2000);
          },
          lazyConnect: true,
          enableOfflineQueue: false,
        };

        this.client = new Redis(redisUrl, options);

        this.client.on('error', (err) => {
          this.hasConnectionError = true;
          logger.warn('Redis connection issue encountered — degrading to fallback', {
            error: err.message,
          });
        });

        this.client.on('connect', () => {
          this.hasConnectionError = false;
          logger.info('Connected to Redis server');
        });

        this.client.connect().catch((err) => {
          this.hasConnectionError = true;
          logger.warn('Initial Redis connection failed — operating in fallback mode', {
            error: err.message,
          });
        });
      } catch (err) {
        this.hasConnectionError = true;
        logger.warn('Failed to initialize Redis client', {
          error: (err as Error).message,
        });
      } finally {
        this.isConnecting = false;
      }
    }

    // Return client or fallback if connection failed
    if (this.client && !this.hasConnectionError) {
      return this.client;
    }

    if (!this.mockClient) {
      this.mockClient = new InMemoryRedisMock();
    }
    return this.mockClient;
  }

  /**
   * Health check probe for Redis connectivity.
   */
  public async checkHealth(): Promise<RedisHealthStatus> {
    const start = Date.now();
    try {
      const client = this.getClient();
      const response = await client.ping();
      const latencyMs = Date.now() - start;

      if (response === 'PONG') {
        const isMock = client instanceof InMemoryRedisMock;
        return {
          connected: true,
          mode: isMock ? 'fallback-in-memory' : 'standalone',
          latencyMs,
        };
      }

      return {
        connected: false,
        mode: 'fallback-in-memory',
        error: 'Unexpected ping response',
      };
    } catch (err) {
      return {
        connected: false,
        mode: 'fallback-in-memory',
        error: (err as Error).message,
      };
    }
  }

  /**
   * Graceful shutdown.
   */
  public async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.client = null;
    }
    if (this.mockClient) {
      await this.mockClient.quit();
      this.mockClient = null;
    }
  }

  /**
   * Test utility to reset state.
   */
  public resetState(): void {
    if (this.mockClient) {
      this.mockClient.flushall();
    }
  }
}

export const RedisClient = {
  getClient: () => redisManager.getClient(),
  checkHealth: () => redisManager.checkHealth(),
  isAvailable: async () => {
    const health = await redisManager.checkHealth();
    return health.connected;
  },
  close: () => redisManager.close(),
};

export const redisManager = RedisManager.getInstance();
export const getRedisClient = () => redisManager.getClient();
export const checkRedisHealth = () => redisManager.checkHealth();
export const closeRedis = () => redisManager.close();
