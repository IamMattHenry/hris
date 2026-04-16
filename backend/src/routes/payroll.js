import express from 'express';
import { body } from 'express-validator';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission, requireRole } from '../middleware/rbac.js';
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
  getExpenseBudgetRequests,
  createExpenseBudgetRequest,
  updatePayrollSettings,
  overridePayrollRecord,
} from '../controllers/payrollController.js';

const router = express.Router();

router.get('/runs', verifyToken, requirePermission('payroll.read'), getPayrollRuns);

router.post(
  '/runs',
  verifyToken,
  requireRole('payroll_officer'),
  requirePermission('payroll.create'),
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

router.get('/runs/:id', verifyToken, requirePermission('payroll.read'), getPayrollRunDetail);

router.delete('/runs/:id', verifyToken, requirePermission('payroll.update'), deletePayrollRun);

router.patch('/runs/:id/finalize', verifyToken, requirePermission('payroll.finalize'), finalizePayrollRun);

router.patch(
  '/runs/:id/records/:employeeId',
  verifyToken,
  requirePermission('payroll.override'),
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

router.get('/runs/:id/payslip/:employeeId', verifyToken, requirePermission('payroll.read'), getPayrollPayslip);

router.get('/contributions', verifyToken, requirePermission('payroll.read'), getPayrollContributions);

router.get('/contributions/export/:type', verifyToken, requirePermission('payroll.read'), exportPayrollContributions);

router.get('/settings', verifyToken, requirePermission('payroll.read'), getPayrollSettings);

router.get(
  '/expense-requests',
  verifyToken,
  requirePermission('employees.read', 'employees.create', 'employees.update', 'payroll.update'),
  getExpenseBudgetRequests
);

router.post(
  '/expense-requests',
  verifyToken,
  requirePermission('employees.create', 'employees.update', 'payroll.update'),
  [
    body('title').trim().notEmpty().withMessage('title is required').isLength({ max: 150 }).withMessage('title must be at most 150 characters'),
    body('description').trim().notEmpty().withMessage('description is required').isLength({ max: 2000 }).withMessage('description must be at most 2000 characters'),
    body('requested_amount').isFloat({ gt: 0 }).withMessage('requested_amount must be greater than 0'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('priority must be one of low, medium, high'),
  ],
  handleValidationErrors,
  createExpenseBudgetRequest
);

router.put(
  '/settings',
  verifyToken,
  requirePermission('payroll.update'),
  [
    body('pay_schedule').isIn(['weekly', 'semi-monthly', 'monthly']).withMessage('Invalid pay_schedule'),
  ],
  handleValidationErrors,
  updatePayrollSettings
);

export default router;
