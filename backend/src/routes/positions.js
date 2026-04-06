import express from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getAllPositions,
  getPositionById,
  getTotalPosAvailability,
  createPosition,
  updatePosition,
  deletePosition,
} from '../controllers/positionController.js';

const router = express.Router();

// Get total position availability
router.get('/total-availability', verifyToken, requirePermission('positions.read'), getTotalPosAvailability);

// Get all positions
// Supports query param: ?department_id=1 to filter by department
router.get('/', verifyToken, requirePermission('positions.read'), getAllPositions);

// Get position by ID
router.get('/:id', verifyToken, requirePermission('positions.read'), getPositionById);

// Create position
router.post(
  '/',
  verifyToken,
  requirePermission('positions.create'),
  [
    body('position_name').notEmpty().withMessage('Position name is required'),
    body('department_id').isInt().withMessage('Department ID must be an integer'),
    body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
    body('availability').optional().isInt({ min: 0 }).withMessage('Availability must be a non-negative integer'),
  ],
  handleValidationErrors,
  createPosition
);

// Update position
router.put(
  '/:id',
  verifyToken,
  requirePermission('positions.update'),
  updatePosition
);

// Delete position
router.delete(
  '/:id',
  verifyToken,
  requirePermission('positions.delete'),
  deletePosition
);

export default router;

