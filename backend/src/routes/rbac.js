import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getMyPermissions,
  getRoles,
  getUserRoles,
  assignRole,
  revokeRole,
} from '../controllers/rbacController.js';

const router = express.Router();

// Any authenticated user can query their own permissions
router.get('/my-permissions', verifyToken, getMyPermissions);

// List all roles (requires roles.manage or roles.assign)
router.get('/roles', verifyToken, requirePermission('roles.manage', 'roles.assign'), getRoles);

// Get RBAC roles for a specific user
router.get('/user-roles/:userId', verifyToken, requirePermission('roles.manage', 'roles.assign'), getUserRoles);

// Assign role to user (requires roles.assign)
router.post('/assign-role', verifyToken, requirePermission('roles.assign'), assignRole);

// Revoke role from user (requires roles.assign)
router.delete('/revoke-role', verifyToken, requirePermission('roles.assign'), revokeRole);

export default router;
