import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import { generateAttendanceCode } from '../utils/codeGenerator.js';

export const getAttendanceRecords = async (req, res, next) => {
  try {
    const { employee_id, start_date, end_date } = req.query;

    let sql = `
      SELECT a.*, e.first_name, e.last_name
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

export const clockIn = async (req, res, next) => {
  try {
    const { employee_id } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const timeIn = new Date().toTimeString().split(' ')[0];

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

    const attendanceId = await db.insert('attendance', {
      employee_id,
      date: today,
      time_in: timeIn,
      status: 'present',
    });

    // Generate attendance code
    const attendanceCode = generateAttendanceCode(attendanceId);
    await db.update('attendance', { attendance_code: attendanceCode }, 'attendance_id = ?', [attendanceId]);

    logger.info(`Clock in recorded for employee ${employee_id}`);

    res.status(201).json({
      success: true,
      message: 'Clocked in successfully',
      data: { attendance_id: attendanceId, time_in: timeIn },
    });
  } catch (error) {
    logger.error('Clock in error:', error);
    next(error);
  }
};

export const clockOut = async (req, res, next) => {
  try {
    const { employee_id } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const timeOut = new Date().toTimeString().split(' ')[0];

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

    await db.update('attendance', { time_out: timeOut }, 'attendance_id = ?', [attendance.attendance_id]);

    logger.info(`Clock out recorded for employee ${employee_id}`);

    res.json({
      success: true,
      message: 'Clocked out successfully',
      data: { time_out: timeOut },
    });
  } catch (error) {
    logger.error('Clock out error:', error);
    next(error);
  }
};

export default {
  getAttendanceRecords,
  clockIn,
  clockOut,
};

