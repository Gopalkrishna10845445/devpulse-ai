/**
 * Production Phase 2 — Role-Based Access Control (RBAC) Engine
 *
 * Implements deterministic repository role permissions matrix.
 */

import { Permission, RepositoryRole } from './types';

const ROLE_PERMISSIONS: Record<RepositoryRole, Set<Permission>> = {
  OWNER: new Set<Permission>([
    'view',
    'analyze',
    'qa',
    'engineering',
    'security',
    'pr_review',
    'propose_fix',
    'approve_fix',
    'manage_members',
  ]),
  MEMBER: new Set<Permission>([
    'view',
    'analyze',
    'qa',
    'engineering',
    'security',
    'pr_review',
    'propose_fix',
  ]),
  VIEWER: new Set<Permission>([
    'view',
    'qa',
  ]),
};

export class AccessControlEngine {
  /**
   * Checks if a repository role is granted a specific permission.
   */
  public static hasPermission(role: RepositoryRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    return permissions.has(permission);
  }

  /**
   * Returns list of permissions granted to a role.
   */
  public static getPermissionsForRole(role: RepositoryRole): Permission[] {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions ? Array.from(permissions) : [];
  }
}
