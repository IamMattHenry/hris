-- ===========================
-- INSERT MISSING INITIAL DATA
-- ===========================
-- This script inserts the missing initial data that should have been created
-- by the 02_insert_data.sql script

-- First, let's check what data already exists and insert only what's missing

-- 1. INSERT MISSING USERS (if not already present)
-- Check: SELECT COUNT(*) FROM users WHERE username IN ('admin', 'employee');
-- Expected: 2 (admin and employee users)

-- 2. INSERT MISSING USER ROLES (if not already present)
-- Check: SELECT COUNT(*) FROM user_roles WHERE user_id = 1 AND sub_role = 'hr';
-- Expected: 1 (admin user with hr sub_role)

-- 3. INSERT MISSING DEPARTMENTS (if not already present)
-- Check: SELECT COUNT(*) FROM departments;
-- Expected: 2 (HR and IT)

-- 4. INSERT MISSING JOB POSITIONS (if not already present)
-- Check: SELECT COUNT(*) FROM job_positions;
-- Expected: 7 (3 HR + 4 IT positions)

-- 5. INSERT MISSING EMPLOYEE ADDRESSES
-- For employee_id = 1 (Juan Dela Cruz)
INSERT IGNORE INTO employee_addresses (employee_id, region_name, province_name, city_name, home_address, created_by, created_at)
VALUES
(1, 'NCR', 'Metro Manila', 'Quezon City', 'San Jose', '123 Main Street', 1, NOW());

-- 6. INSERT MISSING ATTENDANCE RECORDS
-- For employee_id = 1 (Juan Dela Cruz)
INSERT IGNORE INTO attendance (employee_id, date, time_in, time_out, status, overtime_hours, created_by, created_at)
VALUES
(1, CURDATE(), CONCAT(CURDATE(), ' 08:00:00'), CONCAT(CURDATE(), ' 17:00:00'), 'present', 1.5, 1, NOW());

-- 7. INSERT MISSING LEAVE RECORDS
-- For employee_id = 1 (Juan Dela Cruz)
INSERT IGNORE INTO leaves (employee_id, leave_type, start_date, end_date, status, remarks, created_by, created_at)
VALUES
(1, 'vacation', '2025-05-01', '2025-05-03', 'approved', 'Family trip', 1, NOW());

-- 8. INSERT MISSING DEPENDENTS
-- For employee_id = 1 (Juan Dela Cruz)
INSERT IGNORE INTO dependants (dependant_code, employee_id, firstname, lastname, relationship, birth_date, created_by, created_at)
VALUES
('DEP-0001', 1, 'Maria', 'Dela Cruz', 'child', '2015-03-20', 1, NOW());

-- 9. INSERT MISSING DEPENDANT EMAIL
-- For dependant_id = 1 (Maria Dela Cruz)
INSERT IGNORE INTO dependant_email (dependant_id, email, created_by, created_at)
VALUES
(1, 'maria.delacruz@example.com', 1, NOW());

-- 10. INSERT MISSING DEPENDANT CONTACT
-- For dependant_id = 1 (Maria Dela Cruz)
INSERT IGNORE INTO dependant_contact (dependant_id, contact_no, created_by, created_at)
VALUES
(1, '09171234568', 1, NOW());

-- 11. INSERT MISSING DEPENDANT ADDRESS
-- For dependant_id = 1 (Maria Dela Cruz)
INSERT IGNORE INTO dependant_address (dependant_id, region_name, province_name, city_name, home_address, created_by, created_at)
VALUES
(1, 'NCR', 'Metro Manila', 'Quezon City', '123 Main Street', 1, NOW());

-- 12. INSERT MISSING ACTIVITY LOGS
INSERT IGNORE INTO activity_logs (user_id, action, module, description, created_by, created_at)
VALUES
(1, 'INSERT', 'users', 'Initial admin and employee accounts created', 1, NOW()),
(1, 'INSERT', 'departments', 'Seeded initial departments (HR, IT)', 1, NOW()),
(1, 'INSERT', 'job_positions', 'Seeded 7 job positions for HR and IT departments', 1, NOW()),
(1, 'INSERT', 'employees', 'Added sample employee Juan Dela Cruz', 1, NOW()),
(1, 'INSERT', 'user_roles', 'Assigned HR sub-role to admin user', 1, NOW()),
(1, 'INSERT', 'employee_addresses', 'Added address for Juan Dela Cruz', 1, NOW()),
(1, 'INSERT', 'employee_contact_numbers', 'Added contact number for Juan Dela Cruz', 1, NOW()),
(1, 'INSERT', 'employee_emails', 'Added email for Juan Dela Cruz', 1, NOW()),
(1, 'INSERT', 'attendance', 'Added sample attendance record', 1, NOW()),
(1, 'INSERT', 'leaves', 'Added sample leave request', 1, NOW()),
(1, 'INSERT', 'dependants', 'Added dependent for Juan Dela Cruz', 1, NOW());

-- 13. FIX EMPLOYEE CODE FOR FIRST EMPLOYEE (if NULL)
UPDATE employees SET employee_code = 'EMP-0001' WHERE employee_id = 1 AND employee_code IS NULL;

-- ===========================
-- VERIFICATION QUERIES
-- ===========================
-- Run these queries to verify all data has been inserted correctly

SELECT '=== VERIFICATION RESULTS ===' AS status;

SELECT CONCAT('Users: ', COUNT(*)) AS result FROM users;
SELECT CONCAT('User Roles: ', COUNT(*)) AS result FROM user_roles;
SELECT CONCAT('Departments: ', COUNT(*)) AS result FROM departments;
SELECT CONCAT('Job Positions: ', COUNT(*)) AS result FROM job_positions;
SELECT CONCAT('Employees: ', COUNT(*)) AS result FROM employees;
SELECT CONCAT('Employee Addresses: ', COUNT(*)) AS result FROM employee_addresses;
SELECT CONCAT('Employee Contact Numbers: ', COUNT(*)) AS result FROM employee_contact_numbers;
SELECT CONCAT('Employee Emails: ', COUNT(*)) AS result FROM employee_emails;
SELECT CONCAT('Attendance Records: ', COUNT(*)) AS result FROM attendance;
SELECT CONCAT('Leave Records: ', COUNT(*)) AS result FROM leaves;
SELECT CONCAT('Dependents: ', COUNT(*)) AS result FROM dependants;
SELECT CONCAT('Dependant Emails: ', COUNT(*)) AS result FROM dependant_email;
SELECT CONCAT('Dependant Contacts: ', COUNT(*)) AS result FROM dependant_contact;
SELECT CONCAT('Dependant Addresses: ', COUNT(*)) AS result FROM dependant_address;
SELECT CONCAT('Activity Logs: ', COUNT(*)) AS result FROM activity_logs;

-- ===========================
-- END OF MISSING DATA INSERT
-- ===========================

