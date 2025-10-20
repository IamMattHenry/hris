import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController.js';

const router = express.Router();

// Get all departments (protected)
router.get('/', verifyToken, getAllDepartments);

// Get department by ID (protected)
router.get('/:id', verifyToken, getDepartmentById);

// Create department (admin only) - if needed later
// router.post('/', verifyToken, verifyRole(['admin']), createDepartment);

// Update department (admin only) - if needed later
// router.put('/:id', verifyToken, verifyRole(['admin']), updateDepartment);

// Delete department (admin only) - if needed later
// router.delete('/:id', verifyToken, verifyRole(['admin']), deleteDepartment);

export default router;

