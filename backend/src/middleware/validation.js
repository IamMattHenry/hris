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
    .isIn(['vacation', 'sick', 'emergency', 'others'])
    .withMessage('Invalid leave type'),
  body('start_date')
    .isISO8601()
    .withMessage('Invalid start date'),
  body('end_date')
    .isISO8601()
    .withMessage('Invalid end date'),
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

