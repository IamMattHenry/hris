import * as db from '../config/db.js';
import logger from '../utils/logger.js';

export const getPayrollRecords = async (req, res, next) => {
  try {
    const { employee_id, start_date, end_date } = req.query;

    let sql = `
      SELECT p.*, e.first_name, e.last_name, e.email
      FROM payroll p
      LEFT JOIN employee e ON p.employee_id = e.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) {
      sql += ' AND p.employee_id = ?';
      params.push(employee_id);
    }

    if (start_date) {
      sql += ' AND p.pay_period_start >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND p.pay_period_end <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY p.pay_period_start DESC';

    const records = await db.getAll(sql, params);

    res.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error) {
    logger.error('Get payroll records error:', error);
    next(error);
  }
};

export const getPayrollByEmployee = async (req, res, next) => {
  try {
    const { employee_id } = req.params;

    const payroll = await db.getAll(`
      SELECT p.*, e.first_name, e.last_name
      FROM payroll p
      LEFT JOIN employee e ON p.employee_id = e.employee_id
      WHERE p.employee_id = ?
      ORDER BY p.pay_period_start DESC
    `, [employee_id]);

    res.json({
      success: true,
      data: payroll,
      count: payroll.length,
    });
  } catch (error) {
    logger.error('Get payroll by employee error:', error);
    next(error);
  }
};

export const generatePayroll = async (req, res, next) => {
  try {
    const { employee_id, pay_period_start, pay_period_end, basic_pay, overtime_pay, deductions } = req.body;

    // Validate required fields
    if (!employee_id || !pay_period_start || !pay_period_end || !basic_pay) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Calculate net pay
    const net_pay = basic_pay + (overtime_pay || 0) - (deductions || 0);

    const payrollId = await db.insert('payroll', {
      employee_id,
      pay_period_start,
      pay_period_end,
      basic_pay,
      overtime_pay: overtime_pay || 0,
      deductions: deductions || 0,
      net_pay,
    });

    logger.info(`Payroll generated for employee ${employee_id}`);

    res.status(201).json({
      success: true,
      message: 'Payroll generated successfully',
      data: {
        payroll_id: payrollId,
        net_pay,
      },
    });
  } catch (error) {
    logger.error('Generate payroll error:', error);
    next(error);
  }
};

export const updatePayroll = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { basic_pay, overtime_pay, deductions } = req.body;

    // Check if payroll exists
    const payroll = await db.getOne('SELECT * FROM payroll WHERE payroll_id = ?', [id]);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found',
      });
    }

    // Calculate new net pay if amounts are provided
    const updates = { ...req.body };
    if (basic_pay !== undefined || overtime_pay !== undefined || deductions !== undefined) {
      const newBasicPay = basic_pay !== undefined ? basic_pay : payroll.basic_pay;
      const newOvertimePay = overtime_pay !== undefined ? overtime_pay : payroll.overtime_pay;
      const newDeductions = deductions !== undefined ? deductions : payroll.deductions;
      updates.net_pay = newBasicPay + newOvertimePay - newDeductions;
    }

    await db.update('payroll', updates, 'payroll_id = ?', [id]);

    logger.info(`Payroll updated: ${id}`);

    res.json({
      success: true,
      message: 'Payroll updated successfully',
    });
  } catch (error) {
    logger.error('Update payroll error:', error);
    next(error);
  }
};

export default {
  getPayrollRecords,
  getPayrollByEmployee,
  generatePayroll,
  updatePayroll,
};

