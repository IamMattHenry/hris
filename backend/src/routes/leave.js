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
} from '../controllers/leaveController.js';

const router = express.Router();

// Get all leave requests (protected)
router.get('/', verifyToken, getLeaveRequests);

// Get leave by employee (protected)
router.get('/employee/:employee_id', verifyToken, getLeaveByEmployee);

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

export default router;

