import express from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { verifyToken, verifyRole } from '../middleware/auth.js';
import {
  getAllPositions,
  getPositionById,
  getTotalPosAvailability,
  createPosition,
  updatePosition,
  deletePosition,
} from '../controllers/positionController.js';

const router = express.Router();

// Get total position availability (protected)
router.get('/total-availability', verifyToken, getTotalPosAvailability);

// Get all positions (protected)
// Supports query param: ?department_id=1 to filter by department
router.get('/', verifyToken, getAllPositions);

// Get position by ID (protected)
router.get('/:id', verifyToken, getPositionById);

// Create position (admin and superadmin only)
router.post(
  '/',
  verifyToken,
  verifyRole(['admin', 'superadmin']),
  [
    body('position_name').notEmpty().withMessage('Position name is required'),
    body('department_id').isInt().withMessage('Department ID must be an integer'),
    body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
    body('availability').optional().isInt({ min: 0 }).withMessage('Availability must be a non-negative integer'),
  ],
  handleValidationErrors,
  createPosition
);

// Update position (admin and superadmin only)
router.put(
  '/:id',
  verifyToken,
  verifyRole(['admin', 'superadmin']),
  updatePosition
);

// Delete position (admin and superadmin only)
router.delete(
  '/:id',
  verifyToken,
  verifyRole(['admin', 'superadmin']),
  deletePosition
);

export default router;

