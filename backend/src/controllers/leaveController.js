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

    // Check if employee has a pending leave request
    const pendingLeave = await db.getOne(
      'SELECT * FROM leaves WHERE employee_id = ? AND status = ?',
      [employee_id, 'pending']
    );

    if (pendingLeave) {
      return res.status(400).json({
        success: false,
        message: 'Employee already has a pending leave request. Please wait for approval or rejection before submitting a new request.',
      });
    }

    // Get user ID from JWT token for audit trail
    const createdBy = req.user?.user_id;

    const leaveId = await db.insert('leaves', {
      employee_id,
      leave_type,
      start_date,
      end_date,
      status: 'pending',
      remarks,
      created_by: createdBy,
    });

    // Generate leave code
    const leaveCode = generateLeaveCode(leaveId);
    await db.update('leaves', { leave_code: leaveCode }, 'leave_id = ?', [leaveId]);

    logger.info(`Leave request submitted by employee ${employee_id}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: createdBy || employee_id,
        action: "CREATE",
        module: "leaves",
        description: `Leave request submitted by employee ID ${employee_id} (${leaveCode})`,
        created_by: createdBy || employee_id,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

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

    // Start transaction for atomic operations
    await db.beginTransaction();

    try {
      // Get user ID from JWT token for audit trail
      const approvedBy = req.user?.user_id;

      // Update leave status to approved
      await db.transactionUpdate('leaves', {
        status: 'approved',
        approved_by: approvedBy,
        updated_by: approvedBy,
      }, 'leave_id = ?', [id]);

      // Update employee status to on-leave
      await db.transactionUpdate(
        'employees',
        { status: 'on-leave' },
        'employee_id = ?',
        [leave.employee_id]
      );

      // Commit transaction
      await db.commit();

      logger.info(`Leave request approved: ${id}, Employee ${leave.employee_id} status updated to on-leave`);

      // Create activity log entry (outside transaction)
      try {
        await db.insert("activity_logs", {
          user_id: approvedBy || 1,
          action: "UPDATE",
          module: "leaves",
          description: `Approved leave request ${leave.leave_code} for employee ID ${leave.employee_id}`,
          created_by: approvedBy || 1,
        });
      } catch (logError) {
        logger.error("Failed to create activity log:", logError);
      }

      res.json({
        success: true,
        message: 'Leave request approved and employee status updated to on-leave',
        data: { leave_id: id, employee_id: leave.employee_id },
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
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

    // Get user ID from JWT token for audit trail
    const rejectedBy = req.user?.user_id;

    await db.update('leaves', {
      status: 'rejected',
      remarks: remarks || null,
      updated_by: rejectedBy,
    }, 'leave_id = ?', [id]);

    logger.info(`Leave request rejected: ${id}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: rejectedBy || 1,
        action: "UPDATE",
        module: "leaves",
        description: `Rejected leave request ${leave.leave_code} for employee ID ${leave.employee_id}`,
        created_by: rejectedBy || 1,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

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

    // Get user ID from JWT token for audit trail
    const deletedBy = req.user?.user_id;

    const affectedRows = await db.deleteRecord('leaves', 'leave_id = ?', [id]);

    logger.info(`Leave request deleted: ${id}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: deletedBy || 1,
        action: "DELETE",
        module: "leaves",
        description: `Deleted leave request ${leave.leave_code} for employee ID ${leave.employee_id}`,
        created_by: deletedBy || 1,
      });
    } catch (logError) {
      logger.error("Failed to create activity log:", logError);
    }

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

export const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get total employees
    const totalEmployees = await db.getOne(
      'SELECT COUNT(*) as count FROM employees'
    );

    // Get on-leave employees (approved leaves that are active today)
    const onLeaveEmployees = await db.getOne(`
      SELECT COUNT(DISTINCT e.employee_id) as count
      FROM employees e
      LEFT JOIN leaves l ON e.employee_id = l.employee_id
      WHERE e.status = 'on-leave' AND l.status = 'approved' AND l.start_date <= ? AND l.end_date >= ?
    `, [today, today]);

    // Get absent employees today
    const absentToday = await db.getOne(`
      SELECT COUNT(*) as count FROM attendance
      WHERE date = ? AND status = 'absent'
    `, [today]);

    // Get late employees today
    const lateToday = await db.getOne(`
      SELECT COUNT(*) as count FROM attendance
      WHERE date = ? AND status = 'late'
    `, [today]);

    // Get pending leave requests
    const pendingRequests = await db.getOne(
      'SELECT COUNT(*) as count FROM leaves WHERE status = ?',
      ['pending']
    );

    // Get present employees today
    const presentToday = await db.getOne(`
      SELECT COUNT(*) as count FROM attendance
      WHERE date = ? AND status = 'present'
    `, [today]);

    // Get total positions
    const totalPositions = await db.getOne(
      'SELECT COUNT(*) as count FROM job_positions'
    );

    // Get total departments
    const totalDepartments = await db.getOne(
      'SELECT COUNT(*) as count FROM departments'
    );

    res.json({
      success: true,
      data: {
        total_employees: totalEmployees?.count || 0,
        on_duty: presentToday?.count || 0,
        on_leave: onLeaveEmployees?.count || 0,
        absent: absentToday?.count || 0,
        late: lateToday?.count || 0,
        pending_requests: pendingRequests?.count || 0,
        total_positions: totalPositions?.count || 0,
        total_departments: totalDepartments?.count || 0,
      },
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    next(error);
  }
};

export const getPendingLeaveCount = async (req, res, next) => {
  try {
    const result = await db.getOne(`
      SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'
    `);

    res.json({
      success: true,
      data: { pending_count: result?.count || 0 },
    });
  } catch (error) {
    logger.error('Get pending leave count error:', error);
    next(error);
  }
};

export const getPendingLeaves = async (req, res, next) => {
  try {
    const leaves = await db.getAll(`
      SELECT l.*, e.first_name, e.last_name, e.employee_code
      FROM leaves l
      LEFT JOIN employees e ON l.employee_id = e.employee_id
      WHERE l.status = 'pending'
      ORDER BY l.start_date ASC
    `);

    res.json({
      success: true,
      data: leaves,
      count: leaves.length,
    });
  } catch (error) {
    logger.error('Get pending leaves error:', error);
    next(error);
  }
};

export const getAbsenceRecords = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    let sql = `
      SELECT a.*, e.first_name, e.last_name, e.employee_code
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.employee_id
      WHERE a.status = 'absent'
    `;
    const params = [];

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
    logger.error('Get absence records error:', error);
    next(error);
  }
};

export const getAbsenceCount = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    let sql = 'SELECT COUNT(*) as count FROM attendance WHERE status = ?';
    const params = ['absent'];

    if (start_date) {
      sql += ' AND date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND date <= ?';
      params.push(end_date);
    }

    const result = await db.getOne(sql, params);

    res.json({
      success: true,
      data: { absence_count: result?.count || 0 },
    });
  } catch (error) {
    logger.error('Get absence count error:', error);
    next(error);
  }
};

export const checkAndRevertLeaveStatus = async (req, res, next) => {
  try {
    // Find all approved leaves where end_date has passed
    const expiredLeaves = await db.getAll(`
      SELECT l.*, e.employee_id
      FROM leaves l
      LEFT JOIN employees e ON l.employee_id = e.employee_id
      WHERE l.status = 'approved'
      AND l.end_date < CURDATE()
      AND e.status = 'on-leave'
    `);

    if (expiredLeaves.length === 0) {
      return res.json({
        success: true,
        message: 'No expired leaves to revert',
        data: { reverted_count: 0 },
      });
    }

    // Start transaction
    await db.beginTransaction();

    try {
      let revertedCount = 0;

      for (const leave of expiredLeaves) {
        // Check if employee has any other active approved leaves
        const otherActiveLeaves = await db.transactionGetOne(
          `SELECT COUNT(*) as count FROM leaves
           WHERE employee_id = ?
           AND status = 'approved'
           AND end_date >= CURDATE()
           AND leave_id != ?`,
          [leave.employee_id, leave.leave_id]
        );

        // Only revert status if no other active leaves
        if (otherActiveLeaves.count === 0) {
          await db.transactionUpdate(
            'employees',
            { status: 'active' },
            'employee_id = ?',
            [leave.employee_id]
          );
          revertedCount++;
        }
      }

      await db.commit();

      logger.info(`Leave status check completed. Reverted ${revertedCount} employees to active status`);

      res.json({
        success: true,
        message: `Successfully reverted ${revertedCount} employees to active status`,
        data: { reverted_count: revertedCount },
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Check and revert leave status error:', error);
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
  checkAndRevertLeaveStatus,
  getPendingLeaveCount,
  getPendingLeaves,
  getAbsenceRecords,
  getAbsenceCount,
  getDashboardStats,
};

