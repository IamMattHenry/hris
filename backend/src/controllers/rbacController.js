/**
 * RBAC Controller
 *
 * Endpoints for querying and managing roles & permissions.
 */

import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import { invalidatePermissionCache, logRbacChange } from '../middleware/rbac.js';

/**
 * GET /api/rbac/my-permissions
 * Returns the current user's permissions and RBAC roles.
 */
export const getMyPermissions = async (req, res, next) => {
  try {
    const { user_id, role } = req.user;

    // Superadmin gets wildcard
    if (role === 'superadmin') {
      const allPerms = await db.getAll('SELECT permission_key FROM permissions');
      return res.json({
        success: true,
        data: {
          roles: ['superadmin'],
          permissions: allPerms.map(p => p.permission_key),
          is_superadmin: true,
        },
      });
    }

    // Get explicit role assignments
    const assignments = await db.getAll(
      `SELECT r.role_key, r.role_name
       FROM user_role_assignments ura
       JOIN roles r ON ura.role_id = r.role_id
       WHERE ura.user_id = ?`,
      [user_id]
    );

    let roleKeys = assignments.map(a => a.role_key);

    // Fallback to legacy role mapping
    if (roleKeys.length === 0 && role) {
      const legacyMapping = {
        admin: 'hr_manager',
        supervisor: 'hr_supervisor',
        employee: null,
      };
      const mapped = legacyMapping[role];
      if (mapped) roleKeys = [mapped];
    }

    // Collect permissions
    let permissions = [];
    if (roleKeys.length > 0) {
      const placeholders = roleKeys.map(() => '?').join(', ');
      permissions = await db.getAll(
        `SELECT DISTINCT p.permission_key
         FROM role_permissions rp
         JOIN roles r ON rp.role_id = r.role_id
         JOIN permissions p ON rp.permission_id = p.permission_id
         WHERE r.role_key IN (${placeholders})`,
        roleKeys
      );
    }

    // Employees always get minimal self-service permissions
    const permSet = new Set(permissions.map(p => p.permission_key));
    if (role === 'employee' || permSet.size === 0) {
      ['employees.read_own', 'employees.update_own', 'leave.apply', 'leave.read_own',
       'attendance.read_own', 'attendance.clock', 'tickets.create', 'tickets.read_own',
       'dashboard.read_own'].forEach(p => permSet.add(p));
    }

    res.json({
      success: true,
      data: {
        roles: roleKeys,
        permissions: Array.from(permSet),
        is_superadmin: false,
      },
    });
  } catch (error) {
    logger.error('Get my permissions error:', error);
    next(error);
  }
};

/**
 * GET /api/rbac/roles
 * List all roles with their permissions (admin/superadmin only)
 */
export const getRoles = async (req, res, next) => {
  try {
    const roles = await db.getAll(`
      SELECT r.*, 
        (SELECT COUNT(*) FROM user_role_assignments ura WHERE ura.role_id = r.role_id) as user_count
      FROM roles r ORDER BY r.role_id
    `);

    for (const role of roles) {
      const perms = await db.getAll(
        `SELECT p.permission_key, p.description, p.module
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.permission_id
         WHERE rp.role_id = ?`,
        [role.role_id]
      );
      role.permissions = perms;
    }

    res.json({ success: true, data: roles });
  } catch (error) {
    logger.error('Get roles error:', error);
    next(error);
  }
};

/**
 * POST /api/rbac/assign-role
 * Assign a role to a user
 * Body: { user_id, role_key }
 */
export const assignRole = async (req, res, next) => {
  try {
    const { user_id: targetUserId, role_key } = req.body;
    const assignedBy = req.user.user_id;

    if (!targetUserId || !role_key) {
      return res.status(400).json({
        success: false,
        message: 'user_id and role_key are required',
      });
    }

    const role = await db.getOne('SELECT role_id, role_name FROM roles WHERE role_key = ?', [role_key]);
    if (!role) {
      return res.status(404).json({ success: false, message: `Role '${role_key}' not found` });
    }

    // Check if already assigned
    const existing = await db.getOne(
      'SELECT assignment_id FROM user_role_assignments WHERE user_id = ? AND role_id = ?',
      [targetUserId, role.role_id]
    );

    if (existing) {
      return res.status(409).json({ success: false, message: 'Role already assigned to this user' });
    }

    await db.insert('user_role_assignments', {
      user_id: targetUserId,
      role_id: role.role_id,
      assigned_by: assignedBy,
    });

    // Audit
    await logRbacChange(assignedBy, targetUserId, 'ASSIGN_ROLE', { role_key });

    // Invalidate cache
    invalidatePermissionCache();

    res.status(201).json({
      success: true,
      message: `Role '${role.role_name}' assigned successfully`,
    });
  } catch (error) {
    logger.error('Assign role error:', error);
    next(error);
  }
};

/**
 * DELETE /api/rbac/revoke-role
 * Revoke a role from a user
 * Body: { user_id, role_key }
 */
export const revokeRole = async (req, res, next) => {
  try {
    const { user_id: targetUserId, role_key } = req.body;
    const revokedBy = req.user.user_id;

    const role = await db.getOne('SELECT role_id FROM roles WHERE role_key = ?', [role_key]);
    if (!role) {
      return res.status(404).json({ success: false, message: `Role '${role_key}' not found` });
    }

    const deleted = await db.deleteRecord(
      'user_role_assignments',
      'user_id = ? AND role_id = ?',
      [targetUserId, role.role_id]
    );

    if (deleted === 0) {
      return res.status(404).json({ success: false, message: 'Role assignment not found' });
    }

    await logRbacChange(revokedBy, targetUserId, 'REVOKE_ROLE', { role_key });
    invalidatePermissionCache();

    res.json({ success: true, message: 'Role revoked successfully' });
  } catch (error) {
    logger.error('Revoke role error:', error);
    next(error);
  }
};
