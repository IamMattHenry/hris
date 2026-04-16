#!/usr/bin/env node

/**
 * Employee Creation Script
 *
 * Creates a full employee record (user account + employee profile) and sends
 * an account-creation email to the employee.
 *
 * Usage:
 *   node scripts/create-employee.js \
 *     --first-name John \
 *     --last-name Doe \
 *     --email john.doe@example.com \
 *     --username johndoe \
 *     --password Secret123 \
 *     --department "Human Resources" \
 *     --position "HR Specialist"
 *
 * All flags:
 *   Required:
 *     --first-name     Employee first name
 *     --last-name      Employee last name
 *     --email          Employee email (used for login link + account email)
 *     --username       Login username
 *     --password       Login password (plain-text; will be hashed)
 *
 *   Optional:
 *     --middle-name    Employee middle name
 *     --department     Department name OR numeric department_id  (default: none)
 *     --position       Position name OR numeric position_id      (default: none)
 *     --role           User role: employee | admin | supervisor  (default: employee)
 *     --hire-date      YYYY-MM-DD                                (default: today)
 *     --monthly-salary Monthly salary for budget projection       (default: position default or 0)
 *     --hourly-salary  Hourly salary for budget projection        (default: position default or 0)
 *     --work-type      full-time | part-time                     (default: full-time)
 *     --scheduled-days Comma-separated weekdays                  (default: monday,tuesday,wednesday,thursday,friday)
 *     --start-time     HH:MM or HH:MM:SS                        (default: 08:00:00)
 *     --end-time       HH:MM or HH:MM:SS                        (default: 17:00:00)
 *     --dry-run        Print what would be done without writing to DB or sending email
 */

import bcryptjs from 'bcryptjs';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Helper: parse --flag value pairs ──────────────────────────────────────
const args = process.argv.slice(2);
const params = {};

for (let i = 0; i < args.length; i++) {
  const token = args[i];
  if (token.startsWith('--')) {
    const key = token.slice(2);
    const next = args[i + 1];
    // boolean flag (no value) or value pair
    if (!next || next.startsWith('--')) {
      params[key] = true;
    } else {
      params[key] = next;
      i++;
    }
  }
}

const DRY_RUN = Boolean(params['dry-run']);

// ─── Required parameters ────────────────────────────────────────────────────
const REQUIRED = ['first-name', 'last-name', 'email', 'username', 'password'];
const missing = REQUIRED.filter((k) => !params[k]);

if (missing.length > 0) {
  console.error('❌  Missing required parameters: ' + missing.map((k) => `--${k}`).join(', '));
  console.error('');
  console.error('Usage:');
  console.error('  node scripts/create-employee.js \\');
  console.error('    --first-name John --last-name Doe \\');
  console.error('    --email john@example.com \\');
  console.error('    --username johndoe --password Secret123 \\');
  console.error('    --department "Human Resources" --position "HR Specialist"');
  console.error('');
  console.error('Optional: --middle-name --role --hire-date --work-type --dry-run');
  process.exit(1);
}

const VALID_ROLES = ['employee', 'admin', 'supervisor', 'superadmin'];
const role = (params['role'] || 'employee').toLowerCase();

if (!VALID_ROLES.includes(role)) {
  console.error(`❌  Invalid --role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}

const VALID_WORK_TYPES = ['full-time', 'part-time'];
const workType = (params['work-type'] || 'full-time').toLowerCase();

if (!VALID_WORK_TYPES.includes(workType)) {
  console.error(`❌  Invalid --work-type "${workType}". Must be: full-time | part-time`);
  process.exit(1);
}

// Work schedule — optional flags, sensible defaults
const ALL_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const rawDays = params['scheduled-days'];
let scheduledDays;
if (rawDays) {
  scheduledDays = rawDays.split(',').map((d) => d.trim().toLowerCase()).filter((d) => ALL_DAYS.includes(d));
  if (scheduledDays.length === 0) {
    console.error('❌  --scheduled-days must be a comma-separated list of weekday names, e.g. "monday,tuesday,wednesday,thursday,friday"');
    process.exit(1);
  }
} else {
  // Default: Monday–Friday for full-time, Monday–Friday for part-time as well
  scheduledDays = ['monday','tuesday','wednesday','thursday','friday'];
}

const VALID_TIME = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const normalizeTime = (t, fallback) => {
  if (!t) return fallback;
  const m = t.trim().match(VALID_TIME);
  if (!m) {
    console.error(`❌  Invalid time format "${t}". Expected HH:MM or HH:MM:SS`);
    process.exit(1);
  }
  return `${m[1]}:${m[2]}:${m[3] ?? '00'}`;
};

const scheduledStartTime = normalizeTime(params['start-time'], '08:00:00');
const scheduledEndTime   = normalizeTime(params['end-time'],   '17:00:00');

// Validate end > start
const toSec = (ts) => { const [h,m,s] = ts.split(':').map(Number); return h*3600+m*60+(s||0); };
if (toSec(scheduledEndTime) <= toSec(scheduledStartTime)) {
  console.error('❌  --end-time must be after --start-time');
  process.exit(1);
}

const firstName  = params['first-name'].trim();
const lastName   = params['last-name'].trim();
const middleName = params['middle-name'] ? params['middle-name'].trim() : null;
const email      = params['email'].trim().toLowerCase();
const username   = params['username'].trim();
const password   = params['password'];
const hireDate   = params['hire-date'] || new Date().toISOString().split('T')[0];
const deptParam  = params['department'] || null;
const posParam   = params['position']   || null;

// ─── Code generator (mirrors backend/src/utils/codeGenerator.js) ────────────
const generateCode = (prefix, id) => `${prefix}-${String(id).padStart(4, '0')}`;
const generateEmployeeCode = (id) => generateCode('EMP', id);

const STAFF_SALARIES_BUDGET_NAME = 'Staff Salaries';
const HRIS_DEPARTMENT_ID = 1;
const DEFAULT_MONTHLY_WORK_DAYS = 22;
const FULL_DAY_HOURS = 8;

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const normalizeSalaryUnit = (value) => String(value || '').trim().toLowerCase() === 'hourly' ? 'hourly' : 'monthly';

const hasMonthlySalaryFlag = Object.prototype.hasOwnProperty.call(params, 'monthly-salary');
const hasHourlySalaryFlag = Object.prototype.hasOwnProperty.call(params, 'hourly-salary');

if (hasMonthlySalaryFlag && hasHourlySalaryFlag) {
  console.error('❌  Use either --monthly-salary or --hourly-salary, not both.');
  process.exit(1);
}

let providedSalaryAmount = null;
let providedSalaryUnit = null;

if (hasMonthlySalaryFlag) {
  const rawMonthlySalary = params['monthly-salary'];
  if (rawMonthlySalary === true || rawMonthlySalary == null || String(rawMonthlySalary).trim() === '') {
    console.error('❌  --monthly-salary requires a numeric value, e.g. --monthly-salary 25000');
    process.exit(1);
  }

  const parsedMonthlySalary = Number(rawMonthlySalary);
  if (!Number.isFinite(parsedMonthlySalary) || parsedMonthlySalary < 0) {
    console.error('❌  --monthly-salary must be a non-negative number.');
    process.exit(1);
  }

  providedSalaryAmount = round2(parsedMonthlySalary);
  providedSalaryUnit = 'monthly';
}

if (hasHourlySalaryFlag) {
  const rawHourlySalary = params['hourly-salary'];
  if (rawHourlySalary === true || rawHourlySalary == null || String(rawHourlySalary).trim() === '') {
    console.error('❌  --hourly-salary requires a numeric value, e.g. --hourly-salary 150');
    process.exit(1);
  }

  const parsedHourlySalary = Number(rawHourlySalary);
  if (!Number.isFinite(parsedHourlySalary) || parsedHourlySalary < 0) {
    console.error('❌  --hourly-salary must be a non-negative number.');
    process.exit(1);
  }

  providedSalaryAmount = round2(parsedHourlySalary);
  providedSalaryUnit = 'hourly';
}

const toMonthlyEquivalentCompensation = ({ amount, salaryUnit }) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 0) return null;

  const normalizedUnit = String(salaryUnit || '').trim().toLowerCase() === 'hourly' ? 'hourly' : 'monthly';
  if (normalizedUnit === 'hourly') {
    return round2(numericAmount * FULL_DAY_HOURS * DEFAULT_MONTHLY_WORK_DAYS);
  }

  return round2(numericAmount);
};

const formatCurrency = (value) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return '₱0.00';

  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(normalized);
  } catch {
    return `₱${normalized.toFixed(2)}`;
  }
};

async function validateStaffSalariesBudget(connection, projectedMonthlySalary = 0) {
  const normalizedProjectedMonthlySalary = Number(projectedMonthlySalary);
  if (!Number.isFinite(normalizedProjectedMonthlySalary) || normalizedProjectedMonthlySalary < 0) {
    throw new Error('Projected monthly salary is invalid. Please provide a non-negative number.');
  }

  const [budgetRows] = await connection.execute(
    `SELECT
       bd.department_budget_id,
       bd.department_id,
       bd.budget_id,
       bd.allocated_amount,
       b.budget_name
     FROM budget_department bd
     LEFT JOIN budget b ON b.budget_id = bd.budget_id
     WHERE bd.department_id = ?
       AND bd.is_active = 1
     ORDER BY bd.department_budget_id DESC
     LIMIT 1`,
    [HRIS_DEPARTMENT_ID]
  );

  if (budgetRows.length === 0) {
    throw new Error(
      `No active budget record found in budget_department for HRIS (department_id: ${HRIS_DEPARTMENT_ID}). Please ask Finance to configure it first.`
    );
  }

  const latestBudget = budgetRows[0];
  const budgetAmount = Number(latestBudget.allocated_amount);
  if (!Number.isFinite(budgetAmount) || budgetAmount < 0) {
    throw new Error(
      `HRIS budget has an invalid amount in budget_department.allocated_amount.`
    );
  }

  const [salaryRows] = await connection.execute(
    `SELECT current_salary, salary_unit
     FROM employees
     WHERE status IN ('active', 'on-leave')`
  );

  const currentStaffMonthlyTotal = round2(
    salaryRows.reduce((sum, row) => {
      const monthlyEquivalent = toMonthlyEquivalentCompensation({
        amount: row.current_salary,
        salaryUnit: row.salary_unit,
      });
      return sum + (monthlyEquivalent || 0);
    }, 0)
  );

  const projectedStaffMonthlyTotal = round2(currentStaffMonthlyTotal + normalizedProjectedMonthlySalary);

  if (projectedStaffMonthlyTotal > budgetAmount) {
    throw new Error(
      `Projected total staff salaries (${formatCurrency(projectedStaffMonthlyTotal)}) exceeds latest '${STAFF_SALARIES_BUDGET_NAME}' budget (${formatCurrency(budgetAmount)}).`
    );
  }

  return {
    budgetName: latestBudget.budget_name,
    budgetAmount: round2(budgetAmount),
    currentStaffMonthlyTotal,
    projectedNewEmployeeMonthlySalary: round2(normalizedProjectedMonthlySalary),
    projectedStaffMonthlyTotal,
  };
}

// ─── Email sender ────────────────────────────────────────────────────────────
async function sendAccountEmail({ to, name, username, password }) {
  const {
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE, SMTP_FROM,
    FRONTEND_URL,
  } = process.env;

  const loginUrl = `${(FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/login_employee`;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    console.warn('⚠️   SMTP not configured — skipping email. Credentials below:');
    console.warn(`     To:       ${to}`);
    console.warn(`     Username: ${username}`);
    console.warn(`     Password: ${password}`);
    console.warn(`     Login:    ${loginUrl}`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  const html = `
    <p>Hi ${name},</p>
    <p>Your HRIS account has been created. Use the credentials below to log in.</p>
    <table style="border-collapse:collapse;margin:12px 0;">
      <tr>
        <td style="padding:4px 12px 4px 0;font-weight:bold;">Username</td>
        <td style="padding:4px 0;font-family:monospace;">${username}</td>
      </tr>
      <tr>
        <td style="padding:4px 12px 4px 0;font-weight:bold;">Password</td>
        <td style="padding:4px 0;font-family:monospace;">${password}</td>
      </tr>
    </table>
    <p>
      <a href="${loginUrl}"
         style="background:#4b0b14;color:#fff;padding:8px 14px;text-decoration:none;border-radius:4px;">
        Log in to HRIS
      </a>
    </p>
    <p style="color:#666;font-size:12px;">
      If you did not expect this email, please contact your administrator.
    </p>
    <p>Regards,<br/>HRIS Support Team</p>
  `;

  await transport.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject: 'Your HRIS account has been created',
    text:
      `Hi ${name},\n\n` +
      `Your HRIS account has been created.\n` +
      `Username: ${username}\nPassword: ${password}\n` +
      `Login: ${loginUrl}\n\n` +
      `Regards,\nHRIS Support Team`,
    html,
  });

  console.log(`📧  Account email sent to ${to}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('=== HRIS Employee Creator ===');
  if (DRY_RUN) console.log('🔍  DRY RUN — no changes will be written\n');

  let connection;
  try {
    connection = await mysql.createConnection({
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port:     process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    });
    console.log('✅  Connected to database');

    // ── Resolve department ──────────────────────────────────────────────────
    let departmentId   = null;
    let departmentName = null;

    if (deptParam) {
      if (/^\d+$/.test(deptParam)) {
        const [rows] = await connection.execute(
          'SELECT department_id, department_name FROM departments WHERE department_id = ?',
          [deptParam]
        );
        if (rows.length === 0) {
          console.error(`❌  No department found with ID ${deptParam}`);
          process.exit(1);
        }
        departmentId   = rows[0].department_id;
        departmentName = rows[0].department_name;
      } else {
        const [rows] = await connection.execute(
          'SELECT department_id, department_name FROM departments WHERE LOWER(department_name) = LOWER(?)',
          [deptParam]
        );
        if (rows.length === 0) {
          // Show available departments to help the user
          const [all] = await connection.execute('SELECT department_id, department_name FROM departments ORDER BY department_id');
          console.error(`❌  No department found matching "${deptParam}"`);
          console.error('    Available departments:');
          all.forEach((d) => console.error(`      [${d.department_id}] ${d.department_name}`));
          process.exit(1);
        }
        departmentId   = rows[0].department_id;
        departmentName = rows[0].department_name;
      }
      console.log(`🏢  Department : [${departmentId}] ${departmentName}`);
    }

    // ── Resolve position ────────────────────────────────────────────────────
    let positionId   = null;
    let positionName = null;
    let positionDefaultSalary = null;
    let positionSalaryUnit = null;

    if (posParam) {
      if (/^\d+$/.test(posParam)) {
        const [rows] = await connection.execute(
          'SELECT position_id, position_name, default_salary, salary_unit FROM job_positions WHERE position_id = ?',
          [posParam]
        );
        if (rows.length === 0) {
          console.error(`❌  No position found with ID ${posParam}`);
          process.exit(1);
        }
        positionId   = rows[0].position_id;
        positionName = rows[0].position_name;
        positionDefaultSalary = rows[0].default_salary;
        positionSalaryUnit = rows[0].salary_unit;
      } else {
        const [rows] = await connection.execute(
          'SELECT position_id, position_name, default_salary, salary_unit FROM job_positions WHERE LOWER(position_name) = LOWER(?)',
          [posParam]
        );
        if (rows.length === 0) {
          // Show available positions (optionally filtered by department)
          const [all] = await connection.execute(
            'SELECT position_id, position_name FROM job_positions ORDER BY position_id'
          );
          console.error(`❌  No position found matching "${posParam}"`);
          console.error('    Available positions:');
          all.forEach((p) => console.error(`      [${p.position_id}] ${p.position_name}`));
          process.exit(1);
        }
        positionId   = rows[0].position_id;
        positionName = rows[0].position_name;
        positionDefaultSalary = rows[0].default_salary;
        positionSalaryUnit = rows[0].salary_unit;
      }
      console.log(`💼  Position   : [${positionId}] ${positionName}`);
    }

    let projectedSalarySource = 'defaulted to 0 (no salary input and no position default)';
    let projectedNewEmployeeMonthlySalary = 0;

    if (providedSalaryAmount != null && providedSalaryUnit) {
      projectedNewEmployeeMonthlySalary = toMonthlyEquivalentCompensation({
        amount: providedSalaryAmount,
        salaryUnit: providedSalaryUnit,
      });
      projectedSalarySource = `from --${providedSalaryUnit === 'hourly' ? 'hourly-salary' : 'monthly-salary'}`;
    } else {
      const numericPositionSalary = Number(positionDefaultSalary);
      if (Number.isFinite(numericPositionSalary) && numericPositionSalary >= 0) {
        const normalizedPositionSalaryUnit = normalizeSalaryUnit(positionSalaryUnit);
        projectedNewEmployeeMonthlySalary = toMonthlyEquivalentCompensation({
          amount: numericPositionSalary,
          salaryUnit: normalizedPositionSalaryUnit,
        });
        projectedSalarySource = `from position default_salary (${formatCurrency(numericPositionSalary)} ${normalizedPositionSalaryUnit})`;
      }
    }

    if (projectedNewEmployeeMonthlySalary == null) {
      console.error('❌  Salary for budget projection is invalid.');
      process.exit(1);
    }

    // ── Check username uniqueness ───────────────────────────────────────────
    const [existingUser] = await connection.execute(
      'SELECT user_id FROM users WHERE username = ?',
      [username]
    );
    if (existingUser.length > 0) {
      console.error(`❌  Username "${username}" is already taken.`);
      process.exit(1);
    }

    // ── Check email uniqueness ──────────────────────────────────────────────
    const [existingEmail] = await connection.execute(
      'SELECT employee_id FROM employee_emails WHERE LOWER(email) = ?',
      [email]
    );
    if (existingEmail.length > 0) {
      console.error(`❌  Email "${email}" is already registered to another employee.`);
      process.exit(1);
    }

    // ── Validate finance budget before any writes ─────────────────────────
    try {
      const budgetCheck = await validateStaffSalariesBudget(
        connection,
        projectedNewEmployeeMonthlySalary
      );
      console.log(
        `💰  Budget check: ${budgetCheck.budgetName} ${formatCurrency(budgetCheck.currentStaffMonthlyTotal)} + ${formatCurrency(budgetCheck.projectedNewEmployeeMonthlySalary)} = ${formatCurrency(budgetCheck.projectedStaffMonthlyTotal)} / ${formatCurrency(budgetCheck.budgetAmount)}`
      );
      console.log(`💡  Projection source: ${projectedSalarySource}`);
    } catch (budgetError) {
      console.error(`❌  Budget validation failed: ${budgetError.message}`);
      process.exit(1);
    }

    // ── Summary before writing ──────────────────────────────────────────────
    console.log('');
    console.log('Employee to be created:');
    console.log(`  Name     : ${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`);
    console.log(`  Email    : ${email}`);
    console.log(`  Username : ${username}`);
    console.log(`  Role     : ${role}`);
    console.log(`  Work type: ${workType}`);
    console.log(`  Hire date: ${hireDate}`);
    console.log(`  Salary for projection (monthly eq): ${formatCurrency(projectedNewEmployeeMonthlySalary)} (${projectedSalarySource})`);
    if (departmentId) console.log(`  Dept     : [${departmentId}] ${departmentName}`);
    if (positionId)   console.log(`  Position : [${positionId}] ${positionName}`);
    console.log(`  Schedule : ${scheduledDays.join(', ')}  ${scheduledStartTime} – ${scheduledEndTime}`);
    console.log('');

    if (DRY_RUN) {
      console.log('✅  Dry-run complete. No records written.');
      await connection.end();
      return;
    }

    // ── Hash password ───────────────────────────────────────────────────────
    console.log('🔐  Hashing password...');
    const hashedPassword = await bcryptjs.hash(password, 10);

    // ── Insert user ─────────────────────────────────────────────────────────
    const [userResult] = await connection.execute(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );
    const userId = userResult.insertId;
    console.log(`👤  User created       (user_id=${userId})`);

    // ── Insert employee (without code first) ────────────────────────────────
    const [empResult] = await connection.execute(
      `INSERT INTO employees
         (user_id, first_name, last_name, middle_name, position_id, department_id,
          hire_date, status, work_type, employment_type,
          scheduled_days, scheduled_start_time, scheduled_end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, 'probationary', ?, ?, ?)`,
      [
        userId, firstName, lastName, middleName, positionId, departmentId, hireDate, workType,
        JSON.stringify(scheduledDays), scheduledStartTime, scheduledEndTime,
      ]
    );
    const employeeId   = empResult.insertId;
    const employeeCode = generateEmployeeCode(employeeId);

    // ── Set employee_code ───────────────────────────────────────────────────
    await connection.execute(
      'UPDATE employees SET employee_code = ? WHERE employee_id = ?',
      [employeeCode, employeeId]
    );
    console.log(`👨‍💼  Employee created   (employee_id=${employeeId}, code=${employeeCode})`);

    // ── Save email ──────────────────────────────────────────────────────────
    await connection.execute(
      'INSERT INTO employee_emails (employee_id, email) VALUES (?, ?)',
      [employeeId, email]
    );
    console.log(`📩  Email saved        (${email})`);

    // ── Auto-assign RBAC role for HR department employees ───────────────────
    // Maps position name (lowercase) → RBAC role_key
    const HR_POSITION_ROLE_MAP = {
      'hr manager':                    'hr_manager',
      'leave and attendance officer':  'leave_attendance_officer',
      'recruitment officer':           'recruitment_officer',
      'hr supervisor':                 'hr_supervisor',
      'payroll officer':               'payroll_officer',
    };

    const normalizePositionName = (value) =>
      String(value || '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const isHrDept = departmentName &&
      (departmentName.toLowerCase().includes('human resource') ||
       departmentName.toLowerCase() === 'hr');

    if (isHrDept && positionName) {
      const posKey     = normalizePositionName(positionName);
      const rbacRoleKey = HR_POSITION_ROLE_MAP[posKey];

      if (rbacRoleKey) {
        try {
          const [roleRows] = await connection.execute(
            'SELECT role_id FROM roles WHERE role_key = ?',
            [rbacRoleKey]
          );
          if (roleRows.length > 0) {
            await connection.execute(
              'INSERT IGNORE INTO user_role_assignments (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
              [userId, roleRows[0].role_id, userId]
            );
            console.log(`🔑  RBAC role assigned  (${rbacRoleKey})`);
          } else {
            console.warn(`⚠️   RBAC role '${rbacRoleKey}' not found — run migration 002 first`);
          }
        } catch (rbacErr) {
          console.warn(`⚠️   Could not assign RBAC role: ${rbacErr.message}`);
        }
      } else {
        console.log(`ℹ️   HR dept but no role mapping for position "${positionName}" — assign manually if needed`);
      }
    }

    // ── Activity log ────────────────────────────────────────────────────────
    try {
      await connection.execute(
        `INSERT INTO activity_logs (user_id, action, module, description, created_by)
         VALUES (?, 'CREATE', 'employees', ?, ?)`,
        [
          userId,
          `Script: Created employee ${firstName} ${lastName} (${employeeCode}) with role: ${role}`,
          userId,
        ]
      );
    } catch (_) {
      // Non-fatal — activity log table may not exist in all environments
    }

    await connection.end();

    // ── Send email ──────────────────────────────────────────────────────────
    await sendAccountEmail({
      to:       email,
      name:     `${firstName} ${lastName}`,
      username,
      password,
    });

    // ── Done ────────────────────────────────────────────────────────────────
    console.log('');
    console.log('✨  Employee created successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  Employee Code : ${employeeCode}`);
    console.log(`  Employee ID   : ${employeeId}`);
    console.log(`  User ID       : ${userId}`);
    console.log(`  Username      : ${username}`);
    console.log(`  Role          : ${role}`);
    console.log(`  Email         : ${email}`);
    console.log('');

  } catch (error) {
    console.error('❌  Unexpected error:', error.message);
    if (connection) await connection.end().catch(() => {});
    process.exit(1);
  }
}

main();
