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
// Automatically creates user account, employee record, and admin record (if role is 'admin')
router.post(
  '/',
  verifyToken,
  verifyRole(['admin']),
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'employee', 'supervisor']).withMessage('Role must be one of: admin, employee, supervisor'),
    body('sub_role').optional().isIn(['hr', 'it']).withMessage('Sub-role must be one of: hr, it'),
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('last_name').trim().notEmpty().withMessage('Last name is required'),
    body('birthdate').isISO8601().withMessage('Invalid birthdate format'),
    body('gender').optional().isIn(['male', 'female', 'others']).withMessage('Gender must be one of: male, female, others'),
    body('civil_status').optional().isIn(['single', 'married', 'divorced', 'widowed']).withMessage('Civil status must be one of: single, married, divorced, widowed'),
    body('home_address').optional().trim(),
    body('city').optional().trim(),
    body('region').optional().trim(),
    body('province').optional().trim(),
    body('province_city').optional().trim(),
    body('hire_date').isISO8601().withMessage('Invalid hire date format'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('contact_number').optional().trim(),
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

