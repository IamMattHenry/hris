import express from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import { login, getCurrentUser } from '../controllers/authController.js';

const router = express.Router();

// Login endpoint
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidationErrors,
  login
);

// Get current user (protected)
router.get('/me', verifyToken, getCurrentUser);

export default router;

