import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import bcryptjs from 'bcryptjs';

/**
 * Get all users
 * Returns all users without password hashes
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await db.getAll(`
      SELECT
        u.user_id,
        u.username,
        u.role,
        u.created_at,
        e.employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        ur.user_role_id,
        ur.sub_role
      FROM users u
      LEFT JOIN employees e ON u.user_id = e.user_id
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      ORDER BY u.user_id DESC
    `);

    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    next(error);
  }
};

/**
 * Get user by ID
 * Returns user details with associated employee/admin information
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await db.getOne(`
      SELECT
        u.user_id,
        u.username,
        u.role,
        u.created_at,
        e.employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.birthdate,
        e.hire_date,
        e.status,
        ur.user_role_id,
        ur.sub_role
      FROM users u
      LEFT JOIN employees e ON u.user_id = e.user_id
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      WHERE u.user_id = ?
    `, [id]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    next(error);
  }
};

/**
 * Update user
 * Allows updating username and/or password
 * Prevents updating the currently logged-in admin user's role
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;

    // Validate that at least one field is being updated
    if (!username && !password && !role) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (username, password, or role) must be provided for update',
      });
    }

    // Check if user exists
    const user = await db.getOne('SELECT * FROM users WHERE user_id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent updating the currently logged-in admin user
    if (req.user && req.user.user_id === parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot update your own user account. Please ask another admin to make changes.',
      });
    }

    // Prepare updates object
    const updates = {};

    // Validate and add username if provided
    if (username) {
      // Check if username is already taken by another user
      const existingUser = await db.getOne(
        'SELECT user_id FROM users WHERE username = ? AND user_id != ?',
        [username, id]
      );

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: `Username '${username}' is already taken by another user`,
        });
      }

      updates.username = username;
    }

    // Validate and add password if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long',
        });
      }

      // Hash the new password
      const hashedPassword = await bcryptjs.hash(password, 10);
      updates.password = hashedPassword;
    }

    // Validate and add role if provided
    if (role) {
      const validRoles = ['admin', 'employee', 'supervisor', 'superadmin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Role must be one of: 'admin', 'employee', 'supervisor', 'superadmin'`,
        });
      }

      updates.role = role;
    }

    // Add updated_by for audit trail
    const updatedBy = req.user?.user_id;
    if (updatedBy) {
      updates.updated_by = updatedBy;
    }

    // Perform update
    const affectedRows = await db.update('users', updates, 'user_id = ?', [id]);

    logger.info(`User updated: ${id} (username: ${user.username})`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: updatedBy || 1,
        action: "UPDATE",
        module: "users",
        description: `Updated user ${user.username} (ID: ${id})`,
        created_by: updatedBy || 1,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      affectedRows,
    });
  } catch (error) {
    logger.error('Update user error:', error);
    next(error);
  }
};

/**
 * Delete user
 * Deletes user and cascades to employees and admins tables
 * Prevents deleting the currently logged-in admin user
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await db.getOne('SELECT * FROM users WHERE user_id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deleting the currently logged-in admin user
    if (req.user && req.user.user_id === parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete your own user account',
      });
    }

    // Check if user has associated employee record
    const employee = await db.getOne('SELECT employee_id, employee_code FROM employees WHERE user_id = ?', [id]);

    // Check if user has associated user_role record
    const userRole = await db.getOne('SELECT user_role_id, sub_role FROM user_roles WHERE user_id = ?', [id]);

    // Get user ID from JWT token for audit trail
    const deletedBy = req.user?.user_id;

    // Delete user (will cascade to employees and user_roles due to foreign key constraints)
    const affectedRows = await db.deleteRecord('users', 'user_id = ?', [id]);

    logger.warn(`User deleted: ${id} (username: ${user.username}, role: ${user.role})`);
    if (employee) {
      logger.warn(`  - Associated employee deleted: ${employee.employee_code} (ID: ${employee.employee_id})`);
    }
    if (admin) {
      logger.warn(`  - Associated admin deleted: ${admin.admin_code} (ID: ${admin.admin_id})`);
    }

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: deletedBy || 1,
        action: "DELETE",
        module: "users",
        description: `Deleted user ${user.username} (ID: ${id})`,
        created_by: deletedBy || 1,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      affectedRows,
      cascadeInfo: {
        employeeDeleted: !!employee,
        adminDeleted: !!admin,
      },
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    next(error);
  }
};

export default {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};

