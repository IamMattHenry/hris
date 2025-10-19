import express from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import {
  getAttendanceRecords,
  clockIn,
  clockOut,
} from '../controllers/attendanceController.js';

const router = express.Router();

// Get attendance records (protected)
router.get('/', verifyToken, getAttendanceRecords);

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

export default router;

