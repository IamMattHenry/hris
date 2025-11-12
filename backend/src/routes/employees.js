import express from 'express';
import { body } from 'express-validator';
import { verifyToken, verifyRole } from '../middleware/auth.js';
import { validateEmployee, handleValidationErrors } from '../middleware/validation.js';
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

// Create employee (admin and superadmin only) with enhanced validation
router.post(
  '/',
  verifyToken,
  verifyRole(['admin', 'superadmin']),
  [
    // User validation
    body('username').trim().isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Invalid username format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'employee', 'supervisor', 'superadmin']).withMessage('Invalid role'),
    body('sub_role').optional().isIn(['hr', 'it']).withMessage('Invalid sub-role'),
    
    // Employee validation (using enhanced rules)
    body('first_name').trim().isLength({ min: 2, max: 100 }).matches(/^[a-zA-Z\s'-]+$/).withMessage('Invalid first name format'),
    body('last_name').trim().isLength({ min: 2, max: 100 }).matches(/^[a-zA-Z\s'-]+$/).withMessage('Invalid last name format'),
    body('birthdate').isISO8601().withMessage('Invalid birthdate format'),
    body('gender').optional().isIn(['male', 'female', 'others']).withMessage('Invalid gender'),
    body('civil_status').optional().isIn(['single', 'married', 'divorced', 'widowed']).withMessage('Invalid civil status'),
    body('hire_date').isISO8601().withMessage('Invalid hire date format'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email format'),
    body('contact_number').optional().matches(/^09\d{9}$/).withMessage('Invalid Philippine phone format'),
    body('salary').optional().isFloat({ min: 0, max: 999999.99 }).withMessage('Invalid salary amount'),
  ],
  handleValidationErrors,
  createEmployee
);

// Update own employee profile (any authenticated user can update their own profile)
router.put(
  '/me',
  verifyToken,
  updateEmployee
);

// Update employee (admin and superadmin only)
router.put(
  '/:id',
  verifyToken,
  verifyRole(['admin', 'superadmin']),
  updateEmployee
);

// Delete employee (admin and superadmin only)
router.delete(
  '/:id',
  verifyToken,
  verifyRole(['admin', 'superadmin']),
  deleteEmployee
);

export default router;

