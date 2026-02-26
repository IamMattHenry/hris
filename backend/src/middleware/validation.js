import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// Essential validation rules for security
export const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Invalid username format'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password required'),
  handleValidationErrors
];

export const validateEmployee = [
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name required (2-100 characters)')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Invalid first name format'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name required (2-100 characters)')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Invalid last name format'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('salary')
    .optional()
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Salary must be positive'),
  body('contact_number')
    .optional()
    .matches(/^09\d{9}$/)
    .withMessage('Invalid Philippine phone format'),
  // Work type and schedule (required fields for schedule)
  body('work_type')
    .optional()
    .isIn(['full-time','part-time'])
    .withMessage('Invalid work_type'),
  body('scheduled_days')
    .custom((value) => {
      let arr = value;
      if (typeof value === 'string') { try { arr = JSON.parse(value); } catch { return false; } }
      if (!Array.isArray(arr) || arr.length === 0) return false;
      const allowed = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      return arr.every((d) => typeof d === 'string' && allowed.includes(d.trim().toLowerCase()));
    })
    .withMessage('scheduled_days is required and must be a non-empty array of weekdays'),
  body('scheduled_start_time')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/)
    .withMessage('scheduled_start_time is required (HH:MM or HH:MM:SS)'),
  body('scheduled_end_time')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/)
    .withMessage('scheduled_end_time is required (HH:MM or HH:MM:SS)'),
  handleValidationErrors
];

export const validateAttendance = [
  body('employee_id')
    .isInt({ min: 1 })
    .withMessage('Valid employee ID required'),
  body('status')
    .optional()
    .isIn(['present', 'absent', 'late', 'on_leave'])
    .withMessage('Invalid attendance status'),
  body('overtime_hours')
    .optional()
    .isFloat({ min: 0, max: 8 })
    .withMessage('Overtime must be 0-8 hours'),
  handleValidationErrors
];

export const validateLeave = [
  body('leave_type')
    .isIn(['vacation','sick','emergency','half_day','others','maternity','paternity','sil','solo_parent','vawc','special_women','bereavement'])
    .withMessage('Invalid leave type'),
  body('start_date')
    .isISO8601()
    .withMessage('Invalid start date'),
  body('end_date')
    .isISO8601()
    .withMessage('Invalid end date'),
  // Conditional requirements for statutory leaves (basic payload validation; eligibility checked in controller)
  body('maternity_type')
    .if(body('leave_type').equals('maternity'))
    .isIn(['live_birth','solo','miscarriage'])
    .withMessage('Invalid maternity_type (allowed: live_birth, solo, miscarriage)'),
  body('pregnancy_doc_ref')
    .if(body('leave_type').equals('maternity'))
    .notEmpty()
    .withMessage('Maternity leave requires pregnancy/birth documentation reference'),
  body('marriage_cert_no')
    .if(body('leave_type').equals('paternity'))
    .notEmpty()
    .withMessage('Paternity leave requires a marriage certificate number'),
  body('solo_parent_id')
    .if((value, { req }) => req.body.leave_type === 'solo_parent' || (req.body.leave_type === 'maternity' && req.body.maternity_type === 'solo'))
    .notEmpty()
    .withMessage('Solo Parent leave requires a Solo Parent ID'),
  body('vawc_cert_ref')
    .if(body('leave_type').equals('vawc'))
    .notEmpty()
    .withMessage('VAWC leave requires a barangay or police certification reference'),
  body('medical_cert_no')
    .if(body('leave_type').equals('special_women'))
    .notEmpty()
    .withMessage('Special leave for women requires a medical certificate number'),
  handleValidationErrors
];

export const validateTicket = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be 5-100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be 10-1000 characters'),
  handleValidationErrors
];

export default { 
  handleValidationErrors, 
  validateLogin, 
  validateEmployee, 
  validateAttendance, 
  validateLeave, 
  validateTicket 
};

