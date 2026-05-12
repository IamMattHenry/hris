#!/usr/bin/env node

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildHolidayLookup, getHolidayForDate } from '../src/utils/holidayCalendar.js';
import { generateAttendanceCode } from '../src/utils/codeGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

const args = process.argv.slice(2);
const params = {};

for (let i = 0; i < args.length; i += 1) {
  const token = args[i];
  if (!token.startsWith('--')) {
    continue;
  }

  const key = token.slice(2);
  const next = args[i + 1];
  if (!next || next.startsWith('--')) {
    params[key] = true;
  } else {
    params[key] = next;
    i += 1;
  }
}

const pad = (value) => String(value).padStart(2, '0');
const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};
const parseDateKey = (value) => {
  if (!value || typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
};
const normalizeTime = (value) => {
  if (!value || typeof value !== 'string') return null;
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}:${match[3] ?? '00'}`;
};
const timeToMinutes = (value) => {
  const normalized = normalizeTime(value);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
};
const minutesToTime = (minutes) => {
  const safeMinutes = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  return `${pad(Math.floor(safeMinutes / 60))}:${pad(safeMinutes % 60)}:00`;
};
const buildTimestamp = (dateKey, minutes) => `${dateKey} ${minutesToTime(minutes)}`;

const getManilaNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
const defaultYear = getManilaNow().getFullYear();

const targetYear = Number(params.year || defaultYear);
if (!Number.isFinite(targetYear) || targetYear < 2000) {
  console.error('Invalid --year value.');
  process.exit(1);
}

const startDate = params['start-date'] ? String(params['start-date']) : `${targetYear}-04-01`;
const endDate = params['end-date'] ? String(params['end-date']) : `${targetYear}-05-11`;
const dryRun = Object.prototype.hasOwnProperty.call(params, 'dry-run')
  && !['false', '0'].includes(String(params['dry-run']).toLowerCase());
const overwrite = Object.prototype.hasOwnProperty.call(params, 'overwrite')
  && !['false', '0'].includes(String(params['overwrite']).toLowerCase());

if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
  console.error('Invalid date range. Use YYYY-MM-DD for --start-date and --end-date.');
  process.exit(1);
}

if (startDate > endDate) {
  console.error('--start-date must be on or before --end-date.');
  process.exit(1);
}

const buildDateRange = (start, end) => {
  const dates = [];
  const endDateObj = parseDateKey(end);
  for (let cursor = parseDateKey(start); cursor && endDateObj && cursor <= endDateObj; cursor = addDays(cursor, 1)) {
    dates.push(toDateKey(cursor));
  }
  return dates;
};

const parseScheduledDays = (value) => {
  const fallback = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  if (!value) return fallback;

  if (Array.isArray(value)) {
    const days = value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    return days.length > 0 ? days : fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const days = parsed.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
        return days.length > 0 ? days : fallback;
      }
    } catch {
      // fall through to comma-separated parsing
    }

    const days = trimmed
      .split(',')
      .map((item) => String(item).trim().toLowerCase())
      .filter(Boolean);
    return days.length > 0 ? days : fallback;
  }

  return fallback;
};

const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const isScheduledDay = (dateKey, scheduledDays) => {
  const date = parseDateKey(dateKey);
  if (!date) return false;
  const dayName = weekdayNames[date.getDay()];
  return scheduledDays.includes(dayName);
};

const createScenario = ({ shiftStartMinutes, shiftEndMinutes }) => {
  const random = Math.random();

  // Weighted mix: mostly regular workdays, with some absences.
  if (random < 0) {
    return {
      status: 'absent',
      timeIn: null,
      timeOut: null,
      overtimeHours: 0,
    };
  }

  const timeIn = shiftStartMinutes;
  const timeOut = shiftEndMinutes;

  return {
    status: 'present',
    timeIn,
    timeOut,
    overtimeHours: 0,
  };
};

const resolveSystemUserId = async (connection) => {
  if (params['created-by']) {
    const parsed = Number(params['created-by']);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const [rows] = await connection.execute(
    `SELECT user_id
     FROM users
     WHERE role IN ('superadmin', 'admin')
     ORDER BY FIELD(role, 'superadmin', 'admin'), user_id ASC
     LIMIT 1`
  );

  return rows?.[0]?.user_id ?? null;
};

const connectionOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'hris_db',
  timezone: '+08:00',
  dateStrings: true,
};

let connection;

try {
  connection = await mysql.createConnection(connectionOptions);
  const actingUserId = await resolveSystemUserId(connection);
  const dateRange = buildDateRange(startDate, endDate);
  const holidayLookup = buildHolidayLookup({ startDate, endDate });

  const [employeeRows] = await connection.execute(
    `SELECT employee_id, employee_code, first_name, last_name, hire_date, terminated_at, scheduled_days, scheduled_start_time, scheduled_end_time
     FROM employees`
  );

  const [attendanceRows] = await connection.execute(
    `SELECT attendance_id, attendance_code, employee_id, date, time_in, time_out, status, overtime_hours
     FROM attendance
     WHERE date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  const [leaveRows] = await connection.execute(
    `SELECT employee_id, start_date, end_date
     FROM leaves
     WHERE status = 'approved'
       AND start_date <= ?
       AND end_date >= ?`,
    [endDate, startDate]
  );

  const existingAttendance = new Map(
    attendanceRows.map((row) => [`${row.employee_id}:${row.date}`, row])
  );

  const leaveRanges = new Map();
  for (const row of leaveRows) {
    if (!leaveRanges.has(row.employee_id)) {
      leaveRanges.set(row.employee_id, []);
    }
    leaveRanges.get(row.employee_id).push({
      start: row.start_date,
      end: row.end_date,
    });
  }

  const stats = {
    employees: employeeRows.length,
    inserted: 0,
    updated: 0,
    skippedExisting: 0,
    skippedHoliday: 0,
    skippedLeave: 0,
    skippedOutsideEmployment: 0,
    skippedMissingShift: 0,
    skippedNonScheduled: 0,
  };

  for (const employee of employeeRows) {
    const scheduledDays = parseScheduledDays(employee.scheduled_days);
    const shiftStartMinutes = timeToMinutes(employee.scheduled_start_time);
    const shiftEndMinutes = timeToMinutes(employee.scheduled_end_time);

    if (shiftStartMinutes === null || shiftEndMinutes === null || shiftEndMinutes <= shiftStartMinutes) {
      stats.skippedMissingShift += dateRange.length;
      continue;
    }

    for (const dateKey of dateRange) {
      const hireDate = employee.hire_date || null;
      const terminatedAt = employee.terminated_at || null;

      if (hireDate && dateKey < hireDate) {
        stats.skippedOutsideEmployment += 1;
        continue;
      }

      if (terminatedAt && dateKey > terminatedAt.slice(0, 10)) {
        stats.skippedOutsideEmployment += 1;
        continue;
      }

      const isScheduled = isScheduledDay(dateKey, scheduledDays);
      if (!isScheduled && !overwrite) {
        stats.skippedNonScheduled += 1;
        continue;
      }

      const holiday = getHolidayForDate(dateKey, holidayLookup);

      const employeeLeaves = leaveRanges.get(employee.employee_id) || [];
      const onApprovedLeave = employeeLeaves.some(({ start, end }) => dateKey >= start && dateKey <= end);
      if (onApprovedLeave && !overwrite) {
        stats.skippedLeave += 1;
        continue;
      }

      const existing = existingAttendance.get(`${employee.employee_id}:${dateKey}`);
      if (existing && !overwrite) {
        stats.skippedExisting += 1;
        continue;
      }

      const scenario = holiday
        ? {
          status: 'holiday',
          timeIn: null,
          timeOut: null,
          overtimeHours: 0,
        }
        : onApprovedLeave
          ? {
            status: 'on_leave',
            timeIn: null,
            timeOut: null,
            overtimeHours: 0,
          }
          : !isScheduled
            ? {
              status: 'rest_day',
              timeIn: null,
              timeOut: null,
              overtimeHours: 0,
            }
            : createScenario({
              shiftStartMinutes,
              shiftEndMinutes,
            });

      const record = {
        employee_id: employee.employee_id,
        date: dateKey,
        time_in: scenario.timeIn === null ? null : buildTimestamp(dateKey, scenario.timeIn),
        time_out: scenario.timeOut === null ? null : buildTimestamp(dateKey, scenario.timeOut),
        status: scenario.status,
        overtime_hours: scenario.overtimeHours,
        created_by: actingUserId,
        updated_by: actingUserId,
      };

      if (dryRun) {
        if (existing && overwrite) {
          stats.updated += 1;
        } else {
          stats.inserted += 1;
        }
        continue;
      }

      if (existing && overwrite) {
        const updateData = {
          time_in: record.time_in,
          time_out: record.time_out,
          status: record.status,
          overtime_hours: record.overtime_hours,
          updated_by: actingUserId,
        };

        if (!existing.attendance_code) {
          updateData.attendance_code = generateAttendanceCode(existing.attendance_id);
        }

        const updateColumns = Object.keys(updateData).map((column) => `${column} = ?`).join(', ');
        const updateValues = Object.values(updateData);

        await connection.execute(
          `UPDATE attendance
           SET ${updateColumns}
           WHERE attendance_id = ?`,
          [...updateValues, existing.attendance_id]
        );

        stats.updated += 1;
        continue;
      }

      const [insertResult] = await connection.execute(
        `INSERT INTO attendance
          (employee_id, date, time_in, time_out, status, overtime_hours, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.employee_id,
          record.date,
          record.time_in,
          record.time_out,
          record.status,
          record.overtime_hours,
          record.created_by,
          record.updated_by,
        ]
      );

      const attendanceId = insertResult.insertId;
      const attendanceCode = generateAttendanceCode(attendanceId);

      await connection.execute(
        'UPDATE attendance SET attendance_code = ? WHERE attendance_id = ?',
        [attendanceCode, attendanceId]
      );

      stats.inserted += 1;

      if (holiday) {
        stats.skippedHoliday += 1;
      }
      if (!isScheduled) {
        stats.skippedNonScheduled += 1;
      }
      if (onApprovedLeave) {
        stats.skippedLeave += 1;
      }
    }
  }

  const holidayList = Array.from(holidayLookup.values()).map((holiday) => `${holiday.date} (${holiday.name})`);

  console.log('Attendance backfill complete.');
  console.log(`Range: ${startDate} to ${endDate}`);
  console.log(`Employees scanned: ${stats.employees}`);
  console.log(`Inserted: ${stats.inserted}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped existing: ${stats.skippedExisting}`);
  console.log(`Skipped holiday: ${stats.skippedHoliday}`);
  console.log(`Skipped leave: ${stats.skippedLeave}`);
  console.log(`Skipped outside employment: ${stats.skippedOutsideEmployment}`);
  console.log(`Skipped missing shift: ${stats.skippedMissingShift}`);
  console.log(`Skipped non-scheduled days: ${stats.skippedNonScheduled}`);
  console.log(`System user: ${actingUserId ?? 'none'}`);
  console.log(`Dry run: ${dryRun ? 'yes' : 'no'}`);
  console.log(`Overwrite existing: ${overwrite ? 'yes' : 'no'}`);
  console.log('Holidays in range:');
  if (holidayList.length > 0) {
    holidayList.forEach((holiday) => console.log(` - ${holiday}`));
  } else {
    console.log(' - none');
  }
} catch (error) {
  if (error?.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('Database access denied. Check backend/.env credentials and confirm the MySQL user has access to the HRIS database.');
    console.error(`Attempted host: ${connectionOptions.host}:${connectionOptions.port}, user: ${connectionOptions.user}, database: ${connectionOptions.database}`);
  } else {
    console.error('Failed to backfill attendance:', error);
  }
  process.exitCode = 1;
} finally {
  if (connection) {
    await connection.end();
  }
}