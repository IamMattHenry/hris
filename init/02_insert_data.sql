-- ===========================
-- INITIAL DATA SEEDING
-- ===========================

-- USERS
-- Password "admin123" and "employee123" hashed using bcrypt (10 salt rounds)
-- Hashes below are valid bcrypt hashes
INSERT INTO users (username, password, role)
VALUES 
('admin', '$2b$10$oTgzQ4u5puIYcLTrzMwbmOaALazu4MFwkGA.2L9gJWBirc/Xnf.ry', 'admin'),
('employee', '$2b$10$w3thhOHFn/KPt4RMeF65I.jxKlh/DMkr7e93mNoocHmB6PA.h5s/O', 'employee');

-- DEPARTMENTS
INSERT INTO departments (department_code, department_name, description)
VALUES
('DEP-0001', 'Human Resources', 'Handles employee records, recruitment, and payroll'),
('DEP-0002', 'Finance', 'Manages company budget, expenses, and salaries'),
('DEP-0003', 'IT', 'Maintains company systems and databases');

-- JOB POSITIONS
INSERT INTO job_positions (position_code, position_name, position_desc, department_id, salary, availability)
VALUES
-- HR Department Positions
('POS-0001', 'HR Manager', 'Oversees HR operations and employee management', 1, 45000.00, 1),
('POS-0002', 'HR Specialist', 'Handles recruitment and employee relations', 1, 35000.00, 1),
('POS-0003', 'Recruiter', 'Sources and screens job candidates', 1, 32000.00, 1),
-- Finance Department Positions
('POS-0004', 'Finance Manager', 'Manages financial operations and reporting', 2, 50000.00, 1),
('POS-0005', 'Finance Officer', 'Handles accounting and payroll computations', 2, 40000.00, 1),
('POS-0006', 'Accountant', 'Maintains financial records and reports', 2, 38000.00, 1),
-- IT Department Positions
('POS-0007', 'IT Manager', 'Oversees IT infrastructure and projects', 3, 55000.00, 1),
('POS-0008', 'Software Developer', 'Develops and maintains software applications', 3, 45000.00, 1),
('POS-0009', 'IT Support Specialist', 'Maintains hardware and software systems', 3, 38000.00, 1),
('POS-0010', 'System Administrator', 'Manages servers and network infrastructure', 3, 42000.00, 1);

-- EMPLOYEES
INSERT INTO employees (employee_code, user_id, first_name, last_name, birthdate, gender, civil_status, home_address, city, region, position_id, hire_date, status)
VALUES
('EMP-0001', 2, 'Juan', 'Dela Cruz', '1998-06-15', 'male', 'single', '123 Main Street, Barangay San Jose', 'Quezon City', 'NCR', 9, '2023-05-01', 'active');

-- ADMINS
INSERT INTO admins (admin_code, employee_id, user_id, sub_role)
VALUES
('ADM-0001', 1, 2, 'hr');

-- EMPLOYEE CONTACT NUMBERS
INSERT INTO employee_contact_numbers (employee_id, contact_number)
VALUES
(1, '09171234567');

-- EMPLOYEE EMAILS
INSERT INTO employee_emails (employee_id, email)
VALUES
(1, 'juan.delacruz@example.com');

-- ATTENDANCE (optional initial entry)
INSERT INTO attendance (attendance_code, employee_id, date, time_in, time_out, status, overtime_hours)
VALUES
('ATT-0001', 1, CURDATE(), '08:00:00', '17:00:00', 'present', 1.5);

-- LEAVES (optional)
INSERT INTO leaves (leave_code, employee_id, leave_type, start_date, end_date, status, remarks)
VALUES
('LEV-0001', 1, 'vacation', '2025-05-01', '2025-05-03', 'approved', 'Family trip');

-- PAYROLL (optional)
INSERT INTO payroll (payroll_code, employee_id, pay_period_start, pay_period_end, basic_pay, overtime_pay, deductions, net_pay)
VALUES
('PAY-0001', 1, '2025-05-01', '2025-05-15', 38000.00, 1500.00, 500.00, 39000.00);
