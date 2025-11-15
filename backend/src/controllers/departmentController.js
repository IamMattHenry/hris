import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import { generateDepartmentCode } from '../utils/codeGenerator.js';

const getUserDepartmentId = async (userId) => {
  if (!userId) return null;
  const record = await db.getOne(
    'SELECT department_id FROM employees WHERE user_id = ?',
    [userId]
  );
  return record?.department_id ?? null;
};

export const getAllDepartments = async (req, res, next) => {
  try {
    let query = `
      SELECT
        d.*,
        COUNT(DISTINCT e.employee_id) AS employee_count,
        s.first_name AS supervisor_first_name,
        s.last_name AS supervisor_last_name,
        s.employee_code AS supervisor_code
      FROM departments d
      LEFT JOIN employees e ON d.department_id = e.department_id
      LEFT JOIN employees s ON d.supervisor_id = s.employee_id
    `;

    query += ' GROUP BY d.department_id ORDER BY d.department_id DESC';

    const departments = await db.getAll(query);

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
    const { department_name, description, supervisor_id } = req.body;

    if (req.user?.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admins are not allowed to create new departments',
      });
    }

    if (!department_name || department_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Department name is required',
      });
    }

    let supervisorId = null;
    if (supervisor_id) {
      const supervisor = await db.getOne(
        'SELECT employee_id, role FROM employees WHERE employee_id = ?',
        [supervisor_id]
      );
      if (!supervisor || supervisor.role !== 'supervisor') {
        return res.status(400).json({
          success: false,
          message: 'Invalid supervisor selected',
        });
      }
      supervisorId = supervisor.employee_id;
    }

    const createdBy = req.user?.user_id;

    const departmentId = await db.insert('departments', {
      department_name,
      description,
      supervisor_id: supervisorId,
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
        supervisor_id,
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
    let supervisorId = null;
    if (req.body.supervisor_id) {
      const supervisor = await db.getOne(
        'SELECT employee_id, department_id, role FROM employees WHERE employee_id = ?',
        [req.body.supervisor_id]
      );
      if (!supervisor || supervisor.role !== 'supervisor') {
        return res.status(400).json({
          success: false,
          message: 'Invalid supervisor selected',
        });
      }
      if (supervisor.department_id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'Supervisor must belong to the same department',
        });
      }
      supervisorId = supervisor.employee_id;
    }
    const updates = req.body;

    // Check if department exists
    const department = await db.getOne('SELECT * FROM departments WHERE department_id = ?', [id]);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    if (req.user?.role === 'admin') {
      const adminDeptId = await getUserDepartmentId(req.user.user_id);
      if (!adminDeptId) {
        return res.status(403).json({
          success: false,
          message: 'Admin is not associated with any department',
        });
      }

      if (department.department_id !== adminDeptId) {
        return res.status(403).json({
          success: false,
          message: 'Admins can only update their own department',
        });
      }
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

    if (req.user?.role === 'admin') {
      const adminDeptId = await getUserDepartmentId(deletedBy);
      if (!adminDeptId) {
        return res.status(403).json({
          success: false,
          message: 'Admin is not associated with any department',
        });
      }

      if (department.department_id !== adminDeptId) {
        return res.status(403).json({
          success: false,
          message: 'Admins can only delete their own department',
        });
      }
    }

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

