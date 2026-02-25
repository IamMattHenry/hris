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
  getEmployeeAvailability,
} from '../controllers/employeeController.js';

const router = express.Router();

// Get employee availability status (protected)
router.get('/availability', verifyToken, getEmployeeAvailability);

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
    body('employment_type').optional().isIn(['regular','probationary']).withMessage('Invalid employment type'),
    body('probation_end_date').optional().isISO8601().withMessage('Invalid probation end date'),
    body('monthly_salary').optional().isFloat({ min: 0 }).withMessage('Invalid monthly salary'),
    body('hourly_rate').optional().isFloat({ min: 0 }).withMessage('Invalid hourly rate'),
      // Work type and schedule (schedule fields required)
      body('work_type').isIn(['full-time','part-time']).withMessage('Invalid work_type'),
      body('scheduled_days')
        .custom((value) => {
          let arr = value;
          if (typeof value === 'string') {
            try { arr = JSON.parse(value); } catch { return false; }
          }
          if (!Array.isArray(arr) || arr.length === 0) return false;
          const allowed = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
          return arr.every((d) => typeof d === 'string' && allowed.includes(d.trim().toLowerCase()));
        })
        .withMessage('scheduled_days is required and must be a non-empty array of weekdays'),
      body('scheduled_start_time').matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/).withMessage('scheduled_start_time is required (HH:MM or HH:MM:SS)'),
      body('scheduled_end_time').matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/).withMessage('scheduled_end_time is required (HH:MM or HH:MM:SS)')
  ],
  handleValidationErrors,
  createEmployee
);

// Update own employee profile (any authenticated user can update their own profile)
  router.put(
    '/me',
    verifyToken,
    [
      body('work_type').optional().isIn(['full-time','part-time']).withMessage('Invalid work_type'),
      body('scheduled_days').custom((value) => {
        let arr = value;
        if (typeof value === 'string') { try { arr = JSON.parse(value); } catch { return false; } }
        if (!Array.isArray(arr) || arr.length === 0) return false;
        const allowed = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        return arr.every((d) => typeof d === 'string' && allowed.includes(d.trim().toLowerCase()));
      }).withMessage('scheduled_days is required and must be a non-empty array of weekdays'),
      body('scheduled_start_time').matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/).withMessage('scheduled_start_time is required (HH:MM or HH:MM:SS)'),
      body('scheduled_end_time').matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/).withMessage('scheduled_end_time is required (HH:MM or HH:MM:SS)')
    ],
    handleValidationErrors,
    updateEmployee
  );

// Update employee (admin and superadmin only)
  router.put(
    '/:id',
    verifyToken,
    [
      body('work_type').optional().isIn(['full-time','part-time']).withMessage('Invalid work_type'),
      body('scheduled_days').custom((value) => {
        let arr = value;
        if (typeof value === 'string') { try { arr = JSON.parse(value); } catch { return false; } }
        if (!Array.isArray(arr) || arr.length === 0) return false;
        const allowed = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        return arr.every((d) => typeof d === 'string' && allowed.includes(d.trim().toLowerCase()));
      }).withMessage('scheduled_days is required and must be a non-empty array of weekdays'),
      body('scheduled_start_time').matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/).withMessage('scheduled_start_time is required (HH:MM or HH:MM:SS)'),
      body('scheduled_end_time').matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/).withMessage('scheduled_end_time is required (HH:MM or HH:MM:SS)')
    ],
    handleValidationErrors,
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

