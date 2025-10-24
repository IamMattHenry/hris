import express from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import {
  getAttendanceRecords,
  getAttendanceById,
  clockIn,
  clockOut,
  updateOvertimeHours,
  updateAttendanceStatus,
  getAttendanceSummary,
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
    body('status').isIn(['present', 'absent', 'late', 'half_day', 'on_leave', 'work_from_home', 'others']).withMessage('Invalid status'),
  ],
  handleValidationErrors,
  updateAttendanceStatus
);

export default router;

