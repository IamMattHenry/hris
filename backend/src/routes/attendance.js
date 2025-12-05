import express from 'express';
import { verifyToken, verifyRole } from '../middleware/auth.js';
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

// Get attendance records (protected)
router.get('/', verifyToken, getAttendanceRecords);

// Get attendance summary by employee ID (protected)
router.get('/summary/:employee_id', verifyToken, getAttendanceSummary);

// Get attendance by ID (protected)
router.get('/:id', verifyToken, getAttendanceById);

// Clock in (protected)
router.post(
  '/clock-in',
  verifyToken,
  [
    body('employee_id').isInt().withMessage('Employee ID must be an integer'),
  ],
  handleValidationErrors,
  clockIn
);

// Clock out (protected)
router.post(
  '/clock-out',
  verifyToken,
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

// Update overtime hours (protected)
router.put(
  '/:id/overtime',
  verifyToken,
  [
    body('overtime_hours')
      .isFloat({ min: 0, max: 8 })
      .withMessage('Overtime hours must be between 0 and 8 hours'),
  ],
  handleValidationErrors,
  updateOvertimeHours
);

// Update attendance status (protected)
router.put(
  '/:id/status',
  verifyToken,
  [
    body('status').isIn(['present', 'absent', 'late', 'early_leave', 'half_day', 'on_leave', 'work_from_home', 'overtime', 'others']).withMessage('Invalid status'),
  ],
  handleValidationErrors,
  updateAttendanceStatus
);

// Mark absences for a date (admin/superadmin)
router.post(
  '/mark-absences',
  verifyToken,
  verifyRole(['admin', 'superadmin']),
  markAbsences
);

export default router;

