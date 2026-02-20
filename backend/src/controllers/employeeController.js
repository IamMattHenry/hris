import * as db from "../config/db.js";
import logger from "../utils/logger.js";
import bcryptjs from "bcryptjs";
import {
  generateEmployeeCode,
  generateDependentCode,
} from "../utils/codeGenerator.js";
import { deleteFingerprintTemplate } from "../services/fingerprintService.js";
import emailService from "../utils/emailService.js";

const mapDepartmentToSubRole = (departmentName = "") => {
  const normalized = departmentName.trim().toLowerCase();

  if (!normalized) return null;

  if (
    normalized === "it" ||
    normalized.includes("information technology") ||
    normalized.includes("i.t.")
  ) {
    return "it";
  }

  if (normalized === "hr" || normalized.includes("human resources")) {
    return "hr";
  }

  return null;
};

/**
 * Get employee availability status
 * Returns all employees with their current status (available/offline/on_leave/etc.)
 * based on today's attendance and employee status
 */
export const getEmployeeAvailability = async (req, res, next) => {
  try {
    const { date } = req.query;

    // Use provided date or today's date in YYYY-MM-DD format
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get all active employees with their basic info
    const employees = await db.getAll(`
      SELECT
        e.employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.status as employee_status,
        e.position_id,
        jp.position_name,
        e.department_id,
        d.department_name,
        e.email,
        e.phone_number
      FROM employees e
      LEFT JOIN job_positions jp ON e.position_id = jp.position_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE e.status IN ('active', 'on-leave')
      ORDER BY e.employee_code
    `);

    // Get attendance records for the target date
    const attendanceRecords = await db.getAll(
      `SELECT employee_id, status, time_in, time_out
       FROM attendance
       WHERE date = ?`,
      [targetDate]
    );

    // Create a map of employee_id to attendance record
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      attendanceMap.set(record.employee_id, record);
    });

    // Build availability list
    const availabilityList = employees.map(emp => {
      const attendance = attendanceMap.get(emp.employee_id);

      let availability_status = 'offline';
      let attendance_status = null;
      let time_in = null;
      let time_out = null;

      // Determine availability based on employee status and attendance
      if (emp.employee_status === 'on-leave') {
        availability_status = 'on_leave';
        attendance_status = 'on_leave';
      } else if (attendance) {
        // Employee has attendance record for today
        attendance_status = attendance.status;
        time_in = attendance.time_in;
        time_out = attendance.time_out;

        if (attendance.time_out) {
          // Already timed out - offline
          availability_status = 'offline';
        } else if (attendance.time_in) {
          // Timed in but not out - available
          availability_status = 'available';
        }
      } else {
        // No attendance record and not on leave - offline
        availability_status = 'offline';
      }

      return {
        employee_id: emp.employee_id,
        employee_code: emp.employee_code,
        first_name: emp.first_name,
        last_name: emp.last_name,
        full_name: `${emp.first_name} ${emp.last_name}`,
        position_name: emp.position_name,
        department_name: emp.department_name,
        email: emp.email,
        phone_number: emp.phone_number,
        employee_status: emp.employee_status,
        availability_status, // 'available', 'offline', 'on_leave'
        attendance_status, // 'present', 'late', 'absent', 'on_leave', etc.
        time_in,
        time_out,
        date: targetDate,
      };
    });

    // Count by availability status
    const summary = {
      total: availabilityList.length,
      available: availabilityList.filter(e => e.availability_status === 'available').length,
      offline: availabilityList.filter(e => e.availability_status === 'offline').length,
      on_leave: availabilityList.filter(e => e.availability_status === 'on_leave').length,
    };

    res.json({
      success: true,
      data: availabilityList,
      summary,
      date: targetDate,
    });
  } catch (error) {
    logger.error('Get employee availability error:', error);
    next(error);
  }
};

export const getAllEmployees = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const {
      department_id: queryDeptId,
      role: queryRole,
      status: queryStatus,
      exclude_employee_id: excludeEmployeeId,
    } = req.query;

    let sql = `
      SELECT
        e.*,
        jp.position_name,
        d.department_name,
        d.department_code,
        u.username,
        u.role
      FROM employees e
      LEFT JOIN job_positions jp ON e.position_id = jp.position_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN users u ON e.user_id = u.user_id
    `;

    const whereClauses = [];
    const params = [];

    let parsedDeptId = queryDeptId ? parseInt(queryDeptId, 10) : null;
    if (Number.isNaN(parsedDeptId)) parsedDeptId = null;

    if (currentUser && currentUser.role === 'admin') {
      const adminEmployee = await db.getOne(
        'SELECT department_id FROM employees WHERE user_id = ?',
        [currentUser.user_id]
      );

      const adminDeptId = adminEmployee?.department_id;

      if (!adminDeptId) {
        return res.status(403).json({
          success: false,
          message: 'Admin is not associated with any department',
        });
      }

      if (parsedDeptId && parsedDeptId !== adminDeptId) {
        return res.status(403).json({
          success: false,
          message: 'Admins can only access employees within their department',
        });
      }

      whereClauses.push('e.department_id = ?');
      params.push(adminDeptId);
    } else if (parsedDeptId) {
      whereClauses.push('e.department_id = ?');
      params.push(parsedDeptId);
    }

    if (queryRole) {
      whereClauses.push('u.role = ?');
      params.push(queryRole);
    }

    if (queryStatus) {
      whereClauses.push('e.status = ?');
      params.push(queryStatus);
    }

    if (excludeEmployeeId) {
      const parsedExclude = parseInt(excludeEmployeeId, 10);
      if (!Number.isNaN(parsedExclude)) {
        whereClauses.push('e.employee_id != ?');
        params.push(parsedExclude);
      }
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    sql += ' ORDER BY e.employee_id DESC';

    const employees = await db.getAll(sql, params);

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

    const employee = await db.getOne(
      `
  SELECT
    e.*,
    jp.position_name,
    d.department_name,
    d.department_code,
    u.username,
    u.role,
    ur.sub_role,
    ea.home_address,
    ea.barangay_name AS barangay,
    ea.city_name AS city,
    ea.region_name AS region,
    ea.province_name AS province
  FROM employees e
  LEFT JOIN job_positions jp ON e.position_id = jp.position_id
  LEFT JOIN departments d ON e.department_id = d.department_id
  LEFT JOIN users u ON e.user_id = u.user_id
  LEFT JOIN user_roles ur ON u.user_id = ur.user_id
  LEFT JOIN employee_addresses ea ON e.employee_id = ea.employee_id
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
      "SELECT contact_id, contact_number FROM employee_contact_numbers WHERE employee_id = ? ORDER BY contact_id",
      [id]
    );

    // Fetch dependents with their contact info, email, and address
    const dependents = await db.getAll(
      `SELECT
        d.dependant_id,
        d.dependant_code,
        d.firstname,
        d.lastname,
        d.relationship,
        d.birth_date,
        de.email,
        dc.contact_no,
        da.home_address,
        da.region_name,
        da.province_name,
        da.city_name
      FROM dependants d
      LEFT JOIN dependant_email de ON d.dependant_id = de.dependant_id
      LEFT JOIN dependant_contact dc ON d.dependant_id = dc.dependant_id
      LEFT JOIN dependant_address da ON d.dependant_id = da.dependant_id
      WHERE d.employee_id = ?
      ORDER BY d.dependant_id`,
      [id]
    );

    // Attach contact info and dependents to employee object
    employee.emails = emails;
    employee.contact_numbers = contact_numbers;
    employee.dependents = dependents;

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
      middle_name,
      extension_name,
      email,
      birthdate,
      gender,
      civil_status,
      home_address,
      barangay,
      city,
      region,
      province,
      position_id,
      department_id,
      salary,
      leave_credit,
      supervisor_id,
      hire_date,
      contact_number,
      status,
      fingerprint_id,
      employment_type,
      probation_end_date,
      monthly_salary,
      hourly_rate,
      created_by,
      dependents
    } = req.body;

    const normalizedEmail = email?.trim();
    // Fingerprint is assigned only via the dedicated enrollment flow.
    // Ignore any fingerprint_id provided during employee creation.
    const fingerprintIdValue = null;

    if (
      fingerprintIdValue !== null &&
      (Number.isNaN(fingerprintIdValue) || fingerprintIdValue <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Fingerprint ID must be a positive number",
      });
    }

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required to create a user account",
      });
    }

    // Validate role
    const validRoles = ["admin", "employee", "supervisor", "superadmin"];
    const userRole = role || "employee"; // Default to 'employee' if not provided

    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Role must be one of: 'admin', 'employee', 'supervisor', 'superadmin'.`,
      });
    }

    // Start transaction early so validation queries can use it
    await db.beginTransaction();

    try {
      // Sub-role is optional now when creating admin or supervisor.
      // If sub_role is provided, validate it matches department mapping.
      if ((userRole === "admin" || userRole === "supervisor") && sub_role && department_id) {
        const deptResult = await db.transactionQuery(
          "SELECT department_name FROM departments WHERE department_id = ?",
          [department_id]
        );

        if (deptResult && deptResult.length > 0) {
          const deptName = deptResult[0].department_name;
          const validDeptSubRole = mapDepartmentToSubRole(deptName);

          if (validDeptSubRole && sub_role !== validDeptSubRole) {
            await db.rollback();
            return res.status(400).json({
              success: false,
              message: `${deptName} department employees can only have '${validDeptSubRole}' as sub_role.`,
            });
          }
        }
      }

      // Superadmin doesn't need sub_role or department validation
      if (userRole === "superadmin") {
        // Superadmin can be created without sub_role or department restrictions
        logger.info("Creating superadmin user - no department restrictions");
      }

      // Check if department already has a supervisor (only for supervisor role)
      if (userRole === "supervisor" && department_id) {
        const existingSupervisors = await db.transactionQuery(
          `SELECT e.employee_id FROM employees e
           JOIN users u ON e.user_id = u.user_id
           WHERE e.department_id = ? AND u.role = 'supervisor'`,
          [department_id]
        );

        if (existingSupervisors && existingSupervisors.length > 0) {
          await db.rollback();
          return res.status(400).json({
            success: false,
            message: "This department already has a supervisor. Only one supervisor is allowed per department.",
          });
        }
      }

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

      // Check if employee email already exists
      if (normalizedEmail) {
        const existingEmployeeEmail = await db.transactionQuery(
          "SELECT employee_id FROM employee_emails WHERE email = ?",
          [normalizedEmail]
        );

        if (existingEmployeeEmail && existingEmployeeEmail.length > 0) {
          await db.rollback();
          return res.status(400).json({
            success: false,
            message: `Email '${normalizedEmail}' is already associated with another employee.`,
          });
        }
      }

      if (fingerprintIdValue !== null) {
        const existingFingerprint = await db.transactionQuery(
          "SELECT employee_id FROM employees WHERE fingerprint_id = ?",
          [fingerprintIdValue]
        );

        if (existingFingerprint && existingFingerprint.length > 0) {
          await db.rollback();
          return res.status(400).json({
            success: false,
            message: `Fingerprint ID '${fingerprintIdValue}' is already assigned to another employee.`,
          });
        }
      }

      // Hash password
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Create user account
      const userId = await db.transactionInsert("users", {
        username,
        password: hashedPassword,
        role: userRole,
        created_by,
      });

      logger.info(
        `User account created: ${username} (ID: ${userId}, Role: ${userRole})`
      );

      // Normalize and validate employment type
      const normalizedEmploymentType = (typeof employment_type === 'string' && employment_type.trim()) ? employment_type.trim().toLowerCase() : null;
      const allowedTypes = ['regular', 'probationary'];
      let finalEmploymentType = allowedTypes.includes(normalizedEmploymentType) ? normalizedEmploymentType : 'probationary';

      // Parse numeric salary/rate values from request as fallback
      const reqMonthlySalary = monthly_salary !== undefined && monthly_salary !== null ? Number(monthly_salary) : (salary !== undefined ? Number(salary) : null);
      const reqHourlyRate = hourly_rate !== undefined && hourly_rate !== null ? Number(hourly_rate) : null;

      // probation_end_date should be either null or a valid date string (YYYY-MM-DD)
      const finalProbationEndDate = probation_end_date ? probation_end_date : null;

      // If position_id is provided, prefer position defaults for salary and employment type
      let finalCurrentSalary = null;
      let finalSalaryUnit = null;
      if (position_id) {
        try {
          const pos = await db.transactionQuery(
            "SELECT default_salary, salary_unit, employment_type FROM job_positions WHERE position_id = ?",
            [position_id]
          );

          if (pos && pos.length > 0) {
            const p = pos[0];
            if (p.default_salary != null) {
              finalCurrentSalary = Number(p.default_salary);
            }
            if (p.salary_unit) finalSalaryUnit = p.salary_unit;
            if (p.employment_type) finalEmploymentType = p.employment_type;
          }
        } catch (posErr) {
          logger.error('Failed to read position defaults:', posErr);
        }
      }

      // Fallback to request-provided values if position defaults not available
      if (finalCurrentSalary == null) {
        if (finalEmploymentType === 'regular') {
          finalCurrentSalary = reqMonthlySalary != null ? Number(reqMonthlySalary) : 0;
          finalSalaryUnit = finalSalaryUnit || 'monthly';
        } else {
          finalCurrentSalary = reqHourlyRate != null ? Number(reqHourlyRate) : 0;
          finalSalaryUnit = finalSalaryUnit || 'hourly';
        }
      }

      // Ensure numeric defaults
      finalCurrentSalary = finalCurrentSalary != null ? Number(finalCurrentSalary) : 0;
      finalSalaryUnit = finalSalaryUnit || (finalEmploymentType === 'regular' ? 'monthly' : 'hourly');

      // Insert employee without code first
      const tempEmployeeId = await db.transactionInsert("employees", {
        user_id: userId,
        first_name,
        last_name,
        middle_name,
        extension_name,
        birthdate,
        gender,
        civil_status,
        position_id,
        hire_date,
        status: status || "active",
        department_id,
        leave_credit,
        supervisor_id,
        salary: finalEmploymentType === 'regular' ? finalCurrentSalary : null,
        monthly_salary: finalEmploymentType === 'regular' ? finalCurrentSalary : null,
        hourly_rate: finalEmploymentType === 'probationary' ? finalCurrentSalary : null,
        current_salary: finalCurrentSalary,
        salary_unit: finalSalaryUnit,
        employment_type: finalEmploymentType,
        probation_end_date: finalProbationEndDate,
        fingerprint_id: fingerprintIdValue,
        created_by,
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
      if (normalizedEmail) {
        await db.transactionInsert("employee_emails", {
          employee_id: employeeId,
          email: normalizedEmail,
        });
      }

      // Insert address record if provided
      if (home_address || barangay || city || region || province) {
        await db.transactionInsert("employee_addresses", {
          employee_id: employeeId,
          home_address: home_address || null,
          barangay_name: barangay || null,
          city_name: city || null,
          region_name: region || null,
          province_name: province || null,
          created_by,

        });
      }

      // If role is 'admin' or 'supervisor' and sub_role provided, create user_role record
      let userRoleId = null;
      if ((userRole === "admin" || userRole === "supervisor") && sub_role) {
        // Insert user role record
        userRoleId = await db.transactionInsert("user_roles", {
          user_id: userId,
          sub_role: sub_role,
          created_by,
        });

        logger.info(
          `User role created: ${userRole} (ID: ${userRoleId}, Sub-role: ${sub_role})`
        );
      }

      // Handle dependents if provided
      if (dependents && Array.isArray(dependents) && dependents.length > 0) {
        for (const dependent of dependents) {
          // Insert dependent without code first
          const tempDependentId = await db.transactionInsert("dependants", {
            employee_id: employeeId,
            firstname: dependent.firstName,
            lastname: dependent.lastName,
            relationship: dependent.relationshipSpecify || dependent.relationship,
            birth_date: null, // Frontend doesn't collect birth_date yet
            created_by,
            
          });

          // Generate dependent code based on the ID
          const dependentCode = generateDependentCode(tempDependentId);

          // Update the dependent with the generated code
          await db.transactionUpdate(
            "dependants",
            { dependant_code: dependentCode },
            "dependant_id = ?",
            [tempDependentId]
          );

          // Insert dependent email if provided
          if (dependent.email && dependent.email.trim()) {
            await db.transactionInsert("dependant_email", {
              dependant_id: tempDependentId,
              email: dependent.email.trim(),
              created_by,
              
            });
          }

          // Insert dependent contact if provided
          if (dependent.contactInfo && dependent.contactInfo.trim()) {
            await db.transactionInsert("dependant_contact", {
              dependant_id: tempDependentId,
              contact_no: dependent.contactInfo.replace(/\s/g, ""),
              created_by,
              
            });
          }

          // Insert dependent address if provided
          if (dependent.homeAddress || dependent.region || dependent.province || dependent.city) {
            await db.transactionInsert("dependant_address", {
              dependant_id: tempDependentId,
              home_address: dependent.homeAddress || null,
              region_name: dependent.region || null,
              province_name: dependent.province || null,
              city_name: dependent.city || null,
              created_by,
              
            });
          }

          logger.info(`Dependent created: ${dependentCode} for employee ${employeeCode}`);
        }
      }

      // Commit transaction
      await db.commit();

      // Insert initial salary_history row for this new employee (best-effort, non-fatal)
      try {
        if (typeof finalCurrentSalary !== 'undefined' && finalCurrentSalary != null && finalCurrentSalary > 0) {
          await db.insert('salary_history', {
            employee_id: employeeId,
            old_salary: null,
            new_salary: finalCurrentSalary,
            salary_unit: finalSalaryUnit,
            changed_by: created_by || userId,
            reason: 'initial-hire',
            effective_at: new Date(),
          });
        }
      } catch (histErr) {
        logger.error('Failed to insert salary_history for new employee:', histErr);
      }

      logger.info(
        `Employee created: ${employeeCode} (ID: ${employeeId}, User: ${username})`
      );

      // Create activity log entry (outside transaction)
      try {
        const activityUserId = created_by || userId; // Use created_by if provided, otherwise use the new user's ID
        await db.insert("activity_logs", {
          user_id: activityUserId,
          action: "CREATE",
          module: "employees",
          description: `Created employee ${first_name} ${last_name} (${employeeCode}) with role: ${userRole}`,
          created_by: activityUserId,
        });
      } catch (logError) {
        // Log the error but don't fail the request
        logger.error("Failed to create activity log:", logError);
      }

      // Send account creation email if employee has an email
      try {
        if (normalizedEmail) {
          const frontendBase = (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
          const loginUrl = `${frontendBase}/login_hr`;
          // Log the final URL used in the email so deployed vs local can be verified
          logger.info(`Account creation email login link for ${normalizedEmail}: ${loginUrl}`);
          await emailService.sendAccountCreatedEmail({
            to: normalizedEmail,
            name: `${first_name} ${last_name}`,
            username,
            loginUrl,
          });
        }
      } catch (emailError) {
        // Don't fail the request if email sending fails; just log it
        logger.error('Failed to send account creation email:', emailError);
      }

      // Build response data
      const responseData = {
        employee_id: employeeId,
        employee_code: employeeCode,
        user_id: userId,
        username,
        role: userRole,
      };

      // Add role data if applicable
      if ((userRole === "admin" || userRole === "supervisor") && userRoleId) {
        responseData.user_role_id = userRoleId;
        responseData.sub_role = sub_role;
      }

      if (fingerprintIdValue !== null) {
        responseData.fingerprint_id = fingerprintIdValue;
      }

      const roleLabel = userRole === "admin" ? "Admin" : userRole === "supervisor" ? "Supervisor" : "Employee";

      res.status(201).json({
        success: true,
        message: `${roleLabel} and user account created successfully`,
        data: responseData,
      });
    } catch (error) {
      // Rollback transaction on error
      await db.rollback();
      logger.error("Create employee error:", error);
      throw error;
    }
  } catch (error) {
    // Error already logged and transaction already rolled back in inner catch
    // Just pass the error to the error handler
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    let { id } = req.params;
    const {
      emails,
      contact_numbers,
      dependents,
      role,
      sub_role,
      home_address,
      barangay,
      city,
      region,
      province,
      ...updates
    } = req.body;

    // Disallow fingerprint updates via generic update endpoint
    if (Object.prototype.hasOwnProperty.call(updates, 'fingerprint_id')) {
      delete updates.fingerprint_id;
    }

    const emailsProvided = Array.isArray(emails);
    const normalizedEmails = emailsProvided
      ? emails
          .map((email) => (typeof email === "string" ? email.trim() : ""))
          .filter((email) => email.length > 0)
      : [];

    // Handle /me endpoint - resolve employee_id from JWT token
    const isSelfUpdate = !id || id === 'me';

    if (isSelfUpdate) {
      const user_id = req.user?.user_id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: No user ID in token',
        });
      }

      // Get employee_id from user_id
      const userEmployee = await db.getOne(
        "SELECT employee_id FROM employees WHERE user_id = ?",
        [user_id]
      );

      if (!userEmployee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found for current user',
        });
      }

      id = userEmployee.employee_id;
    }

    // Check if employee exists
    const employee = await db.getOne(
      "SELECT e.*, u.user_id, u.role as current_role, ur.sub_role as current_sub_role FROM employees e LEFT JOIN users u ON e.user_id = u.user_id LEFT JOIN user_roles ur ON u.user_id = ur.user_id WHERE e.employee_id = ?",
      [id]
    );
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Get user ID from JWT token for audit trail
    const updatedBy = req.user?.user_id;
    const targetEmployeeId = Number(employee.employee_id);

    // Validate role and sub_role if provided
    if (role) {
      const validRoles = ['admin', 'employee', 'supervisor', 'superadmin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Role must be 'admin', 'employee', 'supervisor', or 'superadmin'`,
        });
      }

      // Sub-role is optional when updating role; validate only when provided.
      if ((role === 'admin' || role === 'supervisor') && sub_role && updates.department_id) {
        const department = await db.getOne(
          "SELECT department_name FROM departments WHERE department_id = ?",
          [updates.department_id]
        );

        if (department) {
          const deptName = department.department_name;
          const normalizedSubRole = sub_role.toLowerCase();
          const validDeptSubRole = mapDepartmentToSubRole(deptName);

          if (validDeptSubRole && normalizedSubRole !== validDeptSubRole) {
            return res.status(400).json({
              success: false,
              message: `${deptName} department employees can only have '${validDeptSubRole}' as sub_role.`,
            });
          }
        }
      }

      // Check one-supervisor-per-department rule
      if (role === 'supervisor' && (updates.department_id || employee.department_id)) {
        const deptId = updates.department_id || employee.department_id;
        const existingSupervisors = await db.getAll(
          `SELECT e.employee_id FROM employees e
           JOIN users u ON e.user_id = u.user_id
           WHERE e.department_id = ? AND u.role = 'supervisor' AND e.employee_id != ?`,
          [deptId, id]
        );

        if (existingSupervisors && existingSupervisors.length > 0) {
          return res.status(400).json({
            success: false,
            message: "This department already has a supervisor. Only one supervisor is allowed per department.",
          });
        }
      }
    }

    if (emailsProvided && normalizedEmails.length > 0) {
      const seenEmails = new Set();
      let duplicateEmail = null;

      for (const emailValue of normalizedEmails) {
        const lowerEmail = emailValue.toLowerCase();
        if (seenEmails.has(lowerEmail)) {
          duplicateEmail = emailValue;
          break;
        }
        seenEmails.add(lowerEmail);
      }

      if (duplicateEmail) {
        return res.status(400).json({
          success: false,
          message: `Duplicate email '${duplicateEmail}' found in the request payload.`,
        });
      }

      const lowerEmails = Array.from(seenEmails);
      const placeholders = lowerEmails.map(() => "?").join(", ");

      if (placeholders.length > 0) {
        const existingEmails = await db.getAll(
          `SELECT employee_id, LOWER(email) AS email_lower FROM employee_emails WHERE LOWER(email) IN (${placeholders})`,
          lowerEmails
        );

        const conflictingRecord = existingEmails.find(
          (row) => Number(row.employee_id) !== targetEmployeeId
        );

        if (conflictingRecord) {
          const conflictEmail =
            normalizedEmails.find(
              (emailValue) =>
                emailValue.toLowerCase() === conflictingRecord.email_lower
            ) || normalizedEmails[0];

          return res.status(400).json({
            success: false,
            message: `Email '${conflictEmail}' is already associated with another employee.`,
          });
        }
      }
    }

    await db.beginTransaction();

    try {
      // Update employee basic info (only valid employee fields)
      if (Object.keys(updates).length > 0) {
        // Normalize and validate employment_type if provided
        if (Object.prototype.hasOwnProperty.call(updates, 'employment_type')) {
          const et = updates.employment_type;
          const normalized = (typeof et === 'string' && et.trim()) ? et.trim().toLowerCase() : null;
          const allowed = ['regular', 'probationary'];
          updates.employment_type = allowed.includes(normalized) ? normalized : undefined;
        }

        // Ensure numeric salary/rate
        if (Object.prototype.hasOwnProperty.call(updates, 'monthly_salary')) {
          const ms = updates.monthly_salary;
          updates.monthly_salary = ms !== null && ms !== undefined && !Number.isNaN(Number(ms)) ? Number(ms) : 0;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'hourly_rate')) {
          const hr = updates.hourly_rate;
          updates.hourly_rate = hr !== null && hr !== undefined && !Number.isNaN(Number(hr)) ? Number(hr) : 0;
        }

        const updatesWithAudit = {
          ...updates,
          updated_by: updatedBy,
        };

        await db.transactionUpdate(
          "employees",
          updatesWithAudit,
          "employee_id = ?",
          [id]
        );
      }

      // Handle address updates
      const addressFieldsProvided = [home_address, barangay, city, region, province].some(
        (value) => value !== undefined
      );

      if (addressFieldsProvided) {
        const addressData = {};
        if (home_address !== undefined) {
          addressData.home_address = home_address ? home_address : null;
        }
        if (barangay !== undefined) {
          addressData.barangay_name = barangay ? barangay : null;
        }
        if (city !== undefined) {
          addressData.city_name = city ? city : null;
        }
        if (region !== undefined) {
          addressData.region_name = region ? region : null;
        }
        if (province !== undefined) {
          addressData.province_name = province ? province : null;
        }

        if (Object.keys(addressData).length > 0) {
          addressData.updated_by = updatedBy || null;

          const existingAddress = await db.transactionGetOne(
            "SELECT address_id FROM employee_addresses WHERE employee_id = ?",
            [id]
          );

          if (existingAddress) {
            await db.transactionUpdate(
              "employee_addresses",
              addressData,
              "employee_id = ?",
              [id]
            );
          } else {
            await db.transactionInsert("employee_addresses", {
              employee_id: id,
              ...addressData,
              created_by: updatedBy || null,
            });
          }
        }
      }

      if (emailsProvided) {
        // Delete all existing emails
        await db.transactionQuery(
          "DELETE FROM employee_emails WHERE employee_id = ?",
          [id]
        );

        // Insert new emails
        for (const emailValue of normalizedEmails) {
          await db.transactionInsert("employee_emails", {
            employee_id: id,
            email: emailValue,
          });
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

      // Handle role and sub_role updates if provided
      if (role && employee.user_id) {
        // Update role in users table
        await db.transactionUpdate(
          "users",
          {
            role: role,
            updated_by: updatedBy,
          },
          "user_id = ?",
          [employee.user_id]
        );

        // Handle sub_role in user_roles table
        if (role === 'admin' || role === 'supervisor') {
          // Admin and supervisor roles require sub_role
          if (sub_role) {
            // Check if user_role record exists
            const existingUserRole = await db.transactionQuery(
              "SELECT user_role_id FROM user_roles WHERE user_id = ?",
              [employee.user_id]
            );

            if (existingUserRole && existingUserRole.length > 0) {
              // Update existing user_role
              await db.transactionUpdate(
                "user_roles",
                {
                  sub_role: sub_role.toLowerCase(),
                  updated_by: updatedBy,
                },
                "user_id = ?",
                [employee.user_id]
              );
            } else {
              // Insert new user_role
              await db.transactionInsert("user_roles", {
                user_id: employee.user_id,
                sub_role: sub_role.toLowerCase(),
                created_by: updatedBy,
              });
            }
          }
        } else if (role === 'employee') {
          // Regular employee role - delete user_role record if exists
          await db.transactionQuery(
            "DELETE FROM user_roles WHERE user_id = ?",
            [employee.user_id]
          );
        }

        logger.info(`User role updated for employee ${id}: ${role}${sub_role ? ` (${sub_role})` : ''}`);
      }

      // Handle dependents if provided
      if (dependents && Array.isArray(dependents)) {
        // Delete all existing dependents and their related data (cascade will handle related tables)
        await db.transactionQuery(
          "DELETE FROM dependants WHERE employee_id = ?",
          [id]
        );

        // Insert new dependents
        for (const dependent of dependents) {
          // Insert dependent without code first
          const tempDependentId = await db.transactionInsert("dependants", {
            employee_id: id,
            firstname: dependent.firstName,
            lastname: dependent.lastName,
            relationship: dependent.relationshipSpecify || dependent.relationship,
            birth_date: null, // Frontend doesn't collect birth_date yet
            created_by: updatedBy,
          });

          // Generate dependent code based on the ID
          const dependentCode = generateDependentCode(tempDependentId);

          // Update the dependent with the generated code
          await db.transactionUpdate(
            "dependants",
            { dependant_code: dependentCode },
            "dependant_id = ?",
            [tempDependentId]
          );

          // Insert dependent email if provided
          if (dependent.email && dependent.email.trim()) {
            await db.transactionInsert("dependant_email", {
              dependant_id: tempDependentId,
              email: dependent.email.trim(),
              created_by: updatedBy,
            });
          }

          // Insert dependent contact if provided
          if (dependent.contactInfo && dependent.contactInfo.trim()) {
            await db.transactionInsert("dependant_contact", {
              dependant_id: tempDependentId,
              contact_no: dependent.contactInfo.replace(/\s/g, ""),
              created_by: updatedBy,
            });
          }

          // Insert dependent address if provided
          if (dependent.homeAddress || dependent.region || dependent.province || dependent.city) {
            await db.transactionInsert("dependant_address", {
              dependant_id: tempDependentId,
              home_address: dependent.homeAddress || null,
              region_name: dependent.region || null,
              province_name: dependent.province || null,
              city_name: dependent.city || null,
              created_by: updatedBy,
            });
          }

          logger.info(`Dependent created: ${dependentCode} for employee ${id}`);
        }
      }

      // Commit transaction
      await db.commit();

      logger.info(`Employee updated: ${id}`);

      // Create activity log entry (outside transaction)
      try {
        let description = `Updated employee ${employee.first_name} ${employee.last_name} (${employee.employee_code})`;

        // Add role change information to description
        if (role && role !== employee.current_role) {
          description += ` - Role changed from '${employee.current_role}' to '${role}'`;
          if (sub_role) {
            description += ` with sub_role '${sub_role}'`;
          }
        }

        await db.insert("activity_logs", {
          user_id: updatedBy || 1,
          action: "UPDATE",
          module: "employees",
          description: description,
          created_by: updatedBy || 1,
        });
      } catch (logError) {
        // Log the error but don't fail the request
        logger.error("Failed to create activity log:", logError);
      }

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

    // Get user ID from JWT token for audit trail
    const deletedBy = req.user?.user_id;

    await db.beginTransaction();

    let userDeleted = false;
    let employeeDeleted = false;

    try {
      if (employee.user_id) {
        const userDeleteResult = await db.transactionQuery(
          "DELETE FROM users WHERE user_id = ?",
          [employee.user_id]
        );
        userDeleted = (userDeleteResult?.affectedRows || 0) > 0;
        if (userDeleted) {
          employeeDeleted = true;
        }
      }

      if (!employeeDeleted) {
        const employeeDeleteResult = await db.transactionQuery(
          "DELETE FROM employees WHERE employee_id = ?",
          [id]
        );
        employeeDeleted = (employeeDeleteResult?.affectedRows || 0) > 0;
      }

      await db.commit();
    } catch (transactionError) {
      await db.rollback();
      throw transactionError;
    }

    logger.info(
      `Employee deleted: ${id}${userDeleted ? ` (linked user ${employee.user_id} removed)` : ""}`
    );

    if (employee.fingerprint_id) {
      try {
        await deleteFingerprintTemplate(employee.fingerprint_id);
      } catch (fingerprintError) {
        logger.error(
          `Failed to delete fingerprint ${employee.fingerprint_id} for employee ${id}:`,
          fingerprintError.message || fingerprintError
        );
      }
    }

    // Create activity log entry
    try {
      let description = `Deleted employee ${employee.first_name} ${employee.last_name} (${employee.employee_code})`;
      if (userDeleted) {
        description += " and linked user account";
      }

      await db.insert("activity_logs", {
        user_id: deletedBy || 1,
        action: "DELETE",
        module: "employees",
        description,
        created_by: deletedBy || 1,
      });
    } catch (logError) {
      // Log the error but don't fail the request
      logger.error("Failed to create activity log:", logError);
    }

    res.json({
      success: true,
      message: "Employee deleted successfully",
      affectedRows: employeeDeleted ? 1 : 0,
      cascadedUserDeletion: userDeleted,
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
