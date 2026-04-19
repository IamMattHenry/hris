import * as db from '../config/db.js';
import logger from '../utils/logger.js';

const HR_ROLES = ['admin', 'superadmin'];
const HR_PORTAL_ROLE_KEYS = [
  'hr_manager',
  'hr_supervisor',
  'payroll_officer',
  'leave_attendance_officer',
  'recruitment_officer',
];

const inFlightNotificationKeys = new Set();

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

const getUserIdsByRoleKey = async (roleKey) => {
  await ensureNotificationsTable();

  const normalizedRoleKey = String(roleKey || '').trim();
  if (!normalizedRoleKey) {
    return [];
  }

  const rows = await db.getAll(
    `SELECT DISTINCT ura.user_id
     FROM user_role_assignments ura
     JOIN roles r ON ura.role_id = r.role_id
     WHERE r.role_key = ?`,
    [normalizedRoleKey]
  );

  return rows
    .map((row) => Number(row.user_id))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const withNotificationGuard = async (guardKey, handler) => {
  if (inFlightNotificationKeys.has(guardKey)) {
    return [];
  }

  inFlightNotificationKeys.add(guardKey);
  try {
    return await handler();
  } finally {
    inFlightNotificationKeys.delete(guardKey);
  }
};

const getHrPortalUserIds = async () => {
  await ensureNotificationsTable();

  const portalRoleUserLists = await Promise.all(
    HR_PORTAL_ROLE_KEYS.map((roleKey) => getUserIdsByRoleKey(roleKey))
  );

  return Array.from(
    new Set([
      ...(await getHrUserIds()),
      ...portalRoleUserLists.flat(),
    ])
  ).filter((id) => Number.isInteger(id) && id > 0);
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

const notifyHrPortalUsers = async ({
  actorUserId = null,
  excludeUserIds = [],
  title,
  message,
  category = 'general',
  referenceModule = null,
  referenceId = null,
}) => {
  const recipients = await getHrPortalUserIds();
  if (recipients.length === 0) {
    return [];
  }

  const exclusionSet = new Set(
    (Array.isArray(excludeUserIds) ? excludeUserIds : [excludeUserIds])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );

  const filteredRecipients = recipients.filter((id) => !exclusionSet.has(id));
  if (filteredRecipients.length === 0) {
    return [];
  }

  return await createNotificationsForUsers({
    recipientUserIds: filteredRecipients,
    actorUserId,
    title,
    message,
    category,
    referenceModule,
    referenceId,
  });
};

export const notifyHrUsersBudgetStatus = async ({
  actorUserId = null,
  statusCode,
  statusLabel,
  utilizationPercent = null,
  remainingBudget = null,
  cooldownMinutes = 120,
}) => {
  try {
    const normalizedStatusCode = String(statusCode || '').trim().toLowerCase();
    if (!normalizedStatusCode || !['near_limit', 'over_budget'].includes(normalizedStatusCode)) {
      return [];
    }

    const referenceId = `staff_salaries_budget_status:${normalizedStatusCode}`;
    const guardKey = `budget_alert:payroll:${referenceId}`;

    return await withNotificationGuard(guardKey, async () => {
      await ensureNotificationsTable();

      const threshold = new Date(Date.now() - (Number(cooldownMinutes) || 120) * 60 * 1000);

      const recent = await db.getOne(
        `SELECT notification_id
         FROM user_notifications
         WHERE category = ?
           AND reference_module = ?
           AND reference_id = ?
           AND created_at >= ?
         ORDER BY created_at DESC
         LIMIT 1`,
        ['budget_alert', 'payroll', referenceId, threshold]
      );

      if (recent?.notification_id) {
        return [];
      }

      const utilizationText = utilizationPercent == null
        ? 'N/A'
        : `${Number(utilizationPercent).toFixed(2)}%`;

      const remainingText = remainingBudget == null
        ? 'N/A'
        : `₱${Number(remainingBudget).toFixed(2)}`;

      return await notifyHrPortalUsers({
        actorUserId,
        title: `Staff Salaries Budget Status: ${statusLabel}`,
        message: `Current utilization is ${utilizationText}. Remaining budget is ${remainingText}. Please review staffing and budget actions.`,
        category: 'budget_alert',
        referenceModule: 'payroll',
        referenceId,
      });
    });
  } catch (error) {
    logger.error('notifyHrUsersBudgetStatus failed:', error);
    return [];
  }
};

export const notifyHrUsersBudgetRequestStatusChange = async ({
  actorUserId = null,
  referenceId = null,
  requestTitle,
  requestedAmount = null,
  status,
  previousStatus = null,
  departmentName = null,
}) => {
  try {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    if (!normalizedStatus) {
      return [];
    }

    const normalizedPreviousStatus = String(previousStatus || '').trim().toLowerCase();
    const changeLabel = normalizedPreviousStatus && normalizedPreviousStatus !== normalizedStatus
      ? `${normalizedPreviousStatus} → ${normalizedStatus}`
      : normalizedStatus;

    const amountText = requestedAmount == null
      ? 'N/A'
      : `₱${Number(requestedAmount).toFixed(2)}`;

    const title = `Budget request ${normalizedStatus}`;
    const message = [
      `Budget request${requestTitle ? ` "${requestTitle}"` : ''} changed to ${changeLabel}.`,
      departmentName ? `Department: ${departmentName}.` : null,
      `Amount: ${amountText}.`,
    ].filter(Boolean).join(' ');

    return await notifyHrPortalUsers({
      actorUserId,
      title,
      message,
      category: 'budget_request_status',
      referenceModule: 'payroll',
      referenceId: referenceId != null ? String(referenceId) : null,
    });
  } catch (error) {
    logger.error('notifyHrUsersBudgetRequestStatusChange failed:', error);
    return [];
  }
};

export const notifyHrUsersBudgetAmountChange = async ({
  actorUserId = null,
  referenceId = null,
  previousAmount = null,
  currentAmount = null,
  budgetLabel = 'HR Budget',
}) => {
  try {
    const previous = Number(previousAmount);
    const current = Number(currentAmount);
    if (!Number.isFinite(previous) || !Number.isFinite(current) || previous === current) {
      return [];
    }

    const direction = current > previous ? 'increased' : 'decreased';
    const delta = Math.abs(current - previous);
    const title = `${budgetLabel} ${direction}`;
    const message = `${budgetLabel} changed from ₱${previous.toFixed(2)} to ₱${current.toFixed(2)} (${direction} by ₱${delta.toFixed(2)}).`;

    return await notifyHrPortalUsers({
      actorUserId,
      title,
      message,
      category: 'budget_change',
      referenceModule: 'payroll',
      referenceId: referenceId != null ? String(referenceId) : null,
    });
  } catch (error) {
    logger.error('notifyHrUsersBudgetAmountChange failed:', error);
    return [];
  }
};

export const notifyLeaveAttendanceOfficers = async ({
  actorUserId = null,
  excludeUserIds = [],
  title,
  message,
  category = 'general',
  referenceModule = null,
  referenceId = null,
}) => {
  try {
    const officerUserIds = await getUserIdsByRoleKey('leave_attendance_officer');
    if (officerUserIds.length === 0) {
      return [];
    }

    const exclusionSet = new Set(
      (Array.isArray(excludeUserIds) ? excludeUserIds : [excludeUserIds])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    );

    const recipients = officerUserIds.filter((id) => !exclusionSet.has(id));
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
    logger.error('notifyLeaveAttendanceOfficers failed:', error);
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

  const normalizedUserId = Number(userId);
  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    return [];
  }

  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const params = [normalizedUserId];

  let where = 'recipient_user_id = ?';
  if (status === 'read' || status === 'unread') {
    where += ' AND status = ?';
    params.push(status);
  }

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
     LIMIT ${normalizedLimit}`,
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
