import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as db from '../config/db.js';
import logger from '../utils/logger.js';

const handleLogin = async (req, res, next, { allowedRoles, deniedMessage }) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

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

    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn(`Failed login attempt for user: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(401).json({
        success: false,
        message: deniedMessage,
        role: user.role,
      });
    }

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

    try {
      await db.insert('activity_logs', {
        user_id: user.user_id,
        action: 'LOGIN',
        module: 'auth',
        description: `User ${username} logged in`,
        created_by: user.user_id,
      });
    } catch (logError) {
      logger.error('Failed to create activity log:', logError);
    }

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

export const login = async (req, res, next) =>
  handleLogin(req, res, next, {
    allowedRoles: ['admin', 'supervisor', 'superadmin'],
    deniedMessage: 'Only admins, supervisors, and superadmins are allowed to access this portal',
  });

export const loginEmployeePortal = async (req, res, next) =>
  handleLogin(req, res, next, {
    allowedRoles: ['employee'],
    deniedMessage: 'Only employees are allowed to access this portal',
  });

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
        e.middle_name,
        e.extension_name,
        e.birthdate,
        e.gender,
        e.civil_status,
        e.home_address,
        e.city,
        e.region,
        e.province,
        e.hire_date,
        e.status,
        e.department_id,
        e.position_id,
        e.shift,
        e.salary,
        e.leave_credit,
        e.supervisor_id,
        d.department_name,
        jp.position_name,
        ur.user_role_id,
        ur.sub_role
      FROM users u
      LEFT JOIN employees e ON u.user_id = e.user_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN job_positions jp ON e.position_id = jp.position_id
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      WHERE u.user_id = ?
    `, [req.user.user_id]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Fetch emails if employee exists
    if (user.employee_id) {
      const emails = await db.getAll(
        "SELECT email FROM employee_emails WHERE employee_id = ? ORDER BY email_id",
        [user.employee_id]
      );
      user.emails = emails.map(e => e.email);

      // Fetch contact numbers
      const contactNumbers = await db.getAll(
        "SELECT contact_number FROM employee_contact_numbers WHERE employee_id = ? ORDER BY contact_id",
        [user.employee_id]
      );
      user.contact_numbers = contactNumbers.map(c => c.contact_number);

      // Fetch dependents
      const dependents = await db.getAll(
        `SELECT
          d.dependant_id,
          d.dependant_code,
          d.firstname,
          d.lastname,
          d.relationship,
          d.birth_date,
          de.email,
          dc.contact_no,
          da.home_address,
          da.region_name,
          da.province_name,
          da.city_name
        FROM dependants d
        LEFT JOIN dependant_email de ON d.dependant_id = de.dependant_id
        LEFT JOIN dependant_contact dc ON d.dependant_id = dc.dependant_id
        LEFT JOIN dependant_address da ON d.dependant_id = da.dependant_id
        WHERE d.employee_id = ?
        ORDER BY d.dependant_id`,
        [user.employee_id]
      );
      user.dependents = dependents;
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

