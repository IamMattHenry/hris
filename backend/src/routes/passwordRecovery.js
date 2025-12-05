import express from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import {
  requestPasswordOtp,
  verifyPasswordOtp,
  resetPasswordWithToken,
} from '../controllers/passwordRecoveryController.js';

const router = express.Router();

router.post(
  '/otp/request',
  [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Identifier (username or email) is required'),
  ],
  handleValidationErrors,
  requestPasswordOtp
);

router.post(
  '/otp/verify',
  [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Identifier is required'),
    body('code')
      .trim()
      .notEmpty()
      .withMessage('OTP code is required')
      .isLength({ min: 4, max: 10 })
      .withMessage('OTP code length is invalid'),
  ],
  handleValidationErrors,
  verifyPasswordOtp
);

router.post(
  '/reset',
  [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
  ],
  handleValidationErrors,
  resetPasswordWithToken
);

export default router;
