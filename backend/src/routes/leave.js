import express from 'express';
import { body } from 'express-validator';
import { handleValidationErrors, validateLeave } from '../middleware/validation.js';
import { verifyToken, verifyRole } from '../middleware/auth.js';
import { requirePermission, loadPermissions } from '../middleware/rbac.js';
import {
  getLeaveRequests,
  getLeaveByEmployee,
  applyLeave,
  approveLeave,
  rejectLeave,
  deleteLeave,
  checkAndRevertLeaveStatus,
  getPendingLeaveCount,
  getPendingLeaves,
  getAbsenceRecords,
  getAbsenceCount,
  getDashboardStats,
} from '../controllers/leaveController.js';

const router = express.Router();

// ============ SPECIFIC ROUTES (must come before generic :id routes) ============

// Apply for leave (protected)
router.post(
  '/apply',
  verifyToken,
  // Use centralized validation rules (includes statutory leave types + conditional docs)
  validateLeave,
  applyLeave
);

// Check and revert leave status (requires elevated leave status management permission)
router.post(
  '/check-revert-status',
  verifyToken,
  requirePermission('leave.manage_status'),
  checkAndRevertLeaveStatus
);

// Get pending leave count (protected)
router.get('/stats/pending-count', verifyToken, getPendingLeaveCount);

// Get all pending leaves (protected)
router.get('/stats/pending-leaves', verifyToken, getPendingLeaves);

// Get absence records (protected)
// Supports query params: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
router.get('/stats/absence-records', verifyToken, getAbsenceRecords);

// Get absence count (protected)
// Supports query params: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
router.get('/stats/absence-count', verifyToken, getAbsenceCount);

// Get dashboard statistics (protected)
router.get('/stats/dashboard', verifyToken, getDashboardStats);

// Get leave by employee (protected)
router.get('/employee/:employee_id', verifyToken, getLeaveByEmployee);

// ============ GENERIC ROUTES (must come after specific routes) ============

// Approve leave (requires leave.approve permission)
router.put(
  '/:id/approve',
  verifyToken,
  requirePermission('leave.approve'),
  approveLeave
);

// Reject leave (requires leave.reject permission)
router.put(
  '/:id/reject',
  verifyToken,
  requirePermission('leave.reject'),
  rejectLeave
);

// Delete leave (admin and superadmin only)
// Delete leave (requires leave.delete permission)
router.delete(
  '/:id',
  verifyToken,
  requirePermission('leave.delete'),
  deleteLeave
);

// Get all leave requests (protected)
router.get('/', verifyToken, getLeaveRequests);

export default router;

