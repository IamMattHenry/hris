-- ===========================
-- USER MANAGEMENT QUERIES
-- ===========================
-- This file contains useful queries for managing users in the HRIS system

-- ===========================
-- VIEW ALL USERS
-- ===========================
-- SELECT * FROM users;

-- ===========================
-- VIEW ALL ADMINS WITH DETAILS
-- ===========================
-- SELECT 
--     u.user_id,
--     u.username,
--     u.role,
--     a.sub_role,
--     e.first_name,
--     e.last_name,
--     u.created_at
-- FROM users u
-- LEFT JOIN admins a ON u.user_id = a.user_id
-- LEFT JOIN employees e ON a.employee_id = e.employee_id
-- WHERE u.role = 'admin';

-- ===========================
-- VIEW ALL EMPLOYEES WITH DETAILS
-- ===========================
-- SELECT 
--     u.user_id,
--     u.username,
--     u.role,
--     e.employee_id,
--     e.first_name,
--     e.last_name,
--     jp.position_name,
--     d.department_name,
--     e.status,
--     u.created_at
-- FROM users u
-- LEFT JOIN employees e ON u.user_id = e.user_id
-- LEFT JOIN job_positions jp ON e.position_id = jp.position_id
-- LEFT JOIN departments d ON jp.department_id = d.department_id
-- WHERE u.role = 'employee';

-- ===========================
-- CREATE ADMIN USER
-- ===========================
-- Note: Replace the hashed password with actual bcryptjs hash
-- Use: node scripts/hash-password.js <password>
-- 
-- INSERT INTO users (username, password, role) VALUES
-- ('admin_username', '$2b$10$...hashed_password...', 'admin');

-- ===========================
-- CREATE EMPLOYEE USER
-- ===========================
-- Step 1: Create user
-- INSERT INTO users (username, password, role) VALUES
-- ('employee_username', '$2b$10$...hashed_password...', 'employee');
--
-- Step 2: Create employee record (replace USER_ID with the ID from step 1)
-- INSERT INTO employees (user_id, first_name, last_name, position_id, hire_date, status) VALUES
-- (USER_ID, 'First', 'Last', POSITION_ID, '2024-01-15', 'active');

-- ===========================
-- CHANGE USER ROLE
-- ===========================
-- UPDATE users SET role = 'admin' WHERE username = 'username';
-- UPDATE users SET role = 'employee' WHERE username = 'username';

-- ===========================
-- RESET USER PASSWORD
-- ===========================
-- Note: Replace the hashed password with actual bcryptjs hash
-- UPDATE users SET password = '$2b$10$...new_hashed_password...' WHERE username = 'username';

-- ===========================
-- DELETE USER (Cascades to employee and admin records)
-- ===========================
-- DELETE FROM users WHERE username = 'username';

-- ===========================
-- GET USER BY USERNAME
-- ===========================
-- SELECT * FROM users WHERE username = 'username';

-- ===========================
-- GET USER BY ID
-- ===========================
-- SELECT * FROM users WHERE user_id = 1;

-- ===========================
-- COUNT USERS BY ROLE
-- ===========================
-- SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- ===========================
-- FIND DUPLICATE USERNAMES
-- ===========================
-- SELECT username, COUNT(*) as count FROM users GROUP BY username HAVING count > 1;

-- ===========================
-- GET ADMIN WITH SUB-ROLE
-- ===========================
-- SELECT 
--     u.user_id,
--     u.username,
--     a.sub_role,
--     e.first_name,
--     e.last_name
-- FROM users u
-- JOIN admins a ON u.user_id = a.user_id
-- JOIN employees e ON a.employee_id = e.employee_id
-- WHERE a.sub_role = 'hr';

-- ===========================
-- GET EMPLOYEE WITH POSITION AND DEPARTMENT
-- ===========================
-- SELECT 
--     u.user_id,
--     u.username,
--     e.first_name,
--     e.last_name,
--     jp.position_name,
--     d.department_name,
--     e.status
-- FROM users u
-- JOIN employees e ON u.user_id = e.user_id
-- LEFT JOIN job_positions jp ON e.position_id = jp.position_id
-- LEFT JOIN departments d ON jp.department_id = d.department_id
-- WHERE u.role = 'employee';

-- ===========================
-- DEACTIVATE USER (Set employee status to inactive)
-- ===========================
-- UPDATE employees SET status = 'resigned' WHERE user_id = USER_ID;

-- ===========================
-- REACTIVATE USER
-- ===========================
-- UPDATE employees SET status = 'active' WHERE user_id = USER_ID;

-- ===========================
-- GET ACTIVE EMPLOYEES
-- ===========================
-- SELECT 
--     u.user_id,
--     u.username,
--     e.first_name,
--     e.last_name,
--     e.status
-- FROM users u
-- JOIN employees e ON u.user_id = e.user_id
-- WHERE e.status = 'active';

-- ===========================
-- GET INACTIVE EMPLOYEES
-- ===========================
-- SELECT 
--     u.user_id,
--     u.username,
--     e.first_name,
--     e.last_name,
--     e.status
-- FROM users u
-- JOIN employees e ON u.user_id = e.user_id
-- WHERE e.status IN ('resigned', 'terminated');

-- ===========================
-- EXAMPLE: CREATE ADMIN USER WITH PASSWORD 'admin123'
-- ===========================
-- Password hash for 'admin123': $2b$10$rF5k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8
-- INSERT INTO users (username, password, role) VALUES
-- ('admin', '$2b$10$rF5k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8', 'admin');

-- ===========================
-- EXAMPLE: CREATE EMPLOYEE USER WITH PASSWORD 'password'
-- ===========================
-- Password hash for 'password': $2b$10$rF5k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8
-- Step 1: Create user
-- INSERT INTO users (username, password, role) VALUES
-- ('john.doe', '$2b$10$rF5k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8', 'employee');
--
-- Step 2: Create employee record (assuming user_id = 2)
-- INSERT INTO employees (user_id, first_name, last_name, position_id, hire_date, status) VALUES
-- (2, 'John', 'Doe', 3, '2024-01-15', 'active');

-- ===========================
-- USEFUL VIEWS
-- ===========================

-- View: All Users with Role
-- CREATE VIEW v_users_with_role AS
-- SELECT 
--     user_id,
--     username,
--     role,
--     created_at
-- FROM users;

-- View: All Employees with Full Details
-- CREATE VIEW v_employees_full AS
-- SELECT 
--     u.user_id,
--     u.username,
--     e.employee_id,
--     e.first_name,
--     e.last_name,
--     jp.position_name,
--     d.department_name,
--     e.status,
--     e.hire_date
-- FROM users u
-- LEFT JOIN employees e ON u.user_id = e.user_id
-- LEFT JOIN job_positions jp ON e.position_id = jp.position_id
-- LEFT JOIN departments d ON jp.department_id = d.department_id
-- WHERE u.role = 'employee';

-- View: All Admins with Details
-- CREATE VIEW v_admins_full AS
-- SELECT 
--     u.user_id,
--     u.username,
--     a.admin_id,
--     a.sub_role,
--     e.first_name,
--     e.last_name
-- FROM users u
-- LEFT JOIN admins a ON u.user_id = a.user_id
-- LEFT JOIN employees e ON a.employee_id = e.employee_id
-- WHERE u.role = 'admin';

