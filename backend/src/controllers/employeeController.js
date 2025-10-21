import * as db from "../config/db.js";
import logger from "../utils/logger.js";
import bcryptjs from "bcryptjs";
import {
  generateEmployeeCode,
  generateAdminCode,
} from "../utils/codeGenerator.js";

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
    logger.error("Get all employees error:", error);
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const employee = await db.getOne(
      `
  SELECT
    e.*,
    jp.position_name,
    d.department_name,
    u.username
  FROM employees e
  LEFT JOIN job_positions jp ON e.position_id = jp.position_id
  LEFT JOIN departments d ON jp.department_id = d.department_id
  LEFT JOIN users u ON e.user_id = u.user_id
  WHERE e.employee_id = ?
`,
      [id]
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Fetch individual emails
    const emails = await db.getAll(
      "SELECT email_id, email FROM employee_emails WHERE employee_id = ? ORDER BY email_id",
      [id]
    );

    // Fetch individual contact numbers
    const contact_numbers = await db.getAll(
      "SELECT contact_number_id, contact_number FROM employee_contact_numbers WHERE employee_id = ? ORDER BY contact_number_id",
      [id]
    );

    // Attach contact info to employee object
    employee.emails = emails;
    employee.contact_numbers = contact_numbers;

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    logger.error("Get employee by ID error:", error);
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const {
      username,
      password,
      role,
      sub_role,
      first_name,
      last_name,
      email,
      birthdate,
      gender,
      civil_status,
      home_address,
      city,
      region,
      position_id,
      shift,
      hire_date,
      contact_number,
      status,
    } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required to create a user account",
      });
    }

    // Validate role
    const validRoles = ["admin", "employee"];
    const userRole = role || "employee"; // Default to 'employee' if not provided

    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Role must be either 'admin' or 'employee'.`,
      });
    }

    // Validate sub_role if role is 'admin'
    const validSubRoles = ["hr", "manager", "finance", "it"];
    if (userRole === "admin") {
      if (!sub_role) {
        return res.status(400).json({
          success: false,
          message: `sub_role is required when creating an admin. Valid values: ${validSubRoles.join(
            ", "
          )}.`,
        });
      }

      if (!validSubRoles.includes(sub_role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid sub_role. Must be one of: ${validSubRoles.join(
            ", "
          )}.`,
        });
      }
    }

    // Start transaction
    await db.beginTransaction();

    // Check if username already exists
    const existingUser = await db.transactionQuery(
      "SELECT user_id FROM users WHERE username = ?",
      [username]
    );

    if (existingUser && existingUser.length > 0) {
      await db.rollback();
      return res.status(400).json({
        success: false,
        message: `Username '${username}' is already taken. Please choose a different username.`,
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create user account
    const userId = await db.transactionInsert("users", {
      username,
      password: hashedPassword,
      role: userRole,
    });

    logger.info(
      `User account created: ${username} (ID: ${userId}, Role: ${userRole})`
    );

    // Insert employee without code first
    const tempEmployeeId = await db.transactionInsert("employees", {
      user_id: userId,
      first_name,
      last_name,
      birthdate,
      gender,
      civil_status,
      home_address,
      city,
      region,
      position_id,
      shift,
      hire_date,
      status: status || "active",
    });

    // Generate employee code based on the ID
    const employeeCode = generateEmployeeCode(tempEmployeeId);

    // Update the employee with the generated code
    await db.transactionUpdate(
      "employees",
      { employee_code: employeeCode },
      "employee_id = ?",
      [tempEmployeeId]
    );

    const employeeId = tempEmployeeId;

    // Add contact number if provided
    if (contact_number) {
      await db.transactionInsert("employee_contact_numbers", {
        employee_id: employeeId,
        contact_number,
      });
    }

    // Add email if provided
    if (email) {
      await db.transactionInsert("employee_emails", {
        employee_id: employeeId,
        email,
      });
    }

    // If role is 'admin', create admin record
    let adminCode = null;
    let adminId = null;
    if (userRole === "admin") {
      // Insert admin without code first
      const tempAdminId = await db.transactionInsert("admins", {
        employee_id: employeeId,
        user_id: userId,
        sub_role: sub_role,
      });

      // Generate admin code based on the ID
      adminCode = generateAdminCode(tempAdminId);

      // Update the admin with the generated code
      await db.transactionUpdate(
        "admins",
        { admin_code: adminCode },
        "admin_id = ?",
        [tempAdminId]
      );

      adminId = tempAdminId;

      logger.info(
        `Admin record created: ${adminCode} (ID: ${adminId}, Sub-role: ${sub_role})`
      );
    }

    // Commit transaction
    await db.commit();

    logger.info(
      `Employee created: ${employeeCode} (ID: ${employeeId}, User: ${username})`
    );

    // Build response data
    const responseData = {
      employee_id: employeeId,
      employee_code: employeeCode,
      user_id: userId,
      username,
      role: userRole,
    };

    // Add admin data if applicable
    if (userRole === "admin") {
      responseData.admin_id = adminId;
      responseData.admin_code = adminCode;
      responseData.sub_role = sub_role;
    }

    res.status(201).json({
      success: true,
      message:
        userRole === "admin"
          ? "Admin employee and user account created successfully"
          : "Employee and user account created successfully",
      data: responseData,
    });
  } catch (error) {
    // Rollback transaction on error
    await db.rollback();
    logger.error("Create employee error:", error);
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emails, contact_numbers, ...updates } = req.body;

    // Check if employee exists
    const employee = await db.getOne(
      "SELECT * FROM employees WHERE employee_id = ?",
      [id]
    );
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Start transaction for atomic operations
    await db.beginTransaction();

    try {
      // Update employee basic info (only valid employee fields)
      if (Object.keys(updates).length > 0) {
        await db.transactionUpdate(
          "employees",
          updates,
          "employee_id = ?",
          [id]
        );
      }

      // Handle emails if provided
      if (emails && Array.isArray(emails)) {
        // Delete all existing emails
        await db.transactionQuery(
          "DELETE FROM employee_emails WHERE employee_id = ?",
          [id]
        );

        // Insert new emails
        for (const email of emails) {
          if (email && email.trim()) {
            await db.transactionInsert("employee_emails", {
              employee_id: id,
              email: email.trim(),
            });
          }
        }
      }

      // Handle contact numbers if provided
      if (contact_numbers && Array.isArray(contact_numbers)) {
        // Delete all existing contact numbers
        await db.transactionQuery(
          "DELETE FROM employee_contact_numbers WHERE employee_id = ?",
          [id]
        );

        // Insert new contact numbers
        for (const contact_number of contact_numbers) {
          if (contact_number && contact_number.trim()) {
            await db.transactionInsert("employee_contact_numbers", {
              employee_id: id,
              contact_number: contact_number.trim(),
            });
          }
        }
      }

      // Commit transaction
      await db.commit();

      logger.info(`Employee updated: ${id}`);

      res.json({
        success: true,
        message: "Employee updated successfully",
      });
    } catch (error) {
      // Rollback on error
      await db.rollback();
      throw error;
    }
  } catch (error) {
    logger.error("Update employee error:", error);
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const employee = await db.getOne(
      "SELECT * FROM employees WHERE employee_id = ?",
      [id]
    );
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const affectedRows = await db.deleteRecord("employees", "employee_id = ?", [
      id,
    ]);

    logger.info(`Employee deleted: ${id}`);

    res.json({
      success: true,
      message: "Employee deleted successfully",
      affectedRows,
    });
  } catch (error) {
    logger.error("Delete employee error:", error);
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
