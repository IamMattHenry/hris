import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController.js';

const router = express.Router();

// Get all departments
router.get('/', verifyToken, requirePermission('departments.read'), getAllDepartments);

// Get department by ID
router.get('/:id', verifyToken, requirePermission('departments.read'), getDepartmentById);

// Create department
router.post('/', verifyToken, requirePermission('departments.create'), createDepartment);

// Update department
router.put('/:id', verifyToken, requirePermission('departments.update'), updateDepartment);

// Delete department
router.delete('/:id', verifyToken, requirePermission('departments.delete'), deleteDepartment);

export default router;

