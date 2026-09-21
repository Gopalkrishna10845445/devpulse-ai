/**
 * Production Phase 2 — Authentication & Access Control Types
 *
 * Defines strongly typed models for users, sessions, RBAC permissions,
 * repository memberships, and authentication contexts.
 */

export type SystemRole = 'ADMIN' | 'MEMBER';

export type RepositoryRole = 'OWNER' | 'MEMBER' | 'VIEWER';

export type Permission =
  | 'view'
  | 'analyze'
  | 'qa'
  | 'engineering'
  | 'security'
  | 'pr_review'
  | 'propose_fix'
  | 'approve_fix'
  | 'manage_members';

export interface User {
  id: string;
  githubId: string;
  githubLogin: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  role: SystemRole;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  sessionId: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface RepositoryMembership {
  id: string;
  userId: string;
  repositoryId: string;
  role: RepositoryRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContext {
  user: User;
  session: Session;
}

export interface AuthorizationResult {
  authorized: boolean;
  role?: RepositoryRole;
  reason?: string;
}
