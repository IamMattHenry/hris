import express from 'express';
import { verifyToken, verifyRole } from '../middleware/auth.js';
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

// Create department (admin only)
router.post('/', verifyToken, verifyRole(['admin', 'superadmin']), createDepartment);

// Update department (admin only)
router.put('/:id', verifyToken, verifyRole(['admin', 'superadmin']), updateDepartment);

// Delete department (admin only)
router.delete('/:id', verifyToken, verifyRole(['admin', 'superadmin']), deleteDepartment);

export default router;

