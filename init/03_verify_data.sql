-- ===========================
-- DATA VERIFICATION SCRIPT
-- ===========================
-- This script verifies that all initial data has been properly inserted

-- 1. VERIFY USERS TABLE
SELECT '=== USERS TABLE ===' AS verification;
SELECT user_id, username, role, is_active, created_at FROM users ORDER BY user_id;
SELECT CONCAT('Total Users: ', COUNT(*)) AS user_count FROM users;

-- 2. VERIFY USER ROLES TABLE
SELECT '=== USER ROLES TABLE ===' AS verification;
SELECT ur.user_role_id, ur.user_id, u.username, ur.sub_role, ur.created_at 
FROM user_roles ur
JOIN users u ON ur.user_id = u.user_id
ORDER BY ur.user_role_id;
SELECT CONCAT('Total User Roles: ', COUNT(*)) AS user_roles_count FROM user_roles;

-- 3. VERIFY DEPARTMENTS TABLE
SELECT '=== DEPARTMENTS TABLE ===' AS verification;
SELECT department_id, department_name, description, supervisor_id, created_at FROM departments ORDER BY department_id;
SELECT CONCAT('Total Departments: ', COUNT(*)) AS dept_count FROM departments;

-- 4. VERIFY JOB POSITIONS TABLE
SELECT '=== JOB POSITIONS TABLE ===' AS verification;
SELECT position_id, position_name, position_code, position_desc, department_id, salary, availability, created_at 
FROM job_positions ORDER BY position_id;
SELECT CONCAT('Total Job Positions: ', COUNT(*)) AS position_count FROM job_positions;

-- 5. VERIFY EMPLOYEES TABLE
SELECT '=== EMPLOYEES TABLE ===' AS verification;
SELECT e.employee_id, e.employee_code, e.user_id, u.username, e.first_name, e.last_name, 
       e.middle_name, e.extension_name, e.birthdate, e.gender, e.civil_status, 
       e.position_id, e.department_id, e.shift, e.salary, e.hire_date, 
       e.leave_credit, e.supervisor_id, e.status, e.created_at
FROM employees e
LEFT JOIN users u ON e.user_id = u.user_id
ORDER BY e.employee_id;
SELECT CONCAT('Total Employees: ', COUNT(*)) AS employee_count FROM employees;

-- 6. VERIFY EMPLOYEE ADDRESSES TABLE
SELECT '=== EMPLOYEE ADDRESSES TABLE ===' AS verification;
SELECT ea.address_id, ea.employee_id, e.first_name, e.last_name, 
       ea.region_name, ea.province_name, ea.city_name, ea.home_address, ea.created_at
FROM employee_addresses ea
LEFT JOIN employees e ON ea.employee_id = e.employee_id
ORDER BY ea.address_id;
SELECT CONCAT('Total Employee Addresses: ', COUNT(*)) AS address_count FROM employee_addresses;

-- 7. VERIFY EMPLOYEE CONTACT NUMBERS TABLE
SELECT '=== EMPLOYEE CONTACT NUMBERS TABLE ===' AS verification;
SELECT ecn.contact_id, ecn.employee_id, e.first_name, e.last_name, ecn.contact_number, ecn.created_at
FROM employee_contact_numbers ecn
LEFT JOIN employees e ON ecn.employee_id = e.employee_id
ORDER BY ecn.contact_id;
SELECT CONCAT('Total Contact Numbers: ', COUNT(*)) AS contact_count FROM employee_contact_numbers;

-- 8. VERIFY EMPLOYEE EMAILS TABLE
SELECT '=== EMPLOYEE EMAILS TABLE ===' AS verification;
SELECT ee.email_id, ee.employee_id, e.first_name, e.last_name, ee.email, ee.created_at
FROM employee_emails ee
LEFT JOIN employees e ON ee.employee_id = e.employee_id
ORDER BY ee.email_id;
SELECT CONCAT('Total Employee Emails: ', COUNT(*)) AS email_count FROM employee_emails;

-- 9. VERIFY ATTENDANCE TABLE
SELECT '=== ATTENDANCE TABLE ===' AS verification;
SELECT a.attendance_id, a.attendance_code, a.employee_id, e.first_name, e.last_name, 
       a.date, a.time_in, a.time_out, a.status, a.overtime_hours, a.created_at
FROM attendance a
LEFT JOIN employees e ON a.employee_id = e.employee_id
ORDER BY a.attendance_id;
SELECT CONCAT('Total Attendance Records: ', COUNT(*)) AS attendance_count FROM attendance;

-- 10. VERIFY LEAVES TABLE
SELECT '=== LEAVES TABLE ===' AS verification;
SELECT l.leave_id, l.leave_code, l.employee_id, e.first_name, e.last_name, 
       l.leave_type, l.start_date, l.end_date, l.status, l.remarks, l.created_at
FROM leaves l
LEFT JOIN employees e ON l.employee_id = e.employee_id
ORDER BY l.leave_id;
SELECT CONCAT('Total Leave Records: ', COUNT(*)) AS leave_count FROM leaves;

-- 11. VERIFY DEPENDENTS TABLE
SELECT '=== DEPENDENTS TABLE ===' AS verification;
SELECT d.dependant_id, d.dependant_code, d.employee_id, e.first_name, e.last_name,
       d.firstname, d.lastname, d.relationship, d.birth_date, d.created_at
FROM dependants d
LEFT JOIN employees e ON d.employee_id = e.employee_id
ORDER BY d.dependant_id;
SELECT CONCAT('Total Dependents: ', COUNT(*)) AS dependant_count FROM dependants;

-- 12. VERIFY DEPENDANT EMAIL TABLE
SELECT '=== DEPENDANT EMAIL TABLE ===' AS verification;
SELECT de.dependant_email_id, de.dependant_id, d.firstname, d.lastname, de.email, de.created_at
FROM dependant_email de
LEFT JOIN dependants d ON de.dependant_id = d.dependant_id
ORDER BY de.dependant_email_id;
SELECT CONCAT('Total Dependant Emails: ', COUNT(*)) AS dependant_email_count FROM dependant_email;

-- 13. VERIFY DEPENDANT CONTACT TABLE
SELECT '=== DEPENDANT CONTACT TABLE ===' AS verification;
SELECT dc.dependant_contact_id, dc.dependant_id, d.firstname, d.lastname, dc.contact_no, dc.created_at
FROM dependant_contact dc
LEFT JOIN dependants d ON dc.dependant_id = d.dependant_id
ORDER BY dc.dependant_contact_id;
SELECT CONCAT('Total Dependant Contacts: ', COUNT(*)) AS dependant_contact_count FROM dependant_contact;

-- 14. VERIFY DEPENDANT ADDRESS TABLE
SELECT '=== DEPENDANT ADDRESS TABLE ===' AS verification;
SELECT da.dependant_address_id, da.dependant_id, d.firstname, d.lastname,
       da.region_name, da.province_name, da.city_name, da.home_address, da.created_at
FROM dependant_address da
LEFT JOIN dependants d ON da.dependant_id = d.dependant_id
ORDER BY da.dependant_address_id;
SELECT CONCAT('Total Dependant Addresses: ', COUNT(*)) AS dependant_address_count FROM dependant_address;

-- 15. VERIFY ACTIVITY LOGS TABLE
SELECT '=== ACTIVITY LOGS TABLE ===' AS verification;
SELECT al.log_id, al.user_id, u.username, al.action, al.module, al.description, al.created_at
FROM activity_logs al
LEFT JOIN users u ON al.user_id = u.user_id
ORDER BY al.log_id;
SELECT CONCAT('Total Activity Logs: ', COUNT(*)) AS activity_log_count FROM activity_logs;

-- 16. SUMMARY OF ALL DATA
SELECT '=== DATA SUMMARY ===' AS summary;
SELECT 
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM user_roles) AS total_user_roles,
    (SELECT COUNT(*) FROM departments) AS total_departments,
    (SELECT COUNT(*) FROM job_positions) AS total_job_positions,
    (SELECT COUNT(*) FROM employees) AS total_employees,
    (SELECT COUNT(*) FROM employee_addresses) AS total_employee_addresses,
    (SELECT COUNT(*) FROM employee_contact_numbers) AS total_contact_numbers,
    (SELECT COUNT(*) FROM employee_emails) AS total_employee_emails,
    (SELECT COUNT(*) FROM attendance) AS total_attendance,
    (SELECT COUNT(*) FROM leaves) AS total_leaves,
    (SELECT COUNT(*) FROM dependants) AS total_dependents,
    (SELECT COUNT(*) FROM dependant_email) AS total_dependant_emails,
    (SELECT COUNT(*) FROM dependant_contact) AS total_dependant_contacts,
    (SELECT COUNT(*) FROM dependant_address) AS total_dependant_addresses,
    (SELECT COUNT(*) FROM activity_logs) AS total_activity_logs;

