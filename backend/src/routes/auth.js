import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validateLogin } from '../middleware/validation.js';
import { login, getCurrentUser } from '../controllers/authController.js';

const router = express.Router();

// Login endpoint with enhanced validation
router.post('/login', validateLogin, login);

// Get current user (protected)
router.get('/me', verifyToken, getCurrentUser);

export default router;

