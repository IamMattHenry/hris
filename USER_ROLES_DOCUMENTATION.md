# User Roles Documentation

## Table of Contents
1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Sub-Roles](#sub-roles)
4. [Permissions and Capabilities](#permissions-and-capabilities)
5. [Department-Based Role Restrictions](#department-based-role-restrictions)
6. [One Supervisor Per Department Rule](#one-supervisor-per-department-rule)
7. [Role Assignment During Employee Creation](#role-assignment-during-employee-creation)
8. [Role Assignment During Employee Editing](#role-assignment-during-employee-editing)
9. [Identifying User Roles in the System](#identifying-user-roles-in-the-system)
10. [Examples of Typical Users](#examples-of-typical-users)

---

## Overview

The HRIS (Human Resource Information System) implements a role-based access control (RBAC) system to manage user permissions and capabilities. The system has three primary roles: **Employee**, **Admin**, and **Supervisor**, with additional sub-roles (**HR** and **IT**) that provide specialized permissions based on department affiliation.

---

## User Roles

### 1. Employee (Default Role)
- **Description**: The base role assigned to all users by default when they are created in the system.
- **Purpose**: Represents regular employees who have limited access to the system, primarily for viewing their own information and performing self-service tasks.
- **Database Value**: `role = 'employee'`

### 2. Admin
- **Description**: Administrative role with elevated privileges for managing the entire HRIS system.
- **Purpose**: Admins can manage all aspects of the system, including creating/editing/deleting employees, managing departments, positions, attendance, leaves, and payroll.
- **Database Value**: `role = 'admin'`
- **Requires**: A sub-role (`hr` or `it`) based on the employee's department.

### 3. Supervisor
- **Description**: Departmental leadership role with elevated privileges specific to their department.
- **Purpose**: Supervisors can manage employees within their department, approve/reject leave requests, and oversee attendance for their team.
- **Database Value**: `role = 'supervisor'`
- **Requires**: A sub-role (`hr` or `it`) based on the employee's department.
- **Restriction**: Only **one supervisor per department** is allowed.

---

## Sub-Roles

Sub-roles provide specialized permissions based on the employee's department affiliation. They are **required** when granting Admin or Supervisor privileges.

### 1. HR (Human Resources)
- **Description**: Sub-role for employees in the Human Resources department.
- **Database Value**: `sub_role = 'hr'`
- **Department Restriction**: Can only be assigned to employees in the **Human Resources** department.
- **Typical Responsibilities**:
  - Employee onboarding and offboarding
  - Leave management
  - Payroll processing
  - Employee records management
  - Compliance and policy enforcement

### 2. IT (Information Technology)
- **Description**: Sub-role for employees in the IT department.
- **Database Value**: `sub_role = 'it'`
- **Department Restriction**: Can only be assigned to employees in the **IT** department.
- **Typical Responsibilities**:
  - System administration
  - User account management
  - Technical support
  - System maintenance and updates
  - Data backup and security

---

## Permissions and Capabilities

### Employee Role Permissions
- View own profile information
- View own attendance records
- Apply for leave
- View own leave history
- View own payroll information
- Update own contact information (limited)

### Admin Role Permissions
**All Employee permissions, plus:**
- Create, edit, and delete employees
- Create, edit, and delete departments
- Create, edit, and delete positions
- Manage all attendance records (clock in/out for employees, mark overtime, mark absent, mark leave)
- Approve/reject leave requests for all employees
- Manage payroll for all employees
- View all system reports and analytics
- Manage user accounts and roles
- Access to all system modules

**HR Admin Specific:**
- Full access to employee records and HR processes
- Payroll management
- Leave policy management
- Compliance reporting

**IT Admin Specific:**
- System configuration and settings
- User account management
- Technical system maintenance
- Database management

### Supervisor Role Permissions
**All Employee permissions, plus:**
- View all employees in their department
- Approve/reject leave requests for employees in their department
- View attendance records for employees in their department
- Mark attendance (overtime, absent, leave) for employees in their department
- View reports for their department
- Limited employee management (cannot create/delete employees)

**HR Supervisor Specific:**
- Oversee HR processes within the department
- Manage leave requests for department employees
- Monitor attendance and compliance

**IT Supervisor Specific:**
- Oversee IT projects and tasks
- Manage technical support requests
- Monitor system usage within the department

---

## Department-Based Role Restrictions

The system enforces strict department-based restrictions for sub-roles to ensure proper organizational structure:

### Rule 1: IT Department → IT Sub-Role Only
- Employees in the **IT** department can **only** be assigned the **IT** sub-role.
- Attempting to assign the **HR** sub-role to an IT department employee will result in a validation error.
- **Example Error**: "IT department employees can only have 'it' as sub_role."

### Rule 2: Human Resources Department → HR Sub-Role Only
- Employees in the **Human Resources** department can **only** be assigned the **HR** sub-role.
- Attempting to assign the **IT** sub-role to an HR department employee will result in a validation error.
- **Example Error**: "Human Resources department employees can only have 'hr' as sub_role."

### Rule 3: Other Departments
- Employees in other departments (e.g., Sales, Marketing, Finance) **cannot** be assigned Admin or Supervisor privileges with sub-roles.
- Only IT and HR departments support sub-roles in the current system implementation.

### Implementation Details
- **Frontend Validation**: The AddModal and EditModal components dynamically filter available sub-roles based on the selected department.
- **Backend Validation**: The `employeeController.js` validates sub-role assignments during employee creation and updates.

---

## One Supervisor Per Department Rule

To maintain clear organizational hierarchy, the system enforces a **one supervisor per department** rule:

### Rule Details
- Each department can have **only one** employee with the **Supervisor** role.
- When attempting to grant Supervisor privilege to an employee, the system checks if the department already has a supervisor.
- If a supervisor already exists, the system prevents the assignment and displays an error.

### Error Message
"This department already has a supervisor. Only one supervisor is allowed per department."

### Implementation
- **Frontend Check**: The `checkDepartmentSupervisor()` function in AddModal and EditModal queries the employee list to check for existing supervisors.
- **Backend Enforcement**: The backend should also validate this rule (recommended for future enhancement).

### Changing Supervisors
To change the supervisor of a department:
1. Edit the current supervisor and change their role to **Employee**.
2. Then, edit the new employee and grant them **Supervisor** privilege.

---

## Role Assignment During Employee Creation

When creating a new employee using the **AddModal** component:

### Step 1: Basic Information
- Enter employee's personal information (name, birthdate, gender, etc.)
- Select **Department** and **Position**

### Step 2: Authentication (Step 4 in AddModal)
- Enter **Username** and **Password**
- **Grant Admin Privilege** checkbox:
  - Check this box to assign the **Admin** role
  - Unchecking this box will default to **Employee** role
- **Grant Supervisor Privilege** checkbox:
  - Check this box to assign the **Supervisor** role
  - Unchecking this box will default to **Employee** role
- **Mutual Exclusivity**: Only one privilege can be granted at a time. Checking one automatically unchecks the other.

### Step 3: Sub-Role Selection
- If Admin or Supervisor privilege is granted, a **Sub-Role** dropdown appears.
- The dropdown is **dynamically filtered** based on the selected department:
  - **IT Department**: Only "IT" option is available
  - **Human Resources Department**: Only "HR" option is available
- **Required Field**: Sub-role is mandatory when granting Admin or Supervisor privilege.

### Step 4: Validation
- **Sub-Role Validation**: Ensures the selected sub-role matches the department.
- **Supervisor Validation**: Checks if the department already has a supervisor (if granting Supervisor privilege).
- **Error Display**: Validation errors are displayed below the respective fields.

### Step 5: Submission
- Upon successful validation, the employee is created with:
  - `role`: 'admin', 'supervisor', or 'employee'
  - `sub_role`: 'hr', 'it', or NULL (if employee role)
  - `created_by`: Current user's ID
  - `created_at`: Timestamp of creation
- An activity log entry is created to track the employee creation.

---

## Role Assignment During Employee Editing

When editing an existing employee using the **EditModal** component:

### Step 1: Load Employee Data
- The modal fetches the employee's current information, including their role and sub-role.
- The role management checkboxes are pre-populated based on the current role:
  - **Admin**: "Grant Admin Privilege" is checked
  - **Supervisor**: "Grant Supervisor Privilege" is checked
  - **Employee**: Both checkboxes are unchecked

### Step 2: Modify Role
- **Grant Admin Privilege** checkbox:
  - Check to change role to **Admin**
  - Uncheck to revert to **Employee**
- **Grant Supervisor Privilege** checkbox:
  - Check to change role to **Supervisor**
  - Uncheck to revert to **Employee**
- **Mutual Exclusivity**: Only one privilege can be active at a time.

### Step 3: Sub-Role Selection
- If Admin or Supervisor privilege is granted, the **Sub-Role** dropdown appears.
- The dropdown is **dynamically filtered** based on the employee's department.
- The current sub-role is pre-selected if it exists.

### Step 4: Validation
- **Sub-Role Validation**: Ensures the selected sub-role matches the department.
- **Supervisor Validation**: Checks if the department already has a supervisor (excluding the current employee).
- **Error Display**: Validation errors are displayed below the respective fields.

### Step 5: Save Changes
- Upon successful validation, the employee's role and sub-role are updated.
- The `updated_by` field is set to the current user's ID.
- An activity log entry is created to track the role change.

---

## Identifying User Roles in the System

### 1. Database Query
To identify a user's role in the database:
```sql
SELECT user_id, username, role, sub_role 
FROM users 
WHERE user_id = ?;
```

### 2. Frontend (AuthContext)
The `AuthContext` provides the current user's information:
```typescript
import { useAuth } from "@/contexts/AuthContext";

const { user } = useAuth();
console.log(user?.role); // 'admin', 'supervisor', or 'employee'
console.log(user?.sub_role); // 'hr', 'it', or null
```

### 3. Backend (JWT Token)
The `verifyToken` middleware decodes the JWT token and sets `req.user`:
```javascript
const role = req.user?.role; // 'admin', 'supervisor', or 'employee'
const subRole = req.user?.sub_role; // 'hr', 'it', or null
```

### 4. Employee Record
To get role information from an employee record:
```sql
SELECT e.employee_id, e.first_name, e.last_name, u.role, u.sub_role
FROM employees e
LEFT JOIN users u ON e.user_id = u.user_id
WHERE e.employee_id = ?;
```

---

## Examples of Typical Users

### Example 1: Regular Employee
- **Name**: John Doe
- **Department**: Sales
- **Position**: Sales Representative
- **Role**: `employee`
- **Sub-Role**: `NULL`
- **Capabilities**: View own profile, apply for leave, view own attendance and payroll

### Example 2: HR Admin
- **Name**: Jane Smith
- **Department**: Human Resources
- **Position**: HR Manager
- **Role**: `admin`
- **Sub-Role**: `hr`
- **Capabilities**: Full system access, manage all employees, process payroll, approve leaves, manage HR policies

### Example 3: IT Admin
- **Name**: Mike Johnson
- **Department**: IT
- **Position**: IT Manager
- **Role**: `admin`
- **Sub-Role**: `it`
- **Capabilities**: Full system access, manage user accounts, system configuration, technical maintenance

### Example 4: HR Supervisor
- **Name**: Sarah Williams
- **Department**: Human Resources
- **Position**: HR Supervisor
- **Role**: `supervisor`
- **Sub-Role**: `hr`
- **Capabilities**: Manage HR department employees, approve leaves for HR team, view HR department reports

### Example 5: IT Supervisor
- **Name**: David Brown
- **Department**: IT
- **Position**: IT Team Lead
- **Role**: `supervisor`
- **Sub-Role**: `it`
- **Capabilities**: Manage IT department employees, oversee IT projects, approve leaves for IT team

---

## Summary

The HRIS role system provides a flexible yet controlled approach to managing user permissions:

1. **Three Primary Roles**: Employee (default), Admin (full access), Supervisor (department-level access)
2. **Two Sub-Roles**: HR (Human Resources) and IT (Information Technology)
3. **Department Restrictions**: Sub-roles are strictly tied to departments (IT dept → IT sub-role, HR dept → HR sub-role)
4. **One Supervisor Rule**: Each department can have only one supervisor
5. **Role Assignment**: Roles can be assigned during employee creation or editing through checkboxes and dropdowns
6. **Validation**: Frontend and backend validation ensure proper role assignments
7. **Audit Trail**: All role changes are tracked with `created_by`, `updated_by`, and activity logs

This system ensures proper access control, maintains organizational hierarchy, and provides clear audit trails for all role-related changes.

