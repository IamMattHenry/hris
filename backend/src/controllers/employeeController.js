import * as db from '../config/db.js';
import logger from '../utils/logger.js';
import { generateEmployeeCode } from '../utils/codeGenerator.js';

export const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await db.getAll(`
      SELECT e.*, jp.position_name, d.department_name, u.username
      FROM employees e
      LEFT JOIN job_positions jp ON e.position_id = jp.position_id
      LEFT JOIN departments d ON jp.department_id = d.department_id
      LEFT JOIN users u ON e.user_id = u.user_id
      ORDER BY e.employee_id DESC
    `);

    res.json({
      success: true,
      data: employees,
      count: employees.length,
    });
  } catch (error) {
    logger.error('Get all employees error:', error);
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const employee = await db.getOne(`
      SELECT e.*, jp.position_name, d.department_name, u.username
      FROM employees e
      LEFT JOIN job_positions jp ON e.position_id = jp.position_id
      LEFT JOIN departments d ON jp.department_id = d.department_id
      LEFT JOIN users u ON e.user_id = u.user_id
      WHERE e.employee_id = ?
    `, [id]);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    logger.error('Get employee by ID error:', error);
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const { user_id, first_name, last_name, email, birthdate, position_id, hire_date, contact_number, status } = req.body;

    // Validate required fields
    if (!user_id || !first_name || !last_name || !birthdate || !hire_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Get the next employee ID by inserting a placeholder first
    const tempEmployeeId = await db.insert('employees', {
      user_id,
      first_name,
      last_name,
      birthdate,
      position_id,
      hire_date,
      status: status || 'active',
    });

    // Generate employee code based on the ID
    const employeeCode = generateEmployeeCode(tempEmployeeId);

    // Update the employee with the generated code
    await db.update('employees', { employee_code: employeeCode }, 'employee_id = ?', [tempEmployeeId]);

    const employeeId = tempEmployeeId;

    // Add contact number if provided
    if (contact_number) {
      await db.insert('employee_contact_numbers', {
        employee_id: employeeId,
        contact_number,
      });
    }

    // Add email if provided
    if (email) {
      await db.insert('employee_emails', {
        employee_id: employeeId,
        email,
      });
    }

    logger.info(`Employee created: ${employeeId}`);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: { employee_id: employeeId },
    });
  } catch (error) {
    logger.error('Create employee error:', error);
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if employee exists
    const employee = await db.getOne('SELECT * FROM employees WHERE employee_id = ?', [id]);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const affectedRows = await db.update('employees', updates, 'employee_id = ?', [id]);

    logger.info(`Employee updated: ${id}`);

    res.json({
      success: true,
      message: 'Employee updated successfully',
      affectedRows,
    });
  } catch (error) {
    logger.error('Update employee error:', error);
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const employee = await db.getOne('SELECT * FROM employees WHERE employee_id = ?', [id]);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const affectedRows = await db.deleteRecord('employees', 'employee_id = ?', [id]);

    logger.info(`Employee deleted: ${id}`);

    res.json({
      success: true,
      message: 'Employee deleted successfully',
      affectedRows,
    });
  } catch (error) {
    logger.error('Delete employee error:', error);
    next(error);
  }
};

export default {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};

