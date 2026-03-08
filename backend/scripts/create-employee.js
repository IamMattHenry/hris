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

    if (posParam) {
      if (/^\d+$/.test(posParam)) {
        const [rows] = await connection.execute(
          'SELECT position_id, position_name FROM job_positions WHERE position_id = ?',
          [posParam]
        );
        if (rows.length === 0) {
          console.error(`❌  No position found with ID ${posParam}`);
          process.exit(1);
        }
        positionId   = rows[0].position_id;
        positionName = rows[0].position_name;
      } else {
        const [rows] = await connection.execute(
          'SELECT position_id, position_name FROM job_positions WHERE LOWER(position_name) = LOWER(?)',
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
      }
      console.log(`💼  Position   : [${positionId}] ${positionName}`);
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

    // ── Summary before writing ──────────────────────────────────────────────
    console.log('');
    console.log('Employee to be created:');
    console.log(`  Name     : ${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`);
    console.log(`  Email    : ${email}`);
    console.log(`  Username : ${username}`);
    console.log(`  Role     : ${role}`);
    console.log(`  Work type: ${workType}`);
    console.log(`  Hire date: ${hireDate}`);
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
