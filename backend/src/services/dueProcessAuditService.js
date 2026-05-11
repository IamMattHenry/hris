import * as db from '../config/db.js';
import logger from '../utils/logger.js';

export const logDueProcessAudit = async ({
  userId = null,
  entityType,
  entityId,
  action,
  oldValues = null,
  newValues = null,
  ipAddress = null,
}) => {
  try {
    if (!entityType || !entityId || !action) {
      return null;
    }

    return await db.insert('audit_logs', {
      user_id: userId,
      entity_type: String(entityType).trim(),
      entity_id: String(entityId).trim(),
      action: String(action).trim(),
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      ip_address: ipAddress ? String(ipAddress).trim() : null,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Failed to write due process audit log:', error);
    return null;
  }
};
