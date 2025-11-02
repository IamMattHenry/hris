import * as db from '../config/db.js';
import logger from '../utils/logger.js';

export const getActivityLogs = async (req, res, next) => {
  try {
    const logs = await db.getAll('SELECT al.*, e.first_name, e.last_name, e.employee_code FROM activity_logs al LEFT JOIN employees e ON al.user_id = e.user_id ORDER BY al.log_id DESC LIMIT 1000');

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




