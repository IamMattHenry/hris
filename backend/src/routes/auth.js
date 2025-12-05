import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validateLogin } from '../middleware/validation.js';
import { login, loginEmployeePortal, getCurrentUser, verifyFingerprintLogin } from '../controllers/authController.js';

const router = express.Router();

// Login endpoints with enhanced validation
router.post('/login', validateLogin, login);
router.post('/login/employee', validateLogin, loginEmployeePortal);

// Fingerprint verification for 2FA login
router.post('/verify-fingerprint', verifyFingerprintLogin);

// Get current user (protected)
router.get('/me', verifyToken, getCurrentUser);

export default router;

