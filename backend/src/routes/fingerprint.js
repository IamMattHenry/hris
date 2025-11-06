import express from 'express';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import {
  startEnrollment,
  confirmEnrollment,
  getNextFingerprintId,
  checkFingerprintId,
} from '../controllers/fingerprintController.js';

const router = express.Router();

// Get next available fingerprint ID (protected)
router.get('/next-id', verifyToken, getNextFingerprintId);

// Check if fingerprint ID is available (protected)
router.get('/check/:fingerprint_id', verifyToken, checkFingerprintId);

// Start fingerprint enrollment (protected)
router.post(
  '/enroll/start',
  verifyToken,
  [
    body('employee_id').isInt().withMessage('Employee ID must be an integer'),
    body('fingerprint_id').isInt().withMessage('Fingerprint ID must be an integer'),
  ],
  handleValidationErrors,
  startEnrollment
);

// Confirm fingerprint enrollment (no auth - called by Arduino bridge)
router.post(
  '/enroll/confirm',
  [
    body('employee_id').isInt().withMessage('Employee ID must be an integer'),
    body('fingerprint_id').isInt().withMessage('Fingerprint ID must be an integer'),
  ],
  handleValidationErrors,
  confirmEnrollment
);

export default router;
