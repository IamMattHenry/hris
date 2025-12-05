import * as db from '../config/db.js';
import logger from '../utils/logger.js';

export const getActivityLogs = async (req, res, next) => {
  try {
    // For superadmin, show all logs
    // For others with access, show only relevant logs based on their department/role
    let query = 'SELECT al.*, e.first_name, e.last_name, e.employee_code FROM activity_logs al LEFT JOIN employees e ON al.user_id = e.user_id';
    const params = [];
    const conditions = [];

    // If user is not superadmin, apply filtering based on their access level
    if (req.user && req.user.role !== 'superadmin') {
      // Get user's department
      const userDept = await db.getOne(
        `SELECT department_id FROM employees WHERE user_id = ?`,
        [req.user.user_id]
      );
      
      const userDepartment = userDept?.department_id || null;
      
      // If user has a department, filter logs to show only activities from that department
      if (userDepartment) {
        conditions.push('e.department_id = ?');
        params.push(userDepartment);
      } else {
        // If user has no department, only show their own logs
        conditions.push('al.user_id = ?');
        params.push(req.user.user_id);
      }
    }

    // Apply conditions if any
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY al.log_id DESC LIMIT 1000';

    const logs = await db.getAll(query, params);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    logger.error('Get activity logs error:', error);
    next(error);
  }
};




