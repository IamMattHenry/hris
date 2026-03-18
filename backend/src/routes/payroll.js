import express from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import {
  getPayrollRuns,
  createPayrollRun,
  getPayrollRunDetail,
  deletePayrollRun,
  finalizePayrollRun,
  getPayrollPayslip,
  getPayrollContributions,
  exportPayrollContributions,
  getPayrollSettings,
  updatePayrollSettings,
  overridePayrollRecord,
} from '../controllers/payrollController.js';

const router = express.Router();

router.get('/runs', verifyToken, getPayrollRuns);

router.post(
  '/runs',
  verifyToken,
  [
    body('pay_period_start').isISO8601().withMessage('pay_period_start must be a valid date'),
    body('pay_period_end').isISO8601().withMessage('pay_period_end must be a valid date'),
    body('pay_schedule').optional().isIn(['weekly', 'semi-monthly', 'monthly']).withMessage('Invalid pay_schedule'),
    body('employee_ids').optional().isArray().withMessage('employee_ids must be an array'),
    body('department_id').optional().isInt({ min: 1 }).withMessage('department_id must be a positive integer'),
    body('employment_type').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('employment_type must be a non-empty string (max 50 chars)'),
  ],
  handleValidationErrors,
  createPayrollRun
);

router.get('/runs/:id', verifyToken, getPayrollRunDetail);

router.delete('/runs/:id', verifyToken, deletePayrollRun);

router.patch('/runs/:id/finalize', verifyToken, finalizePayrollRun);

router.patch(
  '/runs/:id/records/:employeeId',
  verifyToken,
  [
    body('gross_pay').optional().isFloat({ min: 0 }).withMessage('gross_pay must be >= 0'),
    body('total_deductions').optional().isFloat({ min: 0 }).withMessage('total_deductions must be >= 0'),
    body('withholding_tax').optional().isFloat({ min: 0 }).withMessage('withholding_tax must be >= 0'),
    body('net_pay').optional().isFloat({ min: 0 }).withMessage('net_pay must be >= 0'),
    body('reason').optional().isString().isLength({ max: 255 }).withMessage('reason must be <= 255 chars'),
  ],
  handleValidationErrors,
  overridePayrollRecord
);

router.get('/runs/:id/payslip/:employeeId', verifyToken, getPayrollPayslip);

router.get('/contributions', verifyToken, getPayrollContributions);

router.get('/contributions/export/:type', verifyToken, exportPayrollContributions);

router.get('/settings', verifyToken, getPayrollSettings);

router.put(
  '/settings',
  verifyToken,
  [
    body('pay_schedule').isIn(['weekly', 'semi-monthly', 'monthly']).withMessage('Invalid pay_schedule'),
  ],
  handleValidationErrors,
  updatePayrollSettings
);

export default router;
