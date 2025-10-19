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

// Get all users (admin only)
router.get('/', verifyToken, verifyRole(['admin']), getAllUsers);

// Get user by ID (admin only)
router.get('/:id', verifyToken, verifyRole(['admin']), getUserById);

// Update user (admin only)
router.put(
  '/:id',
  verifyToken,
  verifyRole(['admin']),
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
      .isIn(['admin', 'employee'])
      .withMessage('Role must be either admin or employee'),
  ],
  handleValidationErrors,
  updateUser
);

// Delete user (admin only)
router.delete('/:id', verifyToken, verifyRole(['admin']), deleteUser);

export default router;

