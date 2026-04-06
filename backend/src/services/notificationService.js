import * as db from '../config/db.js';
import logger from '../utils/logger.js';

const HR_ROLES = ['admin', 'superadmin'];

let ensureTablePromise = null;

const ensureNotificationsTable = async () => {
  if (!ensureTablePromise) {
    ensureTablePromise = db.query(`
      CREATE TABLE IF NOT EXISTS user_notifications (
        notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        recipient_user_id INT NOT NULL,
        actor_user_id INT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        category VARCHAR(80) NOT NULL DEFAULT 'general',
        reference_module VARCHAR(80) NULL,
        reference_id VARCHAR(120) NULL,
        status ENUM('unread', 'read') NOT NULL DEFAULT 'unread',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME NULL,
        INDEX idx_user_notifications_recipient_status (recipient_user_id, status, created_at),
        INDEX idx_user_notifications_created_at (created_at)
      )
    `).catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

const normalizeCategory = (value) => {
  const category = String(value || 'general').trim().toLowerCase();
  return category || 'general';
};

export const createNotification = async ({
  recipientUserId,
  actorUserId = null,
  title,
  message,
  category = 'general',
  referenceModule = null,
  referenceId = null,
}) => {
  if (!recipientUserId || !title || !message) {
    return null;
  }

  await ensureNotificationsTable();

  const notificationId = await db.insert('user_notifications', {
    recipient_user_id: Number(recipientUserId),
    actor_user_id: actorUserId ? Number(actorUserId) : null,
    title: String(title).trim(),
    message: String(message).trim(),
    category: normalizeCategory(category),
    reference_module: referenceModule ? String(referenceModule).trim() : null,
    reference_id: referenceId != null ? String(referenceId) : null,
  });

  return notificationId;
};

export const createNotificationsForUsers = async ({
  recipientUserIds,
  actorUserId = null,
  title,
  message,
  category = 'general',
  referenceModule = null,
  referenceId = null,
}) => {
  if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
    return [];
  }

  const uniqueRecipientIds = Array.from(
    new Set(
      recipientUserIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  if (uniqueRecipientIds.length === 0) {
    return [];
  }

  const createdIds = [];
  for (const recipientUserId of uniqueRecipientIds) {
    const createdId = await createNotification({
      recipientUserId,
      actorUserId,
      title,
      message,
      category,
      referenceModule,
      referenceId,
    });

    if (createdId) {
      createdIds.push(createdId);
    }
  }

  return createdIds;
};

export const getHrUserIds = async () => {
  await ensureNotificationsTable();

  const placeholders = HR_ROLES.map(() => '?').join(', ');
  const rows = await db.getAll(
    `SELECT user_id FROM users WHERE role IN (${placeholders})`,
    HR_ROLES
  );

  return rows.map((row) => Number(row.user_id)).filter((id) => Number.isInteger(id) && id > 0);
};

export const notifyHrUsers = async ({
  actorUserId = null,
  excludeUserIds = [],
  title,
  message,
  category = 'general',
  referenceModule = null,
  referenceId = null,
}) => {
  try {
    const hrUserIds = await getHrUserIds();
    if (hrUserIds.length === 0) {
      return [];
    }

    const exclusionSet = new Set(
      (Array.isArray(excludeUserIds) ? excludeUserIds : [excludeUserIds])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    );

    const recipients = hrUserIds.filter((id) => !exclusionSet.has(id));
    if (recipients.length === 0) {
      return [];
    }

    return await createNotificationsForUsers({
      recipientUserIds: recipients,
      actorUserId,
      title,
      message,
      category,
      referenceModule,
      referenceId,
    });
  } catch (error) {
    logger.error('notifyHrUsers failed:', error);
    return [];
  }
};

export const notifyEmployeeByEmployeeId = async ({
  employeeId,
  actorUserId = null,
  title,
  message,
  category = 'general',
  referenceModule = null,
  referenceId = null,
}) => {
  try {
    if (!employeeId) {
      return null;
    }

    const employee = await db.getOne(
      'SELECT user_id FROM employees WHERE employee_id = ? LIMIT 1',
      [employeeId]
    );

    if (!employee?.user_id) {
      return null;
    }

    return await createNotification({
      recipientUserId: employee.user_id,
      actorUserId,
      title,
      message,
      category,
      referenceModule,
      referenceId,
    });
  } catch (error) {
    logger.error('notifyEmployeeByEmployeeId failed:', error);
    return null;
  }
};

export const getNotificationsForUser = async ({ userId, limit = 20, status }) => {
  await ensureNotificationsTable();

  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const params = [Number(userId)];

  let where = 'recipient_user_id = ?';
  if (status === 'read' || status === 'unread') {
    where += ' AND status = ?';
    params.push(status);
  }

  params.push(normalizedLimit);

  return db.getAll(
    `SELECT
       notification_id,
       recipient_user_id,
       actor_user_id,
       title,
       message,
       category,
       reference_module,
       reference_id,
       status,
       created_at,
       read_at
     FROM user_notifications
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT ?`,
    params
  );
};

export const getUnreadNotificationCount = async (userId) => {
  await ensureNotificationsTable();

  const row = await db.getOne(
    `SELECT COUNT(*) AS unread_count
     FROM user_notifications
     WHERE recipient_user_id = ? AND status = 'unread'`,
    [Number(userId)]
  );

  return Number(row?.unread_count || 0);
};

export const markNotificationAsRead = async ({ userId, notificationId }) => {
  await ensureNotificationsTable();

  const result = await db.query(
    `UPDATE user_notifications
     SET status = 'read', read_at = NOW()
     WHERE notification_id = ? AND recipient_user_id = ? AND status = 'unread'`,
    [Number(notificationId), Number(userId)]
  );

  return Number(result?.affectedRows || 0);
};

export const markAllNotificationsAsRead = async (userId) => {
  await ensureNotificationsTable();

  const result = await db.query(
    `UPDATE user_notifications
     SET status = 'read', read_at = NOW()
     WHERE recipient_user_id = ? AND status = 'unread'`,
    [Number(userId)]
  );

  return Number(result?.affectedRows || 0);
};
