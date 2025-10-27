-- ===========================
-- INITIAL DATA SEEDING (SAFE RESEED VERSION)
-- ===========================

-- Disable FK constraints for reseeding
SET FOREIGN_KEY_CHECKS = 0;

-- ===========================
-- TRUNCATE TABLES (IN CORRECT ORDER)
-- ===========================
TRUNCATE TABLE activity_logs;
TRUNCATE TABLE attendance;
TRUNCATE TABLE leaves;
TRUNCATE TABLE employee_emails;
TRUNCATE TABLE employee_contact_numbers;
TRUNCATE TABLE employee_addresses;
TRUNCATE TABLE dependant_contact;
TRUNCATE TABLE dependant_email;
TRUNCATE TABLE dependant_address;
TRUNCATE TABLE dependants;
TRUNCATE TABLE employees;
TRUNCATE TABLE user_roles;
TRUNCATE TABLE job_positions;
TRUNCATE TABLE departments;
TRUNCATE TABLE users;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ===========================
-- INITIAL DATA SEEDING
-- ===========================

-- USERS
-- Password "admin123" and "employee123" hashed using bcrypt (10 salt rounds)
INSERT INTO users (username, password, role, is_active, created_by)
VALUES
('admin', '$2b$10$oTgzQ4u5puIYcLTrzMwbmOaALazu4MFwkGA.2L9gJWBirc/Xnf.ry', 'admin', TRUE, 1),
('employee', '$2b$10$w3thhOHFn/KPt4RMeF65I.jxKlh/DMkr7e93mNoocHmB6PA.h5s/O', 'employee', TRUE, 1);

-- DEPARTMENTS
INSERT INTO departments (department_name, description, created_by)
VALUES
('Human Resources', 'Handles employee records, recruitment, and payroll', 1),
('Finance', 'Manages company budget, expenses, and salaries', 1),
('IT', 'Maintains company systems and databases', 1);

-- JOB POSITIONS
INSERT INTO job_positions (position_name, position_code, position_desc, department_id, salary, availability, created_by)
VALUES
-- HR Department Positions
('HR Manager', 'POS-0001', 'Oversees HR operations and employee management', 1, 45000.00, 1, 1),
('HR Specialist', 'POS-0002', 'Handles recruitment and employee relations', 1, 35000.00, 1, 1),
('Recruiter', 'POS-0003', 'Sources and screens job candidates', 1, 32000.00, 1, 1),
-- Finance Department Positions
('Finance Manager', 'POS-0004', 'Manages financial operations and reporting', 2, 50000.00, 1, 1),
('Finance Officer', 'POS-0005', 'Handles accounting and payroll computations', 2, 40000.00, 1, 1),
('Accountant', 'POS-0006', 'Maintains financial records and reports', 2, 38000.00, 1, 1),
-- IT Department Positions
('IT Manager', 'POS-0007', 'Oversees IT infrastructure and projects', 3, 55000.00, 1, 1),
('Software Developer', 'POS-0008', 'Develops and maintains software applications', 3, 45000.00, 1, 1),
('IT Support Specialist', 'POS-0009', 'Maintains hardware and software systems', 3, 38000.00, 1, 1),
('System Administrator', 'POS-0010', 'Manages servers and network infrastructure', 3, 42000.00, 1, 1);

-- EMPLOYEES
INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, extension_name, birthdate, gender, civil_status, position_id, department_id, shift, salary, hire_date, status, leave_credit, created_by)
VALUES
('EMP-0001', 2, 'Juan', 'Dela Cruz', 'Santos', NULL, '1998-06-15', 'male', 'single', 9, 3, 'morning', 38000.00, '2023-05-01', 'active', 15, 1);

-- USER ROLES
INSERT INTO user_roles (user_id, sub_role, created_by)
VALUES
(1, 'hr', 1);

-- EMPLOYEE ADDRESSES
-- Note: Using region/province/city names as codes (matching cascading dropdown implementation)
INSERT INTO employee_addresses (employee_id, region_code, province_code, city_code, barangay, street_address, created_by)
VALUES
(1, 'NCR', 'Metro Manila', 'Quezon City', 'San Jose', '123 Main Street', 1);

-- EMPLOYEE CONTACT NUMBERS
INSERT INTO employee_contact_numbers (employee_id, contact_number, created_by)
VALUES
(1, '09171234567', 1);

-- EMPLOYEE EMAILS
INSERT INTO employee_emails (employee_id, email, created_by)
VALUES
(1, 'juan.delacruz@example.com', 1);

-- ATTENDANCE
INSERT INTO attendance (attendance_code, employee_id, date, time_in, time_out, status, overtime_hours, created_by)
VALUES
('ATT-0001', 1, CURDATE(), CONCAT(CURDATE(), ' 08:00:00'), CONCAT(CURDATE(), ' 17:00:00'), 'present', 1.5, 1);

-- LEAVES
INSERT INTO leaves (leave_code, employee_id, leave_type, start_date, end_date, status, remarks, created_by)
VALUES
('LEV-0001', 1, 'vacation', '2025-05-01', '2025-05-03', 'approved', 'Family trip', 1);

-- OPTIONAL: ACTIVITY LOG (for testing)
INSERT INTO activity_logs (user_id, action, module, description, created_by)
VALUES
(1, 'INSERT', 'users', 'Initial admin and employee accounts created', 1),
(1, 'INSERT', 'departments', 'Seeded initial departments (HR, Finance, IT)', 1),
(1, 'INSERT', 'employees', 'Added sample employee Juan Dela Cruz', 1);

-- ===========================
-- END OF INITIAL SEED
-- ===========================
