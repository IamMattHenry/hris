import express from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { verifyToken, verifyRole } from '../middleware/auth.js';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employeeController.js';

const router = express.Router();

// Get all employees (protected)
router.get('/', verifyToken, getAllEmployees);

// Get employee by ID (protected)
router.get('/:id', verifyToken, getEmployeeById);

// Create employee (admin only)
router.post(
  '/',
  verifyToken,
  verifyRole(['admin']),
  [
    body('user_id').isInt().withMessage('User ID must be an integer'),
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('last_name').trim().notEmpty().withMessage('Last name is required'),
    body('birthdate').isISO8601().withMessage('Invalid birthdate format'),
    body('hire_date').isISO8601().withMessage('Invalid hire date format'),
    body('contact_number').trim().notEmpty().withMessage('Contact number is required'),
  ],
  handleValidationErrors,
  createEmployee
);

// Update employee (admin only)
router.put(
  '/:id',
  verifyToken,
  verifyRole(['admin']),
  updateEmployee
);

// Delete employee (admin only)
router.delete(
  '/:id',
  verifyToken,
  verifyRole(['admin']),
  deleteEmployee
);

export default router;

