import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import { generateAttendanceCode } from '../utils/codeGenerator.js';

export const getAttendanceRecords = async (req, res, next) => {
  try {
    const { employee_id, start_date, end_date } = req.query;

    let sql = `
      SELECT a.*, e.first_name, e.last_name, e.employee_code
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      sql += ' AND a.employee_id = ?';
      params.push(employee_id);
    }

    if (start_date) {
      sql += ' AND a.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND a.date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY a.date DESC';

    const records = await db.getAll(sql, params);

    res.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error) {
    logger.error('Get attendance records error:', error);
    next(error);
  }
};

export const getAttendanceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const record = await db.getOne(
      `SELECT a.*, e.first_name, e.last_name, e.employee_code
       FROM attendance a
       LEFT JOIN employees e ON a.employee_id = e.employee_id
       WHERE a.attendance_id = ?`,
      [id]
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    logger.error('Get attendance by ID error:', error);
    next(error);
  }
};

// Helper function to get Philippine timezone date and time
const getPhilippineDateTime = () => {
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

  // Get date in YYYY-MM-DD format
  const year = phTime.getFullYear();
  const month = String(phTime.getMonth() + 1).padStart(2, '0');
  const day = String(phTime.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;

  // Get time in HH:MM:SS format
  const hours = String(phTime.getHours()).padStart(2, '0');
  const minutes = String(phTime.getMinutes()).padStart(2, '0');
  const seconds = String(phTime.getSeconds()).padStart(2, '0');
  const time = `${hours}:${minutes}:${seconds}`;

  // Get time with AM/PM
  const timeWithAMPM = phTime.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return { date, time, timeWithAMPM };
};

export const clockIn = async (req, res, next) => {
  try {
    const { employee_id, status = 'present' } = req.body;

    // Get today's date and time in Philippine timezone
    const { date: today, time: timeIn, timeWithAMPM: timeInWithAMPM } = getPhilippineDateTime();

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    // Check if already clocked in today
    const existing = await db.getOne(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employee_id, today]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Already clocked in today',
      });
    }

    const validStatuses = ['present', 'absent', 'late', 'half_day', 'on_leave', 'work_from_home', 'others'];
    const finalStatus = validStatuses.includes(status) ? status : 'present';

    // Get user ID from JWT token for audit trail
    const createdBy = req.user?.user_id;

    const attendanceId = await db.insert('attendance', {
      employee_id,
      date: today,
      time_in: `${today} ${timeIn}`,
      status: finalStatus,
      created_by: createdBy,
    });

    // Generate attendance code
    const attendanceCode = generateAttendanceCode(attendanceId);
    await db.update('attendance', { attendance_code: attendanceCode }, 'attendance_id = ?', [attendanceId]);

    logger.info(`Clock in recorded for employee ${employee_id} with status ${finalStatus}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: createdBy || employee_id,
        action: "CREATE",
        module: "attendance",
        description: `Clock in recorded for employee ID ${employee_id} (${attendanceCode})`,
        created_by: createdBy || employee_id,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    res.status(201).json({
      success: true,
      message: 'Clocked in successfully',
      data: {
        attendance_id: attendanceId,
        time_in: timeInWithAMPM,
        status: finalStatus,
        // normalized fields for frontend consumers
        action: 'clock_in',
        time: timeInWithAMPM,
      },
    });
  } catch (error) {
    logger.error('Clock in error:', error);
    next(error);
  }
};

export const clockOut = async (req, res, next) => {
  try {
    const { employee_id } = req.body;

    // Get today's date and time in Philippine timezone
    const { date: today, time: timeOut, timeWithAMPM: timeOutWithAMPM } = getPhilippineDateTime();
    const timeOutFull = `${today} ${timeOut}`;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    // Find today's attendance record
    const attendance = await db.getOne(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employee_id, today]
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No clock in record found for today',
      });
    }

    // Calculate duration between time_in and time_out (target = 8 hours)
    const extractTimePart = (val) => {
      if (!val) return null;
      if (typeof val === 'string') {
        if (val.includes(' ')) return val.split(' ')[1].slice(0, 8);
        if (val.includes('T')) return val.split('T')[1].slice(0, 8);
        return val.slice(0, 8);
      }
      // Handle Date object
      try {
        const ph = new Date(new Date(val).toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        const hh = String(ph.getHours()).padStart(2, '0');
        const mm = String(ph.getMinutes()).padStart(2, '0');
        const ss = String(ph.getSeconds()).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
      } catch {
        return null;
      }
    };

    const timeInStr = extractTimePart(attendance.time_in);
    const timeOutStr = extractTimePart(timeOut);

    if (!timeInStr || !timeOutStr) {
      return res.status(400).json({ success: false, message: 'Invalid time values for duration calculation' });
    }

    const timeInParts = timeInStr.split(':');
    const timeOutParts = timeOutStr.split(':');

    const timeInMinutes = parseInt(timeInParts[0]) * 60 + parseInt(timeInParts[1]);
    const timeOutMinutes = parseInt(timeOutParts[0]) * 60 + parseInt(timeOutParts[1]);

    const durationMinutes = timeOutMinutes - timeInMinutes;
    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
      return res.status(400).json({ success: false, message: 'Invalid time: clock-out earlier than clock-in' });
    }

    const durationHours = durationMinutes / 60;

    // Determine status and overtime based on duration
    let newStatus = durationMinutes < 480 ? 'late' : 'present';
    let overtimeHours = 0;
    if (durationMinutes > 480) {
      overtimeHours = (durationMinutes - 480) / 60;
    }

    // Get user ID from JWT token for audit trail
    const updatedBy = req.user?.user_id;

    // Update attendance record
    const updateData = {
      time_out: timeOutFull,
      updated_by: updatedBy,
    };
    if (newStatus !== attendance.status) {
      updateData.status = newStatus;
    }
    if (overtimeHours > 0) {
      updateData.overtime_hours = overtimeHours;
    }

    await db.update('attendance', updateData, 'attendance_id = ?', [attendance.attendance_id]);

    logger.info(`Clock out recorded for employee ${employee_id} with duration ${durationHours.toFixed(2)} hours`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: updatedBy || employee_id,
        action: "UPDATE",
        module: "attendance",
        description: `Clock out recorded for employee ID ${employee_id} (${attendance.attendance_code})`,
        created_by: updatedBy || employee_id,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    res.json({
      success: true,
      message: 'Clocked out successfully',
      data: {
        time_out: timeOutWithAMPM,
        duration_hours: durationHours.toFixed(2),
        status: newStatus,
        overtime_hours: overtimeHours > 0 ? overtimeHours.toFixed(2) : 0,
        // normalized fields for frontend consumers
        action: 'clock_out',
        time: timeOutWithAMPM,
      },
    });
  } catch (error) {
    logger.error('Clock out error:', error);
    next(error);
  }
};

export const fingerprintAttendance = async (req, res, next) => {
  try {
    const { fingerprint_id, action = 'CLOCKIN' } = req.body;

    if (!fingerprint_id) {
      return res.status(400).json({
        success: false,
        message: 'Fingerprint ID is required',
      });
    }

    // Find employee by fingerprint_id
    const employee = await db.getOne(
      'SELECT employee_id, first_name, last_name FROM employees WHERE fingerprint_id = ?',
      [fingerprint_id]
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found for this fingerprint',
      });
    }

    const { date: today, timeWithAMPM } = getPhilippineDateTime();

    // Check if already clocked in today
    const existing = await db.getOne(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employee.employee_id, today]
    );

    let result;
    if (!existing) {
      // Clock in
      result = await clockInEmployee(employee.employee_id, 'present');
      return res.status(201).json({
        success: true,
        message: 'Clocked in successfully',
        data: {
          ...result,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          action: 'CLOCK_IN',
          time: timeWithAMPM,
        },
      });
    } else if (action === 'CLOCKOUT' || !existing.time_out) {
      // Clock out
      result = await clockOutEmployee(employee.employee_id);
      return res.json({
        success: true,
        message: 'Clocked out successfully',
        data: {
          ...result,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          action: 'CLOCK_OUT',
          time: timeWithAMPM,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Already clocked out today',
      });
    }
  } catch (error) {
    logger.error('Fingerprint attendance error:', error);
    next(error);
  }
};

// Helper function to clock in an employee
async function clockInEmployee(employee_id, status = 'present') {
  const { date: today, time: timeIn, timeWithAMPM: timeInWithAMPM } = getPhilippineDateTime();

  const attendanceId = await db.insert('attendance', {
    employee_id,
    date: today,
    time_in: `${today} ${timeIn}`,
    status,
    created_by: employee_id,
  });

  const attendanceCode = generateAttendanceCode(attendanceId);
  await db.update('attendance', { attendance_code: attendanceCode }, 'attendance_id = ?', [attendanceId]);

  logger.info(`Fingerprint clock in for employee ${employee_id}`);

  return {
    attendance_id: attendanceId,
    time_in: timeInWithAMPM,
    status,
  };
}

// Helper function to clock out an employee
async function clockOutEmployee(employee_id) {
  const { date: today, time: timeOut, timeWithAMPM: timeOutWithAMPM } = getPhilippineDateTime();
  const timeOutFull = `${today} ${timeOut}`;

  const attendance = await db.getOne(
    'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
    [employee_id, today]
  );

  if (!attendance) {
    throw new Error('No clock in record found');
  }

  // Calculate duration
  const extractTimePart = (val) => {
    if (!val) return null;
    if (typeof val === 'string') {
      if (val.includes(' ')) return val.split(' ')[1].slice(0, 8);
      if (val.includes('T')) return val.split('T')[1].slice(0, 8);
      return val.slice(0, 8);
    }
    try {
      const ph = new Date(new Date(val).toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      const hh = String(ph.getHours()).padStart(2, '0');
      const mm = String(ph.getMinutes()).padStart(2, '0');
      const ss = String(ph.getSeconds()).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    } catch {
      return null;
    }
  };

  const timeInStr = extractTimePart(attendance.time_in);
  const timeOutStr = extractTimePart(timeOut);

  const timeInParts = timeInStr.split(':');
  const timeOutParts = timeOutStr.split(':');

  const timeInMinutes = parseInt(timeInParts[0]) * 60 + parseInt(timeInParts[1]);
  const timeOutMinutes = parseInt(timeOutParts[0]) * 60 + parseInt(timeOutParts[1]);

  const durationMinutes = timeOutMinutes - timeInMinutes;
  const durationHours = durationMinutes / 60;

  let newStatus = durationMinutes < 480 ? 'late' : 'present';
  let overtimeHours = 0;
  if (durationMinutes > 480) {
    overtimeHours = (durationMinutes - 480) / 60;
  }

  const updateData = {
    time_out: timeOutFull,
    updated_by: employee_id,
  };
  if (newStatus !== attendance.status) {
    updateData.status = newStatus;
  }
  if (overtimeHours > 0) {
    updateData.overtime_hours = overtimeHours;
  }

  await db.update('attendance', updateData, 'attendance_id = ?', [attendance.attendance_id]);

  logger.info(`Fingerprint clock out for employee ${employee_id}`);

  return {
    time_out: timeOutWithAMPM,
    duration_hours: durationHours.toFixed(2),
    status: newStatus,
    overtime_hours: overtimeHours > 0 ? overtimeHours.toFixed(2) : 0,
  };
}

export const updateOvertimeHours = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { overtime_hours } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Attendance ID is required',
      });
    }

    if (overtime_hours === undefined || overtime_hours === null) {
      return res.status(400).json({
        success: false,
        message: 'Overtime hours is required',
      });
    }

    if (isNaN(overtime_hours) || overtime_hours < 0) {
      return res.status(400).json({
        success: false,
        message: 'Overtime hours must be a positive number',
      });
    }

    if (overtime_hours > 8) {
      return res.status(400).json({
        success: false,
        message: 'Overtime hours cannot exceed 8 hours',
      });
    }

    // Check if attendance record exists
    const attendance = await db.getOne(
      'SELECT * FROM attendance WHERE attendance_id = ?',
      [id]
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    // Get user ID from JWT token for audit trail
    const updatedBy = req.user?.user_id;

    await db.update('attendance', {
      overtime_hours,
      updated_by: updatedBy,
    }, 'attendance_id = ?', [id]);

    logger.info(`Overtime hours updated for attendance ${id}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: updatedBy || 1,
        action: "UPDATE",
        module: "attendance",
        description: `Updated overtime hours to ${overtime_hours} for attendance ${attendance.attendance_code}`,
        created_by: updatedBy || 1,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    res.json({
      success: true,
      message: 'Overtime hours updated successfully',
      data: { overtime_hours },
    });
  } catch (error) {
    logger.error('Update overtime hours error:', error);
    next(error);
  }
};

export const updateAttendanceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Attendance ID is required',
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const validStatuses = ['present', 'absent', 'late', 'half_day', 'on_leave', 'work_from_home', 'others'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Check if attendance record exists
    const attendance = await db.getOne(
      'SELECT * FROM attendance WHERE attendance_id = ?',
      [id]
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    // Get user ID from JWT token for audit trail
    const updatedBy = req.user?.user_id;

    await db.update('attendance', {
      status,
      updated_by: updatedBy,
    }, 'attendance_id = ?', [id]);

    logger.info(`Attendance status updated for attendance ${id} to ${status}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: updatedBy || 1,
        action: "UPDATE",
        module: "attendance",
        description: `Updated attendance status to ${status} for attendance ${attendance.attendance_code}`,
        created_by: updatedBy || 1,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

    res.json({
      success: true,
      message: 'Attendance status updated successfully',
      data: { status },
    });
  } catch (error) {
    logger.error('Update attendance status error:', error);
    next(error);
  }
};

export const getAttendanceSummary = async (req, res, next) => {
  try {
    const { employee_id } = req.params;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const summary = await db.getOne(
      `SELECT
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as leave_count,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count
       FROM attendance
       WHERE employee_id = ?`,
      [employee_id]
    );

    res.json({
      success: true,
      data: {
        present: summary?.present_count || 0,
        absent: summary?.absent_count || 0,
        leave: summary?.leave_count || 0,
        late: summary?.late_count || 0,
      },
    });
  } catch (error) {
    logger.error('Get attendance summary error:', error);
    next(error);
  }
};
export const markAbsences = async (req, res, next) => {
  try {
    // Determine target date (default: yesterday PH time)
    let { date: targetDate } = req.body || {};
    if (!targetDate) {
      const now = new Date();
      const ph = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
      ph.setDate(ph.getDate() - 1);
      const y = ph.getFullYear();
      const m = String(ph.getMonth() + 1).padStart(2, '0');
      const d = String(ph.getDate()).padStart(2, '0');
      targetDate = `${y}-${m}-${d}`;
    }

    // Exclude employees who have approved leave on target date
    const employees = await db.getAll(
      `SELECT e.employee_id
       FROM employees e
       WHERE e.status = 'active'`
    );

    let inserted = 0;
    for (const emp of employees) {
      // Skip if attendance exists for target date
      const existing = await db.getOne(
        'SELECT attendance_id FROM attendance WHERE employee_id = ? AND date = ?',
        [emp.employee_id, targetDate]
      );
      if (existing) continue;

      // Skip if employee is on approved leave for target date
      const onLeave = await db.getOne(
        `SELECT leave_id FROM leaves
         WHERE employee_id = ?
           AND status = 'approved'
           AND ? BETWEEN start_date AND end_date
         LIMIT 1`,
        [emp.employee_id, targetDate]
      );
      if (onLeave) continue;

      const createdBy = req.user?.user_id;
      const attendanceId = await db.insert('attendance', {
        employee_id: emp.employee_id,
        date: targetDate,
        status: 'absent',
        created_by: createdBy,
      });
      const code = generateAttendanceCode(attendanceId);
      await db.update('attendance', { attendance_code: code }, 'attendance_id = ?', [attendanceId]);
      inserted += 1;
    }

    res.json({
      success: true,
      message: `Auto-marked ${inserted} employees as absent for ${targetDate}`,
      data: { date: targetDate, count: inserted },
    });
  } catch (error) {
    logger.error('Mark absences error:', error);
    next(error);
  }
};

export default {
  getAttendanceRecords,
  getAttendanceById,
  clockIn,
  clockOut,
  fingerprintAttendance,
  updateOvertimeHours,
  updateAttendanceStatus,
  getAttendanceSummary,
  markAbsences,
};

