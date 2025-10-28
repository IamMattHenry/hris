import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as db from '../config/db.js';
import logger from '../utils/logger.js';

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    // Find user
    const user = await db.getOne(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      logger.warn(`Login attempt with non-existent username: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn(`Failed login attempt for user: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check the user's role
    if (user.role !== 'admin' && user.role !== 'supervisor' && user.role !== 'superadmin') {
      return res.status(401).json({
        success: false,
        message: 'Only admins, supervisors, and superadmins are allowed to access this portal',
        role: user.role,
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logger.info(`User logged in: ${username}`);

    res.json({
  success: true,
  message: 'Login successful',
  data: {
    token,
    user: {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
    },
  },
});
 
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    // Get user with employee and admin details including department_id
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
        e.department_id,
        d.department_name,
        ur.user_role_id,
        ur.sub_role
      FROM users u
      LEFT JOIN employees e ON u.user_id = e.user_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      WHERE u.user_id = ?
    `, [req.user.user_id]);

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
    logger.error('Get current user error:', error);
    next(error);
  }
};

export default { login, getCurrentUser };

