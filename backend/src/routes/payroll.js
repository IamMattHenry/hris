import express from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { verifyToken, verifyRole } from '../middleware/auth.js';
import {
  getPayrollRecords,
  getPayrollByEmployee,
  generatePayroll,
  updatePayroll,
} from '../controllers/payrollController.js';

const router = express.Router();

// Get all payroll records (protected)
router.get('/', verifyToken, getPayrollRecords);

// Get payroll by employee (protected)
router.get('/employee/:employee_id', verifyToken, getPayrollByEmployee);

// Generate payroll (admin only)
router.post(
  '/generate',
  verifyToken,
  verifyRole(['admin']),
  [
    body('employee_id').isInt().withMessage('Employee ID must be an integer'),
    body('pay_period_start').isISO8601().withMessage('Invalid start date format'),
    body('pay_period_end').isISO8601().withMessage('Invalid end date format'),
    body('basic_pay').isFloat({ min: 0 }).withMessage('Basic pay must be a positive number'),
  ],
  handleValidationErrors,
  generatePayroll
);

// Update payroll (admin only)
router.put(
  '/:id',
  verifyToken,
  verifyRole(['admin']),
  updatePayroll
);

export default router;

