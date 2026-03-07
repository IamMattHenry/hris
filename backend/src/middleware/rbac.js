/**
 * RBAC Permission Middleware
 *
 * Provides `requirePermission(...permissionKeys)` middleware that checks
 * whether the authenticated user (from req.user via verifyToken) holds
 * at least one of the specified permissions through their assigned RBAC roles.
 *
 * Superadmin role always bypasses permission checks.
 *
 * Usage in routes:
 *   import { requirePermission } from '../middleware/rbac.js';
 *   router.get('/', verifyToken, requirePermission('employees.read'), controller);
 *   router.post('/', verifyToken, requirePermission('employees.create'), controller);
 */

import * as db from '../config/db.js';
import logger from '../utils/logger.js';

// In-memory cache for role→permissions to avoid hitting DB on every request.
// Cache TTL: 5 minutes. Invalidated on role/permission changes.
let permissionCache = new Map(); // Map<role_key, Set<permission_key>>
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load all role→permission mappings into cache
 */
async function loadPermissionCache() {
  try {
    const rows = await db.getAll(`
      SELECT r.role_key, p.permission_key
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.role_id
      JOIN permissions p ON rp.permission_id = p.permission_id
    `);

    const newCache = new Map();
    for (const row of rows) {
      if (!newCache.has(row.role_key)) {
        newCache.set(row.role_key, new Set());
      }
      newCache.get(row.role_key).add(row.permission_key);
    }

    permissionCache = newCache;
    cacheTimestamp = Date.now();
    logger.debug(`RBAC permission cache loaded: ${rows.length} mappings for ${newCache.size} roles`);
  } catch (error) {
    logger.error('Failed to load RBAC permission cache:', error);
    // Don't clear existing cache on error — stale data is better than no data
  }
}

/**
 * Get permissions for a user's assigned RBAC roles.
 * Falls back to mapping legacy `users.role` column to RBAC role_key.
 */
async function getUserPermissions(userId, legacyRole) {
  // Refresh cache if stale
  if (Date.now() - cacheTimestamp > CACHE_TTL_MS || permissionCache.size === 0) {
    await loadPermissionCache();
  }

  // 1. Check user_role_assignments table for explicit RBAC role assignments
  const assignments = await db.getAll(
    `SELECT r.role_key FROM user_role_assignments ura
     JOIN roles r ON ura.role_id = r.role_id
     WHERE ura.user_id = ?`,
    [userId]
  );

  const roleKeys = assignments.map(a => a.role_key);

  // 2. Fallback: map legacy users.role column to RBAC role_key for backwards compat
  if (roleKeys.length === 0 && legacyRole) {
    const legacyMapping = {
      superadmin: 'superadmin',
      admin: 'hr_manager',         // existing admins get HR Manager permissions
      supervisor: 'hr_supervisor', // existing supervisors get HR Supervisor permissions
      employee: null,              // employees get minimal permissions via code
    };
    const mapped = legacyMapping[legacyRole];
    if (mapped) {
      roleKeys.push(mapped);
    }
  }

  // 3. Aggregate permissions from all assigned roles
  const permissions = new Set();
  for (const roleKey of roleKeys) {
    const rolePerms = permissionCache.get(roleKey);
    if (rolePerms) {
      for (const perm of rolePerms) {
        permissions.add(perm);
      }
    }
  }

  return { roleKeys, permissions };
}

/**
 * Invalidate the permission cache (call after role/permission changes)
 */
export function invalidatePermissionCache() {
  cacheTimestamp = 0;
  permissionCache.clear();
  logger.info('RBAC permission cache invalidated');
}

/**
 * Middleware: require at least one of the specified permissions.
 * Must be used AFTER verifyToken middleware.
 *
 * @param  {...string} requiredPermissions - permission keys (OR logic: user needs at least one)
 * @returns Express middleware
 *
 * @example
 *   requirePermission('employees.create')
 *   requirePermission('leave.approve', 'leave.reject')  // user needs approve OR reject
 */
export function requirePermission(...requiredPermissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const { user_id, role } = req.user;

      // Superadmin always bypasses
      if (role === 'superadmin') {
        req.userPermissions = new Set(['*']); // wildcard
        req.userRbacRoles = ['superadmin'];
        return next();
      }

      const { roleKeys, permissions } = await getUserPermissions(user_id, role);

      // Attach to request for downstream use
      req.userPermissions = permissions;
      req.userRbacRoles = roleKeys;

      // Check if user has at least one of the required permissions
      const hasPermission = requiredPermissions.some(p => permissions.has(p));

      if (!hasPermission) {
        logger.warn(
          `RBAC denied: user ${req.user.username} (roles: [${roleKeys.join(', ')}]) ` +
          `lacks permissions: [${requiredPermissions.join(', ')}]`
        );
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this action.',
        });
      }

      next();
    } catch (error) {
      logger.error('RBAC middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
      });
    }
  };
}

/**
 * Middleware: load user permissions without enforcing — useful for
 * controllers that need to conditionally filter data based on permissions.
 */
export function loadPermissions() {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next();
      }

      const { user_id, role } = req.user;

      if (role === 'superadmin') {
        req.userPermissions = new Set(['*']);
        req.userRbacRoles = ['superadmin'];
        return next();
      }

      const { roleKeys, permissions } = await getUserPermissions(user_id, role);
      req.userPermissions = permissions;
      req.userRbacRoles = roleKeys;
      next();
    } catch (error) {
      logger.error('RBAC loadPermissions error:', error);
      // Non-blocking: continue without permissions
      req.userPermissions = new Set();
      req.userRbacRoles = [];
      next();
    }
  };
}

/**
 * Helper: check if request has a specific permission (for use in controllers)
 */
export function hasPermission(req, permissionKey) {
  if (!req.userPermissions) return false;
  if (req.userPermissions.has('*')) return true; // superadmin wildcard
  return req.userPermissions.has(permissionKey);
}

/**
 * Audit log helper for RBAC changes
 */
export async function logRbacChange(userId, targetUserId, action, details) {
  try {
    await db.insert('rbac_audit_log', {
      user_id: userId,
      target_user_id: targetUserId,
      action,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (error) {
    logger.error('Failed to write RBAC audit log:', error);
  }
}

export default {
  requirePermission,
  loadPermissions,
  hasPermission,
  invalidatePermissionCache,
  logRbacChange,
};
