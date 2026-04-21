#!/usr/bin/env node

import bcryptjs from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const params = {};
for (let i = 0; i < args.length; i++) {
  const token = args[i];
  if (!token.startsWith('--')) continue;
  const key = token.slice(2);
  const next = args[i + 1];
  if (!next || next.startsWith('--')) {
    params[key] = true;
  } else {
    params[key] = next;
    i += 1;
  }
}

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const LEGACY_ROLE_BY_RBAC_ROLE = {
  hr_manager: 'admin',
  hr_supervisor: 'supervisor',
  payroll_officer: 'employee',
  leave_attendance_officer: 'employee',
  recruitment_officer: 'employee',
};

const ROLE_PROFILE = {
  hr_manager: {
    first_name: 'HR',
    last_name: 'Manager',
    position_aliases: ['hr manager'],
  },
  hr_supervisor: {
    first_name: 'HR',
    last_name: 'Supervisor',
    position_aliases: ['hr supervisor'],
  },
  payroll_officer: {
    first_name: 'Payroll',
    last_name: 'Officer',
    position_aliases: ['payroll officer', 'payroll manager'],
  },
  leave_attendance_officer: {
    first_name: 'Leave',
    last_name: 'Officer',
    position_aliases: ['leave and attendance officer'],
  },
  recruitment_officer: {
    first_name: 'Recruitment',
    last_name: 'Officer',
    position_aliases: ['recruitment officer'],
  },
};

const TARGET_HR_ROLE_KEYS = Object.keys(ROLE_PROFILE);

const HELP_TEXT = `
Create HR Manager and HR employee users aligned with current RBAC roles in DB.

Usage:
  node scripts/create-hr-role-users.js --password <defaultPassword> [options]

Options:
  --password <text>        Default password used for newly created users (required)
  --username-prefix <text> Username prefix (default: seed_)
  --email-domain <text>    Email domain for generated emails (default: example.local)
  --department-id <id>     Force department_id for created employees
  --hire-date <YYYY-MM-DD> Hire date (default: today)
  --dry-run                Preview actions without writing to DB
  --help                   Show this help text

Examples:
  node scripts/create-hr-role-users.js --password ChangeMe123!
  node scripts/create-hr-role-users.js --password ChangeMe123! --username-prefix hris_ --email-domain company.local
`;

if (params.help) {
  console.log(HELP_TEXT.trim());
  process.exit(0);
}

if (!params.password) {
  console.error('❌ Missing required --password');
  console.error(HELP_TEXT.trim());
  process.exit(1);
}

const DRY_RUN = Boolean(params['dry-run']);
const usernamePrefix = String(params['username-prefix'] || 'seed_');
const emailDomain = String(params['email-domain'] || 'example.local').replace(/^@/, '');
const hireDate = params['hire-date'] || new Date().toISOString().split('T')[0];
const forcedDepartmentId = params['department-id'] ? Number(params['department-id']) : null;

if (params['department-id'] && !Number.isInteger(forcedDepartmentId)) {
  console.error('❌ --department-id must be a valid integer');
  process.exit(1);
}

function toEmployeeCode(employeeId) {
  return `EMP-${String(employeeId).padStart(4, '0')}`;
}

async function resolveDepartment(connection) {
  if (forcedDepartmentId) {
    const [rows] = await connection.execute(
      'SELECT department_id, department_name FROM departments WHERE department_id = ?',
      [forcedDepartmentId]
    );
    if (!rows.length) {
      throw new Error(`Department ${forcedDepartmentId} not found`);
    }
    return rows[0];
  }

  const [rows] = await connection.execute(
    `SELECT department_id, department_name
     FROM departments
     WHERE LOWER(department_name) LIKE '%human resource%'
        OR LOWER(department_name) = 'hr'
        OR LOWER(department_name) = 'human resources'
     ORDER BY department_id
     LIMIT 1`
  );

  return rows[0] || null;
}

async function getPositionIdByRole(connection, roleKey) {
  const profile = ROLE_PROFILE[roleKey];
  if (!profile?.position_aliases?.length) return null;

  const [rows] = await connection.execute('SELECT position_id, position_name FROM job_positions');
  const byNormalized = new Map(rows.map((row) => [normalizeText(row.position_name), row.position_id]));

  for (const alias of profile.position_aliases) {
    const match = byNormalized.get(normalizeText(alias));
    if (match) return match;
  }

  return null;
}

async function ensureRoleAssignment(connection, userId, roleId) {
  await connection.execute(
    `INSERT IGNORE INTO user_role_assignments (user_id, role_id, assigned_by)
     VALUES (?, ?, NULL)`,
    [userId, roleId]
  );
}

async function createOrGetEmployee(connection, {
  userId,
  roleKey,
  username,
  departmentId,
  positionId,
}) {
  const [existing] = await connection.execute(
    'SELECT employee_id FROM employees WHERE user_id = ? LIMIT 1',
    [userId]
  );

  if (existing.length) {
    return { employeeId: existing[0].employee_id, created: false };
  }

  const profile = ROLE_PROFILE[roleKey] || {
    first_name: 'HR',
    last_name: 'Employee',
  };

  const [insertEmployee] = await connection.execute(
    `INSERT INTO employees
      (user_id, first_name, last_name, middle_name, position_id, department_id,
       hire_date, status, work_type, employment_type,
       scheduled_days, scheduled_start_time, scheduled_end_time)
     VALUES (?, ?, ?, NULL, ?, ?, ?, 'active', 'full-time', 'probationary', ?, '08:00:00', '17:00:00')`,
    [
      userId,
      profile.first_name,
      profile.last_name,
      positionId,
      departmentId,
      hireDate,
      JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
    ]
  );

  const employeeId = insertEmployee.insertId;
  await connection.execute('UPDATE employees SET employee_code = ? WHERE employee_id = ?', [toEmployeeCode(employeeId), employeeId]);

  try {
    await connection.execute(
      'INSERT INTO employee_emails (employee_id, email) VALUES (?, ?)',
      [employeeId, `${username}@${emailDomain}`]
    );
  } catch {
    // Non-fatal: table or constraints may differ per environment.
  }

  return { employeeId, created: true };
}

async function run() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✅ Connected to database');

    const [roleRows] = await connection.execute(
      `SELECT role_id, role_key, role_name
       FROM roles
       WHERE role_key IN (${TARGET_HR_ROLE_KEYS.map(() => '?').join(', ')})
       ORDER BY role_key`,
      TARGET_HR_ROLE_KEYS
    );

    if (!roleRows.length) {
      console.log('⚠️  No target HR RBAC roles found in roles table. Nothing to create.');
      await connection.end();
      return;
    }

    const department = await resolveDepartment(connection);
    if (!department) {
      console.log('⚠️  HR department not found. Employees will be created without department_id.');
    } else {
      console.log(`🏢 Using department: [${department.department_id}] ${department.department_name}`);
    }

    console.log(`🔎 Roles found (${roleRows.length}): ${roleRows.map((r) => r.role_key).join(', ')}`);
    console.log(DRY_RUN ? '🧪 Dry-run mode enabled (no writes).' : '✍️  Applying changes...');

    const summary = [];

    for (const roleRow of roleRows) {
      const roleKey = roleRow.role_key;
      const username = `${usernamePrefix}${roleKey}`;
      const legacyRole = LEGACY_ROLE_BY_RBAC_ROLE[roleKey] || 'employee';
      const positionId = await getPositionIdByRole(connection, roleKey);

      const item = {
        role_key: roleKey,
        username,
        user_created: false,
        employee_created: false,
        role_assigned: false,
      };

      if (DRY_RUN) {
        summary.push({
          ...item,
          dry_run: true,
          legacy_role: legacyRole,
          department_id: department?.department_id ?? null,
          position_id: positionId,
        });
        continue;
      }

      await connection.beginTransaction();
      try {
        const [existingUsers] = await connection.execute(
          'SELECT user_id FROM users WHERE username = ? LIMIT 1',
          [username]
        );

        let userId;
        if (existingUsers.length) {
          userId = existingUsers[0].user_id;
        } else {
          const hashedPassword = await bcryptjs.hash(params.password, 10);
          const [userInsert] = await connection.execute(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, legacyRole]
          );
          userId = userInsert.insertId;
          item.user_created = true;
        }

        const employeeResult = await createOrGetEmployee(connection, {
          userId,
          roleKey,
          username,
          departmentId: department?.department_id ?? null,
          positionId,
        });
        item.employee_created = employeeResult.created;

        await ensureRoleAssignment(connection, userId, roleRow.role_id);
        item.role_assigned = true;

        await connection.commit();
      } catch (innerError) {
        await connection.rollback();
        throw innerError;
      }

      summary.push(item);
    }

    console.log('');
    console.table(summary);
    console.log('');
    console.log(DRY_RUN ? '✅ Dry-run completed.' : '✅ HR role user seeding completed.');

    await connection.end();
  } catch (error) {
    console.error('❌ Failed to create HR role users:', error.message);
    if (connection) {
      await connection.end().catch(() => {});
    }
    process.exit(1);
  }
}

run();
