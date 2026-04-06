import express from 'express';
import { body, query } from 'express-validator';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { handleValidationErrors } from '../middleware/validation.js';
import {
  getPenaltyList,
  getPenaltyDetail,
  createPenalty,
  updatePenalty,
  updatePenaltyStatus,
  settlePenalty,
  cancelPenalty,
  deletePenalty,
} from '../controllers/penaltyController.js';

const router = express.Router();

router.get(
  '/',
  verifyToken,
  requirePermission('penalties.read'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
  ],
  handleValidationErrors,
  getPenaltyList
);

router.get('/:id', verifyToken, requirePermission('penalties.read'), getPenaltyDetail);

router.post(
  '/',
  verifyToken,
  requirePermission('penalties.create'),
  [
    body('employee_id').isInt({ min: 1 }).withMessage('employee_id is required and must be a positive integer'),
    body('penalty_type').isString().trim().isLength({ min: 2, max: 100 }).withMessage('penalty_type is required (2-100 chars)'),
    body('title').isString().trim().isLength({ min: 3, max: 255 }).withMessage('title is required (3-255 chars)'),
    body('description').isString().trim().isLength({ min: 5, max: 2000 }).withMessage('description is required (5-2000 chars)'),
    body('amount').isFloat({ min: 0 }).withMessage('amount must be >= 0'),
    body('incident_date').isISO8601().withMessage('incident_date must be a valid date'),
    body('issued_date').isISO8601().withMessage('issued_date must be a valid date'),
    body('status').optional().isIn(['draft', 'pending', 'approved', 'rejected', 'settled', 'cancelled', 'waived']).withMessage('Invalid status value'),
    body('payroll_deduction_mode').optional().isIn(['full', 'next_payroll', 'installment', 'manual', 'none']).withMessage('Invalid payroll_deduction_mode'),
    body('installment_count').optional({ nullable: true }).isInt({ min: 1 }).withMessage('installment_count must be >= 1'),
    body('due_date').optional({ nullable: true }).isISO8601().withMessage('due_date must be a valid date'),
  ],
  handleValidationErrors,
  createPenalty
);

router.put(
  '/:id',
  verifyToken,
  requirePermission('penalties.update'),
  [
    body('penalty_type').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('penalty_type must be 2-100 chars'),
    body('title').optional().isString().trim().isLength({ min: 3, max: 255 }).withMessage('title must be 3-255 chars'),
    body('description').optional().isString().trim().isLength({ min: 5, max: 2000 }).withMessage('description must be 5-2000 chars'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('amount must be >= 0'),
    body('incident_date').optional({ nullable: true }).isISO8601().withMessage('incident_date must be a valid date'),
    body('issued_date').optional({ nullable: true }).isISO8601().withMessage('issued_date must be a valid date'),
    body('due_date').optional({ nullable: true }).isISO8601().withMessage('due_date must be a valid date'),
    body('payroll_deduction_mode').optional().isIn(['full', 'next_payroll', 'installment', 'manual', 'none']).withMessage('Invalid payroll_deduction_mode'),
    body('installment_count').optional({ nullable: true }).isInt({ min: 1 }).withMessage('installment_count must be >= 1'),
  ],
  handleValidationErrors,
  updatePenalty
);

router.patch(
  '/:id/status',
  verifyToken,
  requirePermission('penalties.approve', 'penalties.update'),
  [
    body('status').isIn(['pending', 'approved', 'rejected', 'settled', 'cancelled', 'waived']).withMessage('Invalid status value'),
    body('notes').optional().isString().isLength({ max: 1000 }).withMessage('notes must be <= 1000 chars'),
  ],
  handleValidationErrors,
  updatePenaltyStatus
);

router.post(
  '/:id/settle',
  verifyToken,
  requirePermission('penalties.settle'),
  [
    body('settled_amount').optional().isFloat({ min: 0.01 }).withMessage('settled_amount must be > 0'),
    body('payment_ref').optional().isString().isLength({ max: 100 }).withMessage('payment_ref must be <= 100 chars'),
    body('notes').optional().isString().isLength({ max: 1000 }).withMessage('notes must be <= 1000 chars'),
  ],
  handleValidationErrors,
  settlePenalty
);

router.post(
  '/:id/cancel',
  verifyToken,
  requirePermission('penalties.cancel'),
  [
    body('reason').isString().trim().isLength({ min: 3, max: 255 }).withMessage('reason is required (3-255 chars)'),
  ],
  handleValidationErrors,
  cancelPenalty
);

router.delete('/:id', verifyToken, requirePermission('penalties.delete'), deletePenalty);

export default router;
