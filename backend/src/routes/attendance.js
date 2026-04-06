import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { body } from 'express-validator';
import { validateAttendance, handleValidationErrors } from '../middleware/validation.js';
import {
  getAttendanceRecords,
  getAttendanceById,
  clockIn,
  clockOut,
  fingerprintAttendance,
  updateOvertimeHours,
  updateAttendanceStatus,
  getAttendanceSummary,
  markAbsences,
} from '../controllers/attendanceController.js';

const router = express.Router();

// Get attendance records
router.get(
  '/',
  verifyToken,
  requirePermission('attendance.read', 'attendance.read_department', 'attendance.read_own'),
  getAttendanceRecords
);

// Get attendance summary by employee ID
router.get(
  '/summary/:employee_id',
  verifyToken,
  requirePermission('attendance.read', 'attendance.read_department', 'attendance.read_own'),
  getAttendanceSummary
);

// Get attendance by ID
router.get(
  '/:id',
  verifyToken,
  requirePermission('attendance.read', 'attendance.read_department', 'attendance.read_own'),
  getAttendanceById
);

// Clock in
router.post(
  '/clock-in',
  verifyToken,
  requirePermission('attendance.clock', 'attendance.update'),
  [
    body('employee_id').isInt().withMessage('Employee ID must be an integer'),
  ],
  handleValidationErrors,
  clockIn
);

// Clock out
router.post(
  '/clock-out',
  verifyToken,
  requirePermission('attendance.clock', 'attendance.update'),
  [
    body('employee_id').isInt().withMessage('Employee ID must be an integer'),
  ],
  handleValidationErrors,
  clockOut
);

// Fingerprint attendance (no auth required - called by Arduino bridge)
router.post(
  '/fingerprint',
  [
    body('fingerprint_id').isInt().withMessage('Fingerprint ID must be an integer'),
  ],
  handleValidationErrors,
  fingerprintAttendance
);

// Update overtime hours
router.put(
  '/:id/overtime',
  verifyToken,
  requirePermission('attendance.manage', 'attendance.update'),
  [
    body('overtime_hours')
      .isFloat({ min: 0, max: 8 })
      .withMessage('Overtime hours must be between 0 and 8 hours'),
  ],
  handleValidationErrors,
  updateOvertimeHours
);

// Update attendance status
router.put(
  '/:id/status',
  verifyToken,
  requirePermission('attendance.manage', 'attendance.update'),
  [
    body('status').isIn(['present', 'absent', 'late', 'early_leave', 'half_day', 'on_leave', 'work_from_home', 'overtime', 'others']).withMessage('Invalid status'),
  ],
  handleValidationErrors,
  updateAttendanceStatus
);

// Mark absences for a date (requires attendance.manage or attendance.mark_absences)
router.post(
  '/mark-absences',
  verifyToken,
  requirePermission('attendance.manage', 'attendance.mark_absences'),
  markAbsences
);

export default router;

