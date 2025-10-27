import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import { generateDepartmentCode } from '../utils/codeGenerator.js';

export const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await db.getAll('SELECT * FROM departments ORDER BY department_id DESC');

    res.json({
      success: true,
      data: departments,
      count: departments.length,
    });
  } catch (error) {
    logger.error('Get all departments error:', error);
    next(error);
  }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const department = await db.getOne('SELECT * FROM departments WHERE department_id = ?', [id]);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    logger.error('Get department by ID error:', error);
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { department_name, description } = req.body;

    // Validate required fields
    if (!department_name) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
      });
    }

    // Get user ID from JWT token for audit trail
    const createdBy = req.user?.user_id;

    // Insert department without code first
    const departmentId = await db.insert('departments', {
      department_name,
      description,
      created_by: createdBy,
    });

    // Generate department code based on the ID
    const departmentCode = generateDepartmentCode(departmentId);

    // Update the department with the generated code
    await db.update('departments', { department_code: departmentCode }, 'department_id = ?', [departmentId]);

    logger.info(`Department created: ${departmentId}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: createdBy || 1,
        action: "CREATE",
        module: "departments",
        description: `Created department ${department_name} (${departmentCode})`,
        created_by: createdBy || 1,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: {
        department_id: departmentId,
        department_code: departmentCode,
        department_name,
        description,
      },
    });
  } catch (error) {
    logger.error('Create department error:', error);
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if department exists
    const department = await db.getOne('SELECT * FROM departments WHERE department_id = ?', [id]);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    // Prevent updating the code
    if (updates.department_code) {
      delete updates.department_code;
    }

    // Get user ID from JWT token for audit trail
    const updatedBy = req.user?.user_id;
    if (updatedBy) {
      updates.updated_by = updatedBy;
    }

    const affectedRows = await db.update('departments', updates, 'department_id = ?', [id]);

    logger.info(`Department updated: ${id}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: updatedBy || 1,
        action: "UPDATE",
        module: "departments",
        description: `Updated department ${department.department_name} (${department.department_code})`,
        created_by: updatedBy || 1,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    res.json({
      success: true,
      message: 'Department updated successfully',
      affectedRows,
    });
  } catch (error) {
    logger.error('Update department error:', error);
    next(error);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if department exists
    const department = await db.getOne('SELECT * FROM departments WHERE department_id = ?', [id]);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    // Get user ID from JWT token for audit trail
    const deletedBy = req.user?.user_id;

    const affectedRows = await db.deleteRecord('departments', 'department_id = ?', [id]);

    logger.info(`Department deleted: ${id}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: deletedBy || 1,
        action: "DELETE",
        module: "departments",
        description: `Deleted department ${department.department_name} (${department.department_code})`,
        created_by: deletedBy || 1,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    res.json({
      success: true,
      message: 'Department deleted successfully',
      affectedRows,
    });
  } catch (error) {
    logger.error('Delete department error:', error);
    next(error);
  }
};

export default {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};

