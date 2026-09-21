/**
 * Production Phase 2 — Session & User Identity Manager
 *
 * Implements secure server-side session management with PostgreSQL persistence,
 * in-memory caching, cryptographic session ID generation, and automatic expiration.
 */

import * as crypto from 'crypto';
import { db } from '../db/client';
import { User, Session, RepositoryRole, RepositoryMembership } from './types';
import { Logger } from '../logger';

export const SESSION_COOKIE_NAME = 'devpilot_session';
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class SessionManager {
  // Ephemeral in-memory caches for sub-millisecond lookups and test mode fallback
  private static usersMap = new Map<string, User>(); // userId -> User
  private static sessionsMap = new Map<string, Session>(); // sessionId -> Session
  private static membershipsMap = new Map<string, RepositoryMembership>(); // `${userId}:::${repositoryId}` -> Membership

  /**
   * Generates a cryptographically random session token.
   */
  public static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Finds or registers a user based on their GitHub account identity.
   */
  public static async findOrCreateUser(profile: {
    githubId: string;
    githubLogin: string;
    displayName?: string;
    email?: string;
    avatarUrl?: string;
  }): Promise<User> {
    const cleanLogin = profile.githubLogin.trim();
    const cleanId = profile.githubId.trim();

    // Check DB if available
    try {
      if (await db.isAvailable()) {
        const res = await db.query<any>(
          `SELECT * FROM users WHERE github_id = $1 OR github_login = $2 LIMIT 1`,
          [cleanId, cleanLogin]
        );

        if (res.rows.length > 0) {
          const row = res.rows[0];
          const user: User = {
            id: row.id,
            githubId: row.github_id,
            githubLogin: row.github_login,
            displayName: row.display_name || row.github_login,
            email: row.email || undefined,
            avatarUrl: row.avatar_url || undefined,
            role: row.role || 'MEMBER',
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString(),
          };
          this.usersMap.set(user.id, user);
          return user;
        }

        // Create new user in PostgreSQL
        const newUserId = `usr_${crypto.randomBytes(8).toString('hex')}`;
        const insertRes = await db.query<any>(
          `INSERT INTO users (id, github_id, github_login, display_name, email, avatar_url, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            newUserId,
            cleanId,
            cleanLogin,
            profile.displayName || cleanLogin,
            profile.email || null,
            profile.avatarUrl || null,
            'MEMBER',
          ]
        );

        const row = insertRes.rows[0];
        const newUser: User = {
          id: row.id,
          githubId: row.github_id,
          githubLogin: row.github_login,
          displayName: row.display_name,
          email: row.email || undefined,
          avatarUrl: row.avatar_url || undefined,
          role: row.role,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        };
        this.usersMap.set(newUser.id, newUser);
        return newUser;
      }
    } catch (err: any) {
      Logger.warn('Database user query failed; using in-memory store', {
        errorCategory: 'AUTH_ERROR',
      }, err);
    }

    // In-Memory Fallback
    for (const u of Array.from(this.usersMap.values())) {
      if (u.githubId === cleanId || u.githubLogin.toLowerCase() === cleanLogin.toLowerCase()) {
        return u;
      }
    }

    const fallbackUser: User = {
      id: `usr_${cleanLogin.toLowerCase()}`,
      githubId: cleanId,
      githubLogin: cleanLogin,
      displayName: profile.displayName || cleanLogin,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      role: 'MEMBER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.usersMap.set(fallbackUser.id, fallbackUser);
    return fallbackUser;
  }

  /**
   * Creates a new authenticated session for a user.
   */
  public static async createSession(userId: string): Promise<Session> {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    const createdAt = new Date().toISOString();

    const session: Session = {
      sessionId,
      userId,
      expiresAt,
      createdAt,
    };

    this.sessionsMap.set(sessionId, session);

    // Persist to PostgreSQL if available
    try {
      if (await db.isAvailable()) {
        await db.query(
          `INSERT INTO sessions (session_id, user_id, expires_at, created_at)
           VALUES ($1, $2, $3, $4)`,
          [sessionId, userId, expiresAt, createdAt]
        );
      }
    } catch (err: any) {
      Logger.debug('Session persistence in PostgreSQL skipped', { sessionId });
    }

    return session;
  }

  /**
   * Validates a session ID and returns the associated User if valid and non-expired.
   */
  public static async validateSession(sessionId: string): Promise<User | null> {
    if (!sessionId) return null;

    let session = this.sessionsMap.get(sessionId);

    // Check PostgreSQL if not cached in RAM
    if (!session) {
      try {
        if (await db.isAvailable()) {
          const res = await db.query<any>(
            `SELECT * FROM sessions WHERE session_id = $1 AND expires_at > NOW() LIMIT 1`,
            [sessionId]
          );
          if (res.rows.length > 0) {
            const row = res.rows[0];
            session = {
              sessionId: row.session_id,
              userId: row.user_id,
              expiresAt: row.expires_at.toISOString(),
              createdAt: row.created_at.toISOString(),
            };
            this.sessionsMap.set(sessionId, session);
          }
        }
      } catch (err) {
        Logger.debug('Session DB validation error', { sessionId });
      }
    }

    if (!session) return null;

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.invalidateSession(sessionId);
      return null;
    }

    // Lookup user
    let user = this.usersMap.get(session.userId);
    if (!user) {
      try {
        if (await db.isAvailable()) {
          const res = await db.query<any>(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [session.userId]);
          if (res.rows.length > 0) {
            const row = res.rows[0];
            user = {
              id: row.id,
              githubId: row.github_id,
              githubLogin: row.github_login,
              displayName: row.display_name,
              email: row.email || undefined,
              avatarUrl: row.avatar_url || undefined,
              role: row.role,
              createdAt: row.created_at.toISOString(),
              updatedAt: row.updated_at.toISOString(),
            };
            this.usersMap.set(user.id, user);
          }
        }
      } catch (err) {
        Logger.debug('User DB lookup error', { userId: session.userId });
      }
    }

    return user || null;
  }

  /**
   * Invalidates and deletes a session (Logout).
   */
  public static async invalidateSession(sessionId: string): Promise<void> {
    this.sessionsMap.delete(sessionId);

    try {
      if (await db.isAvailable()) {
        await db.query(`DELETE FROM sessions WHERE session_id = $1`, [sessionId]);
      }
    } catch (err) {
      Logger.debug('Session DB deletion skipped', { sessionId });
    }
  }

  /**
   * Retrieves the repository role for a user.
   */
  public static async getUserRepositoryRole(
    userId: string,
    repositoryId: string
  ): Promise<RepositoryRole | null> {
    const cleanRepoId = repositoryId.toLowerCase().trim();
    const key = `${userId}:::${cleanRepoId}`;

    const cached = this.membershipsMap.get(key);
    if (cached) return cached.role;

    try {
      if (await db.isAvailable()) {
        const res = await db.query<any>(
          `SELECT role FROM repository_memberships WHERE user_id = $1 AND repository_id = $2 LIMIT 1`,
          [userId, cleanRepoId]
        );
        if (res.rows.length > 0) {
          const role = res.rows[0].role as RepositoryRole;
          this.membershipsMap.set(key, {
            id: `mem_${key}`,
            userId,
            repositoryId: cleanRepoId,
            role,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          return role;
        }
      }
    } catch (err) {
      Logger.debug('Membership DB lookup skipped', { userId, repositoryId });
    }

    return null;
  }

  /**
   * Grants or updates a repository membership role for a user.
   */
  public static async grantRepositoryMembership(
    userId: string,
    repositoryId: string,
    role: RepositoryRole
  ): Promise<void> {
    const cleanRepoId = repositoryId.toLowerCase().trim();
    const key = `${userId}:::${cleanRepoId}`;

    const membership: RepositoryMembership = {
      id: `mem_${Date.now()}`,
      userId,
      repositoryId: cleanRepoId,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.membershipsMap.set(key, membership);

    try {
      if (await db.isAvailable()) {
        await db.query(
          `INSERT INTO repository_memberships (user_id, repository_id, role)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, repository_id) DO UPDATE SET role = $3, updated_at = NOW()`,
          [userId, cleanRepoId, role]
        );
      }
    } catch (err) {
      Logger.debug('Membership DB grant skipped', { userId, repositoryId });
    }
  }

  /**
   * Resets all in-memory auth state (test isolation).
   */
  public static resetState(): void {
    this.usersMap.clear();
    this.sessionsMap.clear();
    this.membershipsMap.clear();
  }
}
