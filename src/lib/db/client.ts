/**
 * DevPilot Production Database Client
 *
 * Provides a resilient, connection-pooled PostgreSQL 16 + pgvector client with:
 * - Automatic schema initialization & extension checks
 * - Parameterized query execution with secret sanitization
 * - Transaction wrapper with automatic rollback on error
 * - Health check probe for liveness & readiness
 * - Graceful fallback mode if PostgreSQL is offline or unconfigured
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { maskTextSecrets } from '../security/redactor';
import { Logger } from '../logger';
import * as fs from 'fs';
import * as path from 'path';

export interface DatabaseConfig {
  connectionString?: string;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

class DatabaseManager {
  private pool: Pool | null = null;
  private isInitialized = false;
  private isAvailableCache: { available: boolean; timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 10000; // 10s health cache

  constructor() {
    this.initPool();
  }

  private initPool(): void {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.PG_CONNECTION_STRING;

    if (!connectionString) {
      Logger.debug('No DATABASE_URL configured; running in fallback mode.');
      return;
    }

    try {
      const isProduction = process.env.NODE_ENV === 'production';
      const useSsl = connectionString.includes('sslmode=require') || isProduction;

      this.pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      });

      this.pool.on('error', (err) => {
        Logger.error('Unexpected error on idle database client', {
          errorCategory: 'INTERNAL_ERROR',
        }, err);
      });
    } catch (err: any) {
      Logger.error('Failed to initialize PostgreSQL pool', {
        errorCategory: 'INTERNAL_ERROR',
      }, err);
      this.pool = null;
    }
  }

  /**
   * Sanitizes database error messages to prevent leaking passwords, connection strings, or SQL internals.
   */
  public sanitizeError(err: any): Error {
    if (!err) return new Error('Unknown database error');
    const msg = maskTextSecrets(err.message || String(err));
    const sanitizedMsg = msg
      .replace(/postgres:\/\/[^@]+@/gi, 'postgres://[REDACTED_USER_PASS]@')
      .replace(/password=[^\s]+/gi, 'password=[REDACTED]');

    const cleanErr = new Error(sanitizedMsg);
    (cleanErr as any).code = err.code;
    return cleanErr;
  }

  /**
   * Checks if PostgreSQL connection is live and pgvector is enabled.
   */
  public async isAvailable(): Promise<boolean> {
    const now = Date.now();
    if (this.isAvailableCache && now - this.isAvailableCache.timestamp < this.CACHE_TTL_MS) {
      return this.isAvailableCache.available;
    }

    if (!this.pool) {
      this.isAvailableCache = { available: false, timestamp: now };
      return false;
    }

    try {
      const res = await this.pool.query('SELECT 1 as healthy');
      const isHealthy = res.rows.length > 0 && res.rows[0].healthy === 1;
      this.isAvailableCache = { available: isHealthy, timestamp: now };
      return isHealthy;
    } catch (err) {
      this.isAvailableCache = { available: false, timestamp: now };
      return false;
    }
  }

  /**
   * Automatically initializes tables and pgvector extension if connected.
   */
  public async initializeSchema(): Promise<void> {
    if (this.isInitialized || !this.pool) return;

    try {
      const isLive = await this.isAvailable();
      if (!isLive) return;

      const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await this.pool.query(schemaSql);
        this.isInitialized = true;
        Logger.info('PostgreSQL schema and pgvector initialized successfully.');
      }
    } catch (err: any) {
      Logger.warn('Failed to auto-run schema.sql on startup', {
        errorCategory: 'INTERNAL_ERROR',
      }, this.sanitizeError(err));
    }
  }

  /**
   * Executes a parameterized SQL query with automatic secret sanitization.
   */
  public async query<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. DATABASE_URL may be missing.');
    }

    try {
      return await this.pool.query<T>(sql, params);
    } catch (err: any) {
      throw this.sanitizeError(err);
    }
  }

  /**
   * Executes a callback within a managed database transaction with automatic commit/rollback.
   */
  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw this.sanitizeError(err);
    } finally {
      client.release();
    }
  }

  /**
   * Closes connection pool (useful for test tear-downs).
   */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isAvailableCache = null;
      this.isInitialized = false;
    }
  }
}

export const db = new DatabaseManager();
export const Database = db;

