# HRIS Organizational Hierarchy Guide

## Understanding Supervisor Relationships

### Database Fields Explained

#### 1. `users.role` (User Role)
- **Values**: `'employee'`, `'admin'`, `'supervisor'`
- **Purpose**: Defines the user's access level and permissions in the system
- **Set By**: "Grant Admin Privilege" or "Grant Supervisor Privilege" checkboxes in Step 4
- **Business Rule**: Only ONE supervisor role per department

#### 2. `employees.supervisor_id` (Reporting Structure)
- **Values**: `INT` (references another employee_id) or `NULL`
- **Purpose**: Defines WHO this employee reports to (organizational hierarchy)
- **Set By**: "Reports To (Supervisor)" dropdown in Step 2 (NOW AVAILABLE)
- **Business Rule**: Optional, can be NULL, supports multi-level hierarchy

---

## Two Independent Concepts

### Concept 1: Being a Supervisor (Role)
**Question**: "Is this person a supervisor/manager?"

**Controlled By**: 
- Step 4 → "Grant Supervisor Privilege" checkbox
- Sets `users.role = 'supervisor'`

**Example**:
```
John Smith
- Role: supervisor
- Department: Human Resources
- Meaning: John IS a supervisor in the HR department
```

### Concept 2: Having a Supervisor (Reporting)
**Question**: "Who does this person report to?"

**Controlled By**: 
- Step 2 → "Reports To (Supervisor)" dropdown
- Sets `employees.supervisor_id = [employee_id]`

**Example**:
```
Jane Doe
- supervisor_id: 5 (references John Smith's employee_id)
- Meaning: Jane REPORTS TO John
```

---

## Real-World Examples

### Example 1: Regular Employee
```
Name: Alice Johnson
Role: employee
supervisor_id: 10 (Bob Wilson)

Interpretation:
- Alice is a regular employee (not a supervisor)
- Alice reports to Bob Wilson
```

### Example 2: Supervisor Who Reports to Someone
```
Name: Bob Wilson
Role: supervisor
supervisor_id: 15 (Carol Davis)

Interpretation:
- Bob IS a supervisor (manages a team)
- Bob REPORTS TO Carol Davis (his manager)
```

### Example 3: Top-Level Manager
```
Name: Carol Davis
Role: supervisor
supervisor_id: NULL

Interpretation:
- Carol IS a supervisor (manages a team)
- Carol REPORTS TO no one (top of hierarchy)
```

### Example 4: Admin Without Supervisory Role
```
Name: David Lee
Role: admin
supervisor_id: 15 (Carol Davis)

Interpretation:
- David is an admin (system access)
- David is NOT a supervisor (doesn't manage a team)
- David REPORTS TO Carol Davis
```

---

## Multi-Level Hierarchy Example

### HR Department Structure:

```
Carol Davis (HR Director)
├─ employee_id: 15
├─ role: supervisor
├─ supervisor_id: NULL
└─ Reports to: No one

    ├── Bob Wilson (HR Manager)
    │   ├─ employee_id: 10
    │   ├─ role: supervisor
    │   ├─ supervisor_id: 15 (Carol)
    │   └─ Reports to: Carol Davis
    │
    │       ├── Alice Johnson (HR Specialist)
    │       │   ├─ employee_id: 5
    │       │   ├─ role: employee
    │       │   ├─ supervisor_id: 10 (Bob)
    │       │   └─ Reports to: Bob Wilson
    │       │
    │       └── Emma Brown (HR Assistant)
    │           ├─ employee_id: 6
    │           ├─ role: employee
    │           ├─ supervisor_id: 10 (Bob)
    │           └─ Reports to: Bob Wilson
    │
    └── Frank Green (Recruiter)
        ├─ employee_id: 7
        ├─ role: employee
        ├─ supervisor_id: 15 (Carol)
        └─ Reports to: Carol Davis
```

### Database Representation:

| employee_id | name          | role       | supervisor_id | department    |
|-------------|---------------|------------|---------------|---------------|
| 15          | Carol Davis   | supervisor | NULL          | HR            |
| 10          | Bob Wilson    | supervisor | 15            | HR            |
| 5           | Alice Johnson | employee   | 10            | HR            |
| 6           | Emma Brown    | employee   | 10            | HR            |
| 7           | Frank Green   | employee   | 15            | HR            |

---

## Common Scenarios

### Scenario 1: Creating a Department Supervisor
**Steps**:
1. Step 2: Select Department = "Human Resources"
2. Step 2: Select Position = "HR Manager"
3. Step 2: Reports To = "Carol Davis" (or NULL if top-level)
4. Step 4: Check "Grant Supervisor Privilege"
5. Step 4: Select Sub-Role = "HR"

**Result**:
- `users.role = 'supervisor'`
- `employees.supervisor_id = 15` (Carol's employee_id) or NULL
- This person IS a supervisor AND reports to Carol

### Scenario 2: Creating a Regular Employee
**Steps**:
1. Step 2: Select Department = "Human Resources"
2. Step 2: Select Position = "HR Specialist"
3. Step 2: Reports To = "Bob Wilson"
4. Step 4: Leave "Grant Supervisor Privilege" unchecked

**Result**:
- `users.role = 'employee'`
- `employees.supervisor_id = 10` (Bob's employee_id)
- This person is NOT a supervisor AND reports to Bob

### Scenario 3: Creating an Employee Without a Supervisor
**Steps**:
1. Step 2: Select Department = "Human Resources"
2. Step 2: Select Position = "HR Director"
3. Step 2: Reports To = "No Supervisor (Optional)"
4. Step 4: Check "Grant Supervisor Privilege"

**Result**:
- `users.role = 'supervisor'`
- `employees.supervisor_id = NULL`
- This person IS a supervisor AND reports to no one (top-level)

---

## Business Rules

### Rule 1: One Supervisor Per Department
- Each department can have only ONE employee with `role = 'supervisor'`
- Enforced in both frontend and backend
- Error message: "This department already has a supervisor"

### Rule 2: Supervisor Assignment is Optional
- `supervisor_id` can be NULL
- Not all employees need a supervisor
- Useful for top-level managers or independent contractors

### Rule 3: Self-Referencing is Prevented (EditModal)
- When editing an employee, they cannot select themselves as their supervisor
- Current employee is excluded from the supervisor dropdown

### Rule 4: Cross-Department Supervision is Allowed
- An employee can report to a supervisor in a different department
- No validation prevents this (by design for matrix organizations)

### Rule 5: Multi-Level Hierarchy is Supported
- Supervisors can report to other supervisors
- No limit on hierarchy depth
- No circular reference validation (future enhancement needed)

---

## UI/UX Flow

### Creating an Employee:

**Step 1: Basic Information**
- Name, birthdate, gender, address, etc.

**Step 2: Job Information** ← **SUPERVISOR ASSIGNMENT HERE**
- Department (required)
- Position (required)
- **Reports To (Supervisor)** ← NEW DROPDOWN
  - Disabled until department is selected
  - Shows: "EMP-0001 - John Doe"
  - Optional: Can select "No Supervisor"
- Hire date, shift, salary

**Step 3: Contact Information**
- Email, phone, dependents

**Step 4: Authentication** ← **SUPERVISOR PRIVILEGE HERE**
- Username, password
- **Grant Supervisor Privilege** ← CHECKBOX
  - Makes this person a supervisor
  - Only one per department
  - Requires sub-role selection

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(10) UNIQUE,
    user_id INT UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department_id INT,
    position_id INT,
    supervisor_id INT,  -- ← WHO THEY REPORT TO
    status ENUM('active', 'resigned', 'terminated', 'on-leave') DEFAULT 'active',
    ...
    FOREIGN KEY (supervisor_id) REFERENCES employees(employee_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('employee', 'admin', 'supervisor') DEFAULT 'employee',  -- ← THEIR ROLE
    ...
);
```

---

## Future Enhancements

1. **Circular Reference Prevention**: Validate that supervisor chains don't create loops
2. **Org Chart Visualization**: Display reporting structure as a tree diagram
3. **Supervisor Workload**: Show how many direct reports each supervisor has
4. **Supervisor Change History**: Track when reporting relationships change
5. **Delegation**: Allow supervisors to delegate approval authority
6. **Matrix Organization**: Support multiple supervisors (dotted-line reporting)

---

## Troubleshooting

### Issue: "Supervisor dropdown is empty"
**Cause**: No active employees in the selected department  
**Solution**: Create employees in the department first, or select a different department

### Issue: "Can't select myself as supervisor"
**Cause**: EditModal prevents self-supervision  
**Solution**: This is by design - select a different employee

### Issue: "Supervisor dropdown is disabled"
**Cause**: Department not selected yet  
**Solution**: Select a department first (cascading selection)

### Issue: "supervisor_id is NULL in database"
**Cause**: "No Supervisor (Optional)" was selected  
**Solution**: This is valid - not all employees need a supervisor

---

## Summary

✅ **supervisor_id** = WHO you report to (organizational hierarchy)  
✅ **role = 'supervisor'** = WHETHER you are a supervisor (access level)  
✅ These are **independent** - you can be a supervisor AND report to someone  
✅ Multi-level hierarchy is **fully supported**  
✅ Supervisor assignment is **optional** (can be NULL)  
✅ One supervisor role per department, but unlimited reporting relationships

