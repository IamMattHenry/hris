import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getAllPositions,
  getPositionById,
} from '../controllers/positionController.js';

const router = express.Router();

// Get all positions (protected)
// Supports query param: ?department_id=1 to filter by department
router.get('/', verifyToken, getAllPositions);

// Get position by ID (protected)
router.get('/:id', verifyToken, getPositionById);

export default router;

