import * as db from '../config/db.js';
import logger from '../utils/logger.js';

export const getActivityLogs = async (req, res, next) => {
  try {
    const logs = await db.getAll('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 1000');

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




