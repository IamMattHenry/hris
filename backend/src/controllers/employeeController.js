import * as db from "../config/db.js";
import logger from "../utils/logger.js";
import bcryptjs from "bcryptjs";
import {
  generateEmployeeCode,
  generateDependentCode,
} from "../utils/codeGenerator.js";

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
    ur.sub_role
  FROM employees e
  LEFT JOIN job_positions jp ON e.position_id = jp.position_id
  LEFT JOIN departments d ON e.department_id = d.department_id
  LEFT JOIN users u ON e.user_id = u.user_id
  LEFT JOIN user_roles ur ON u.user_id = ur.user_id
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
      city,
      region,
      province,
      position_id,
      department_id,
      salary,
      leave_credit,
      supervisor_id,
      shift,
      hire_date,
      contact_number,
      status,
      created_by,
      dependents
    } = req.body;

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
      // Validate sub_role if role is 'admin' or 'supervisor'
      const validSubRoles = ["hr", "it"];
      if (userRole === "admin" || userRole === "supervisor") {
        if (!sub_role) {
          await db.rollback();
          return res.status(400).json({
            success: false,
            message: `sub_role is required when creating an admin or supervisor. Valid values: ${validSubRoles.join(
              ", "
            )}.`,
          });
        }

        if (!validSubRoles.includes(sub_role)) {
          await db.rollback();
          return res.status(400).json({
            success: false,
            message: `Invalid sub_role. Must be one of: ${validSubRoles.join(
              ", "
            )}.`,
          });
        }

        // Validate sub_role matches department
        if (department_id) {
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
        home_address,
        city,
        region,
        province,
        position_id,
        shift,
        hire_date,
        status: status || "active",
        department_id,
        leave_credit,
        supervisor_id,
        salary,
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
      if (email) {
        await db.transactionInsert("employee_emails", {
          employee_id: employeeId,
          email,
        });
      }

      // Address is now stored in employees table, no separate insert needed

      // If role is 'admin' or 'supervisor', create user_role record
      let userRoleId = null;
      if (userRole === "admin" || userRole === "supervisor") {
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
    const { emails, contact_numbers, dependents, role, sub_role, ...updates } = req.body;

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

    // Validate role and sub_role if provided
    if (role) {
      const validRoles = ['admin', 'employee', 'supervisor', 'superadmin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Role must be 'admin', 'employee', 'supervisor', or 'superadmin'`,
        });
      }

      // Validate sub_role is provided for admin/supervisor (but not superadmin)
      if ((role === 'admin' || role === 'supervisor') && !sub_role) {
        return res.status(400).json({
          success: false,
          message: "Sub-role is required when granting admin or supervisor privilege",
        });
      }

      // Validate sub_role matches department
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

    // Start transaction for atomic operations
    await db.beginTransaction();

    try {
      // Update employee basic info (only valid employee fields)
      if (Object.keys(updates).length > 0) {
        // Add updated_by to updates
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
