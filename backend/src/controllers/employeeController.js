import * as db from '../config/db.js';
import logger from '../utils/logger.js';

export const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await db.getAll(`
      SELECT e.*, jp.position_name, d.department_name, u.username
      FROM employee e
      LEFT JOIN job_position jp ON e.position_id = jp.position_id
      LEFT JOIN department d ON jp.department_id = d.department_id
      LEFT JOIN user u ON e.user_id = u.user_id
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
      FROM employee e
      LEFT JOIN job_position jp ON e.position_id = jp.position_id
      LEFT JOIN department d ON jp.department_id = d.department_id
      LEFT JOIN user u ON e.user_id = u.user_id
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
    const { user_id, first_name, last_name, email, birthdate, position_id, hire_date, contact_number, socmed_link, status } = req.body;

    // Validate required fields
    if (!user_id || !first_name || !last_name || !birthdate || !hire_date || !contact_number) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const employeeId = await db.insert('employee', {
      user_id,
      first_name,
      last_name,
      email,
      birthdate,
      position_id,
      hire_date,
      contact_number,
      socmed_link,
      status: status || 'active',
    });

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
    const employee = await db.getOne('SELECT * FROM employee WHERE employee_id = ?', [id]);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const affectedRows = await db.update('employee', updates, 'employee_id = ?', [id]);

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
    const employee = await db.getOne('SELECT * FROM employee WHERE employee_id = ?', [id]);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const affectedRows = await db.deleteRecord('employee', 'employee_id = ?', [id]);

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

