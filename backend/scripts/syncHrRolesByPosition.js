import * as db from '../src/config/db.js';

const POSITION_TO_RBAC_ROLE = {
  'hr manager': 'hr_manager',
  'leave and attendance officer': 'leave_attendance_officer',
  'recruitment officer': 'recruitment_officer',
  'hr supervisor': 'hr_supervisor',
};

const normalizePositionName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function syncHrRolesByPosition() {
  const roleKeys = Object.values(POSITION_TO_RBAC_ROLE);

  const roleRows = await db.getAll(
    `SELECT role_id, role_key FROM roles WHERE role_key IN (${roleKeys.map(() => '?').join(', ')})`,
    roleKeys
  );

  if (!roleRows.length) {
    console.log('No target HR RBAC roles found. Nothing to sync.');
    return;
  }

  const roleIdByKey = new Map(roleRows.map((row) => [row.role_key, row.role_id]));
  const managedRoleIds = roleRows.map((row) => row.role_id);

  const employees = await db.getAll(
    `SELECT e.user_id, e.department_id, jp.position_name
     FROM employees e
     LEFT JOIN job_positions jp ON e.position_id = jp.position_id
     WHERE e.user_id IS NOT NULL`
  );

  await db.beginTransaction();
  try {
    await db.transactionQuery(
      `DELETE FROM user_role_assignments WHERE role_id IN (${managedRoleIds.map(() => '?').join(', ')})`,
      managedRoleIds
    );

    let assignedCount = 0;
    for (const employee of employees) {
      if (Number(employee.department_id) !== 1) continue;

      const normalizedPosition = normalizePositionName(employee.position_name);
      const roleKey = POSITION_TO_RBAC_ROLE[normalizedPosition];
      if (!roleKey) continue;

      const roleId = roleIdByKey.get(roleKey);
      if (!roleId) continue;

      await db.transactionQuery(
        `INSERT IGNORE INTO user_role_assignments (user_id, role_id, assigned_by)
         VALUES (?, ?, NULL)`,
        [employee.user_id, roleId]
      );
      assignedCount += 1;
    }

    await db.commit();
    console.log(`HR RBAC role sync complete. Assigned ${assignedCount} role mappings.`);
  } catch (error) {
    await db.rollback();
    throw error;
  }
}

syncHrRolesByPosition()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to sync HR RBAC roles:', error);
    process.exit(1);
  });
