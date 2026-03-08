import express from 'express';
import { body, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.js';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getAllTickets,
  getTicketById,
  createTicket,
  createPublicTicket,
  updateTicketStatus,
  updateTicket,
  deleteTicket
} from '../controllers/ticketController.js';

const router = express.Router();

// Get all tickets (protected - users with tickets.read permission, or superadmin)
router.get(
  '/',
  verifyToken,
  requirePermission('tickets.read'),
  getAllTickets
);

// Get ticket by ID (protected - IT staff, admin, superadmin, or ticket owner)
router.get('/:id', verifyToken, getTicketById);

// Create ticket (protected - any authenticated user)
router.post(
  '/',
  verifyToken,
  [
    body('user_id').isInt().withMessage('User ID must be an integer'),
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 100 })
      .withMessage('Title must not exceed 100 characters'),
    body('description').optional().trim(),
  ],
  handleValidationErrors,
  createTicket
);

// Create public ticket (unprotected - for unauthenticated users)
router.post(
  '/public',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 100 })
      .withMessage('Title must not exceed 100 characters'),
    body('description').optional().trim(),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('name').optional().trim().isLength({ max: 100 }).withMessage('Name must not exceed 100 characters'),
  ],
  handleValidationErrors,
  createPublicTicket
);

// Update ticket status (protected - users with tickets.update permission)
router.put(
  '/:id/status',
  verifyToken,
  requirePermission('tickets.update'),
  [
    body('status')
      .isIn(['open', 'in_progress', 'resolved', 'closed'])
      .withMessage('Invalid status'),
    body('fixed_by').optional().isInt().withMessage('Fixed by must be an integer'),
    body('resolution_description')
      .if(body('status').equals('resolved'))
      .notEmpty()
      .withMessage('Resolution description is required when status is resolved')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Resolution description must be between 10 and 1000 characters'),
  ],
  handleValidationErrors,
  updateTicketStatus
);

// Update ticket (protected - users with tickets.update permission)
router.put(
  '/:id',
  verifyToken,
  requirePermission('tickets.update'),
  [
    body('title')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Title must not exceed 100 characters'),
    body('description').optional().trim(),
    body('status')
      .optional()
      .isIn(['open', 'in_progress', 'resolved', 'closed'])
      .withMessage('Invalid status'),
    body('fixed_by').optional().isInt().withMessage('Fixed by must be an integer'),
  ],
  handleValidationErrors,
  updateTicket
);

// Delete ticket (users with tickets.delete permission)
router.delete(
  '/:id',
  verifyToken,
  requirePermission('tickets.delete'),
  deleteTicket
);

export default router;