import express from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { verifyToken, verifyRole } from '../middleware/auth.js';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';

const router = express.Router();

// Get all users (admin and superadmin only)
router.get('/', verifyToken, verifyRole(['admin', 'superadmin']), getAllUsers);

// Get user by ID (admin and superadmin only)
router.get('/:id', verifyToken, verifyRole(['admin', 'superadmin']), getUserById);

// Update user (admin and superadmin only)
router.put(
  '/:id',
  verifyToken,
  verifyRole(['admin', 'superadmin']),
  [
    body('username')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Username cannot be empty'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['admin', 'employee', 'supervisor', 'superadmin'])
      .withMessage('Role must be one of: admin, employee, supervisor, superadmin'),
  ],
  handleValidationErrors,
  updateUser
);

// Delete user (admin and superadmin only)
router.delete('/:id', verifyToken, verifyRole(['admin', 'superadmin']), deleteUser);

export default router;

