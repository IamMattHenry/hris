import express from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { verifyToken, verifyRole } from '../middleware/auth.js';
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
  [
    body('employee_id').isInt().withMessage('Employee ID must be an integer'),
    body('leave_type').isIn(['vacation', 'sick', 'emergency', 'personal', 'parental', 'bereavement', 'others']).withMessage('Invalid leave type'),
    body('start_date').isISO8601().withMessage('Invalid start date format'),
    body('end_date').isISO8601().withMessage('Invalid end date format'),
  ],
  handleValidationErrors,
  applyLeave
);

// Check and revert leave status (admin only)
router.post(
  '/check-revert-status',
  verifyToken,
  verifyRole(['admin']),
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

// Approve leave (admin only)
router.put(
  '/:id/approve',
  verifyToken,
  verifyRole(['admin']),
  approveLeave
);

// Reject leave (admin only)
router.put(
  '/:id/reject',
  verifyToken,
  verifyRole(['admin']),
  rejectLeave
);

// Delete leave (admin only)
router.delete(
  '/:id',
  verifyToken,
  verifyRole(['admin']),
  deleteLeave
);

// Get all leave requests (protected)
router.get('/', verifyToken, getLeaveRequests);

export default router;

