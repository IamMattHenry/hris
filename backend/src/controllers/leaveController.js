import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import { generateLeaveCode } from '../utils/codeGenerator.js';

export const getLeaveRequests = async (req, res, next) => {
  try {
    const { employee_id, status } = req.query;

    let sql = `
      SELECT
        l.*,
        e.first_name,
        e.last_name,
        e.department_id,
        e.leave_credit,
        jp.position_name,
        d.department_name,
        u.role AS requester_role
      FROM leaves l
      LEFT JOIN employees e ON l.employee_id = e.employee_id
      LEFT JOIN users u ON e.user_id = u.user_id
      LEFT JOIN job_positions jp ON e.position_id = jp.position_id
      LEFT JOIN departments d ON e.department_id = d.department_id
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

    // Department-based filtering for supervisors: show only requests from their department
    if (req.user?.role === 'supervisor') {
      const userDept = await db.getOne(
        `SELECT department_id FROM employees WHERE user_id = ?`,
        [req.user.user_id]
      );
      const userDepartment = userDept?.department_id || null;
      if (userDepartment) {
        sql += ' AND e.department_id = ?';
        params.push(userDepartment);
      } else {
        // If supervisor has no department assigned, only show their own requests
        sql += ' AND e.user_id = ?';
        params.push(req.user.user_id);
      }
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
    const { employee_id: bodyEmployeeId, leave_type, start_date, end_date, remarks } = req.body;

    const requesterRole = req.user?.role;
    const requesterUserId = req.user?.user_id;

    // Determine the effective employee_id
    let targetEmployeeId = bodyEmployeeId;
    if (requesterRole === 'employee') {
      // For employees, force the employee_id to be the authenticated user's employee record
      const selfEmp = await db.getOne(
        'SELECT employee_id, leave_credit FROM employees WHERE user_id = ? LIMIT 1',
        [requesterUserId]
      );
      if (!selfEmp) {
        return res.status(404).json({ success: false, message: 'Employee profile not found for current user' });
      }
      targetEmployeeId = selfEmp.employee_id;
    }

    // Validate required fields (employee_id required only for non-employee requesters)
    if (!leave_type || !start_date || !end_date || (!targetEmployeeId && requesterRole !== 'employee')) {
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
      [targetEmployeeId, 'pending']
    );

    if (pendingLeave) {
      return res.status(400).json({
        success: false,
        message: 'Employee already has a pending leave request. Please wait for approval or rejection before submitting a new request.',
      });
    }

    // Get user ID from JWT token for audit trail
    const createdBy = requesterUserId;

    const leaveId = await db.insert('leaves', {
      employee_id: targetEmployeeId,
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

    logger.info(`Leave request submitted by employee ${targetEmployeeId}`);

    // Create activity log entry
    try {
      await db.insert("activity_logs", {
        user_id: createdBy || targetEmployeeId,
        action: "CREATE",
        module: "leaves",
        description: `Leave request submitted by employee ID ${targetEmployeeId} (${leaveCode})`,
        created_by: createdBy || targetEmployeeId,
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

    // Load leave with employee details
    const leave = await db.getOne(
      `
      SELECT l.*, e.employee_id AS emp_id, e.department_id AS emp_department_id, e.leave_credit AS emp_leave_credit, u.role AS requester_role
      FROM leaves l
      JOIN employees e ON l.employee_id = e.employee_id
      JOIN users u ON e.user_id = u.user_id
      WHERE l.leave_id = ?
    `,
      [id]
    );

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending leave requests can be approved',
      });
    }

    const approverRole = req.user?.role;
    const approverUserId = req.user?.user_id;

    // Load approver employee info when available (for department and self checks)
    const approver = await db.getOne(
      `SELECT employee_id, department_id FROM employees WHERE user_id = ?`,
      [approverUserId]
    );

    const requesterRole = leave.requester_role;

    // Enforce approval hierarchy 
    if (requesterRole === 'employee') {
      // Only same-department supervisors (not self)
      if (approverRole !== 'supervisor') {
        return res.status(403).json({ success: false, message: 'Only same-department supervisors can approve employee leave requests' });
      }
      if (!approver) {
        return res.status(403).json({ success: false, message: 'Approver is not linked to an employee record' });
      }
      if (approver.department_id !== leave.emp_department_id) {
        return res.status(403).json({ success: false, message: 'Supervisors can only approve leave requests within their department' });
      }
      if (approver.employee_id === leave.emp_id) {
        return res.status(403).json({ success: false, message: 'You cannot approve your own leave request' });
      }
    } else if (requesterRole === 'supervisor') {
      // Only admin or superadmin can approve
      if (!(approverRole === 'superadmin')) {
        return res.status(403).json({ success: false, message: 'Only HR Manager can approve supervisor leave requests' });
      }
      if (approver && approver.employee_id === leave.emp_id) {
        return res.status(403).json({ success: false, message: 'You cannot approve your own leave request' });
      }
    } else if (requesterRole === 'admin') {
      // Only superadmin can approve
      if (approverRole !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Only HR Director can approve HR Manager leave requests' });
      }
      if (approver && approver.employee_id === leave.emp_id) {
        return res.status(403).json({ success: false, message: 'You cannot approve your own leave request' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'No approval policy configured for this requester role' });
    }

    // Determine deduction rule: 1 credit per leave (except sick leave = 0)
    const isSickLeave = leave.leave_type === 'sick';

    // Validate dates (still required)
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const diffMs = end.getTime() - start.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    if (!Number.isFinite(days) || days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave date range',
      });
    }

    // Check available leave credits (only for non-sick leaves)
    const availableCredits = Number(leave.emp_leave_credit ?? 0);
    const isNonPaid = !isSickLeave && availableCredits < 1;

    // Start transaction for atomic operations
    await db.beginTransaction();

    try {
      // Update leave status to approved (append non-paid note if applicable)
      const newRemarks = isNonPaid
        ? (leave.remarks ? `${leave.remarks} [NON-PAID]` : '[NON-PAID]')
        : leave.remarks;
      await db.transactionUpdate(
        'leaves',
        {
          status: 'approved',
          approved_by: approverUserId,
          updated_by: approverUserId,
          remarks: newRemarks,
        },
        'leave_id = ?',
        [id]
      );

      // Deduct leave credits per policy and set employee status to on-leave
      const employeeUpdate = (isSickLeave || isNonPaid)
        ? { status: 'on-leave' }
        : { status: 'on-leave', leave_credit: availableCredits - 1 };
      await db.transactionUpdate(
        'employees',
        employeeUpdate,
        'employee_id = ?',
        [leave.emp_id]
      );

      await db.commit();

      logger.info(
        `Leave request approved: ${id}, Employee ${leave.emp_id} set to on-leave, ${isSickLeave ? 'no credit deducted (sick leave)' : isNonPaid ? 'approved as non-paid (0 credits)' : 'deducted 1 credit'}`
      );

      // Create activity log entry (outside transaction)
      try {
        await db.insert('activity_logs', {
          user_id: approverUserId || 1,
          action: 'UPDATE',
          module: 'leaves',
          description: `Approved leave request ${leave.leave_code} for employee ID ${leave.emp_id}; ${isSickLeave ? 'no credit deducted (sick leave)' : isNonPaid ? 'approved as non-paid (0 credits)' : 'deducted 1 credit'}`,
          created_by: approverUserId || 1,
        });
      } catch (logError) {
        logger.error('Failed to create activity log:', logError);
      }

      res.json({
        success: true,
        message: `Leave request approved; ${isSickLeave ? 'no credit deducted (sick leave)' : isNonPaid ? 'approved as non-paid (0 credits)' : 'deducted 1 credit'}`,
        data: { leave_id: id, employee_id: leave.emp_id, deducted_credits: (isSickLeave || isNonPaid) ? 0 : 1 },
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

    // Load leave with employee details
    const leave = await db.getOne(
      `
      SELECT l.*, e.employee_id AS emp_id, e.department_id AS emp_department_id, u.role AS requester_role
      FROM leaves l
      JOIN employees e ON l.employee_id = e.employee_id
      JOIN users u ON e.user_id = u.user_id
      WHERE l.leave_id = ?
    `,
      [id]
    );

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending leave requests can be rejected',
      });
    }

    const approverRole = req.user?.role;
    const approverUserId = req.user?.user_id;

    // Load approver employee info when available (for department and self checks)
    const approver = await db.getOne(
      `SELECT employee_id, department_id FROM employees WHERE user_id = ?`,
      [approverUserId]
    );

    const requesterRole = leave.requester_role;

    // Enforce rejection hierarchy (Option A)
    if (requesterRole === 'employee') {
      // Only same-department supervisors (not self)
      if (approverRole !== 'supervisor') {
        return res.status(403).json({ success: false, message: 'Only same-department supervisors can reject employee leave requests' });
      }
      if (!approver) {
        return res.status(403).json({ success: false, message: 'Approver is not linked to an employee record' });
      }
      if (approver.department_id !== leave.emp_department_id) {
        return res.status(403).json({ success: false, message: 'Supervisors can only reject leave requests within their department' });
      }
      if (approver.employee_id === leave.emp_id) {
        return res.status(403).json({ success: false, message: 'You cannot reject your own leave request' });
      }
    } else if (requesterRole === 'supervisor') {
      // Only admin or superadmin can reject
      if (!(approverRole === 'admin' || approverRole === 'superadmin')) {
        return res.status(403).json({ success: false, message: 'Only admin or superadmin can reject supervisor leave requests' });
      }
      if (approver && approver.employee_id === leave.emp_id) {
        return res.status(403).json({ success: false, message: 'You cannot reject your own leave request' });
      }
    } else if (requesterRole === 'admin') {
      // Only superadmin can reject
      if (approverRole !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Only superadmin can reject admin leave requests' });
      }
      if (approver && approver.employee_id === leave.emp_id) {
        return res.status(403).json({ success: false, message: 'You cannot reject your own leave request' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'No rejection policy configured for this requester role' });
    }

    await db.update(
      'leaves',
      {
        status: 'rejected',
        remarks: remarks || null,
        updated_by: approverUserId,
      },
      'leave_id = ?',
      [id]
    );

    logger.info(`Leave request rejected: ${id}`);

    // Create activity log entry
    try {
      await db.insert('activity_logs', {
        user_id: approverUserId || 1,
        action: 'UPDATE',
        module: 'leaves',
        description: `Rejected leave request ${leave.leave_code} for employee ID ${leave.emp_id}`,
        created_by: approverUserId || 1,
      });
    } catch (logError) {
      logger.error('Failed to create activity log:', logError);
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

