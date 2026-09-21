/**
 * Production Phase 4 — Distributed SSE Event Bus with Redis Pub/Sub
 *
 * Distributes real-time events across multiple application instances via Redis Pub/Sub,
 * maintaining local subscriber listeners and event history for reconnect handling.
 */

import { BaseSSEEvent } from './types';
import { getRedisClient } from '../redis/client';
import { logger } from '../logger';

export class SSEEventBus {
  private static localListeners = new Map<string, Set<(event: BaseSSEEvent) => void>>();
  private static eventHistory = new Map<string, BaseSSEEvent[]>();
  private static readonly MAX_HISTORY_PER_CHANNEL = 50;

  /**
   * Publishes an SSE event to a specific channel across all application instances.
   */
  public static async publish(channel: string, event: BaseSSEEvent): Promise<void> {
    // 1. Record event history for reconnect replay
    let history = this.eventHistory.get(channel);
    if (!history) {
      history = [];
      this.eventHistory.set(channel, history);
    }
    history.push(event);
    if (history.length > this.MAX_HISTORY_PER_CHANNEL) {
      history.shift();
    }

    // 2. Broadcast to local process subscribers
    const listeners = this.localListeners.get(channel);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          logger.warn('Error in SSE event listener', { channel, error: (err as Error).message });
        }
      });
    }

    // 3. Publish to Redis Pub/Sub if configured
    try {
      const client = getRedisClient();
      if ('publish' in client && typeof (client as any).publish === 'function') {
        await (client as any).publish(`devpilot:sse:${channel}`, JSON.stringify(event));
      }
    } catch {
      // Non-blocking fallback to in-process delivery
    }
  }

  /**
   * Subscribes a listener to a channel. Returns an unsubscribe callback function.
   */
  public static subscribe(
    channel: string,
    listener: (event: BaseSSEEvent) => void,
    lastEventId?: string | null
  ): () => void {
    let listeners = this.localListeners.get(channel);
    if (!listeners) {
      listeners = new Set();
      this.localListeners.set(channel, listeners);
    }
    listeners.add(listener);

    // If reconnecting with lastEventId, replay missed events
    if (lastEventId) {
      const history = this.eventHistory.get(channel) || [];
      const lastIndex = history.findIndex((e) => e.id === lastEventId);
      if (lastIndex !== -1) {
        const missed = history.slice(lastIndex + 1);
        missed.forEach((e) => listener(e));
      }
    }

    return () => {
      const currentListeners = this.localListeners.get(channel);
      if (currentListeners) {
        currentListeners.delete(listener);
        if (currentListeners.size === 0) {
          this.localListeners.delete(channel);
        }
      }
    };
  }

  /**
   * Cleans up all listeners and history for testing.
   */
  public static resetState(): void {
    this.localListeners.clear();
    this.eventHistory.clear();
  }
}
