/**
 * Production Phase 3 — Redis Key Design & Namespace Specification
 *
 * Namespace Pattern: devpilot:{environment}:{type}:{resource}
 *
 * All keys MUST be strictly namespaced to prevent collisions across environments
 * and preserve repository/commit isolation.
 */

const ENV_PREFIX = process.env.NODE_ENV || 'development';

export const REDIS_KEYS = {
  /**
   * Cache Keys
   * devpilot:{env}:cache:repo:{repositoryId}:{commitSha}:{resource}
   */
  repoCache: (repositoryId: string, commitSha: string, resource: string) =>
    `devpilot:${ENV_PREFIX}:cache:repo:${repositoryId}:${commitSha}:${resource}`,

  codebaseCache: (repositoryId: string, commitSha: string) =>
    `devpilot:${ENV_PREFIX}:cache:codebase:${repositoryId}:${commitSha}`,

  astCache: (repositoryId: string, commitSha: string, filePath: string) =>
    `devpilot:${ENV_PREFIX}:cache:ast:${repositoryId}:${commitSha}:${filePath}`,

  /**
   * Distributed Rate Limiting Keys
   * devpilot:{env}:ratelimit:{operation}:{identifier}
   */
  rateLimit: (operation: string, identifier: string) =>
    `devpilot:${ENV_PREFIX}:ratelimit:${operation}:${identifier}`,

  /**
   * Distributed Locks / Request Coalescing
   * devpilot:{env}:lock:{resource}
   */
  lock: (resource: string) =>
    `devpilot:${ENV_PREFIX}:lock:${resource}`,

  /**
   * Webhook Deduplication / Fast Check Keys
   * devpilot:{env}:webhook:delivery:{deliveryId}
   */
  webhookDelivery: (deliveryId: string) =>
    `devpilot:${ENV_PREFIX}:webhook:delivery:${deliveryId}`,

  /**
   * Job State Reference Keys
   * devpilot:{env}:job:{queue}:{jobId}
   */
  jobState: (queue: string, jobId: string) =>
    `devpilot:${ENV_PREFIX}:job:${queue}:${jobId}`,
} as const;

export const CACHE_TTL = {
  REPO_INDEX: 300,        // 5 minutes
  CODEBASE_INTEL: 300,    // 5 minutes
  AST_SYMBOLS: 600,       // 10 minutes
  RATE_LIMIT_WINDOW: 60,  // 1 minute default window
  WEBHOOK_DEDUP: 86400,   // 24 hours
  LOCK_MAX_HOLD: 30,      // 30 seconds
} as const;
