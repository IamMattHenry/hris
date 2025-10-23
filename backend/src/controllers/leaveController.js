import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import { generateLeaveCode } from '../utils/codeGenerator.js';

export const getLeaveRequests = async (req, res, next) => {
  try {
    const { employee_id, status } = req.query;

    let sql = `
      SELECT l.*, e.first_name, e.last_name
      FROM leaves l
      LEFT JOIN employees e ON l.employee_id = e.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      sql += ' AND l.employee_id = ?';
      params.push(employee_id);
    }

    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY l.start_date DESC';

    const requests = await db.getAll(sql, params);

    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    logger.error('Get leave requests error:', error);
    next(error);
  }
};

export const getLeaveByEmployee = async (req, res, next) => {
  try {
    const { employee_id } = req.params;

    const leaves = await db.getAll(`
      SELECT * FROM leaves
      WHERE employee_id = ?
      ORDER BY start_date DESC
    `, [employee_id]);

    res.json({
      success: true,
      data: leaves,
      count: leaves.length,
    });
  } catch (error) {
    logger.error('Get leave by employee error:', error);
    next(error);
  }
};

export const applyLeave = async (req, res, next) => {
  try {
    const { employee_id, leave_type, start_date, end_date, remarks } = req.body;

    // Validate required fields
    if (!employee_id || !leave_type || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Validate dates
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date',
      });
    }

    const leaveId = await db.insert('leaves', {
      employee_id,
      leave_type,
      start_date,
      end_date,
      status: 'pending',
      remarks,
    });

    // Generate leave code
    const leaveCode = generateLeaveCode(leaveId);
    await db.update('leaves', { leave_code: leaveCode }, 'leave_id = ?', [leaveId]);

    logger.info(`Leave request submitted by employee ${employee_id}`);

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: { leave_id: leaveId },
    });
  } catch (error) {
    logger.error('Apply leave error:', error);
    next(error);
  }
};

export const approveLeave = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if leave request exists
    const leave = await db.getOne('SELECT * FROM leaves WHERE leave_id = ?', [id]);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    await db.update('leaves', { status: 'approved' }, 'leave_id = ?', [id]);

    logger.info(`Leave request approved: ${id}`);

    res.json({
      success: true,
      message: 'Leave request approved',
    });
  } catch (error) {
    logger.error('Approve leave error:', error);
    next(error);
  }
};

export const rejectLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    // Check if leave request exists
    const leave = await db.getOne('SELECT * FROM leaves WHERE leave_id = ?', [id]);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    await db.update('leaves', { status: 'rejected', remarks: remarks || null }, 'leave_id = ?', [id]);

    logger.info(`Leave request rejected: ${id}`);

    res.json({
      success: true,
      message: 'Leave request rejected',
    });
  } catch (error) {
    logger.error('Reject leave error:', error);
    next(error);
  }
};

export const deleteLeave = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if leave request exists
    const leave = await db.getOne('SELECT * FROM leaves WHERE leave_id = ?', [id]);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    const affectedRows = await db.deleteRecord('leaves', 'leave_id = ?', [id]);

    logger.info(`Leave request deleted: ${id}`);

    res.json({
      success: true,
      message: 'Leave request deleted successfully',
      affectedRows,
    });
  } catch (error) {
    logger.error('Delete leave error:', error);
    next(error);
  }
};

export default {
  getLeaveRequests,
  getLeaveByEmployee,
  applyLeave,
  approveLeave,
  rejectLeave,
  deleteLeave,
};

