
-- ===========================
-- INITIAL DATA SEEDING
-- ===========================
-- Note: All passwords are hashed using bcrypt (10 salt rounds)
-- Password: admin123 -> $2b$10$oTgzQ4u5puIYcLTrzMwbmOaALazu4MFwkGA.2L9gJWBirc/Xnf.ry
-- Password: password123 -> $2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG

-- ===========================
-- DEPARTMENTS (Insert first, before users/employees)
-- ===========================
INSERT INTO departments (department_code, department_name, description, supervisor_id, created_by, created_at)
VALUES
('DEP-0001', 'Human Resources', 'Handles employee records, recruitment, and payroll', NULL, 1, NOW()),
('DEP-0002', 'IT', 'Maintains company systems and databases', NULL, 1, NOW()),
('DEP-0003', 'Front Desk', 'Handles reception, visitor management, and front office operations', NULL, 1, NOW());

-- ===========================
-- JOB POSITIONS
-- ===========================
INSERT INTO job_positions (position_name, position_code, position_desc, department_id, salary, availability, created_by, created_at)
VALUES
-- HR Department Positions
('HR Manager', 'POS-0001', 'Oversees HR operations and employee management', 1, 45000.00, 1, 1, NOW()),
('HR Specialist', 'POS-0002', 'Handles recruitment and employee relations', 1, 35000.00, 1, 1, NOW()),
('Recruiter', 'POS-0003', 'Sources and screens job candidates', 1, 32000.00, 1, 1, NOW()),
('HR Assistant', 'POS-0004', 'Provides administrative support to HR department', 1, 28000.00, 1, 1, NOW()),

-- IT Department Positions
('IT Manager', 'POS-0005', 'Oversees IT infrastructure and projects', 2, 55000.00, 1, 1, NOW()),
('Software Developer', 'POS-0006', 'Develops and maintains software applications', 2, 45000.00, 1, 1, NOW()),
('IT Support Specialist', 'POS-0007', 'Maintains hardware and software systems', 2, 38000.00, 1, 1, NOW()),
('System Administrator', 'POS-0008', 'Manages servers and network infrastructure', 2, 42000.00, 1, 1, NOW()),

-- Front Desk Department Positions
('Front Desk Manager', 'POS-0009', 'Oversees front desk operations and staff', 3, 35000.00, 1, 1, NOW()),
('Receptionist', 'POS-0010', 'Greets visitors and handles front desk duties', 3, 25000.00, 1, 1, NOW()),
('Front Desk Associate', 'POS-0011', 'Assists with reception and administrative tasks', 3, 23000.00, 1, 1, NOW());

-- ===========================
-- USERS AND EMPLOYEES
-- ===========================
-- Note: We insert users first, then employees, then update user_roles

-- 1. SUPERADMIN (user_id: 1)
-- Username: superadmin | Password: admin123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('superadmin', '$2b$10$oTgzQ4u5puIYcLTrzMwbmOaALazu4MFwkGA.2L9gJWBirc/Xnf.ry', 'superadmin', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, salary, created_by, created_at)
VALUES ('EMP-0001', 1, 'Super', 'Admin', 'System', '1985-01-01', 'male', 'single', '123 Admin St', 'Quezon City', 'NCR', 'Metro Manila', 1, 'morning', '2020-01-01', 'active', 1, 15, 80000.00, 1, NOW());

-- 2. HR ADMIN (user_id: 2)
-- Username: hradmin | Password: password123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('hradmin', '$2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG', 'admin', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, salary, created_by, created_at)
VALUES ('EMP-0002', 2, 'Maria', 'Santos', 'Cruz', '1990-03-15', 'female', 'married', '456 HR Ave', 'Makati City', 'NCR', 'Metro Manila', 1, 'morning', '2021-02-01', 'active', 1, 15, 45000.00, 1, NOW());

INSERT INTO user_roles (user_id, sub_role, created_by, created_at)
VALUES (2, 'hr', 1, NOW());

-- 3. IT ADMIN (user_id: 3)
-- Username: itadmin | Password: password123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('itadmin', '$2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG', 'admin', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, salary, created_by, created_at)
VALUES ('EMP-0003', 3, 'Juan', 'Dela Cruz', 'Reyes', '1988-07-20', 'male', 'single', '789 Tech Blvd', 'Pasig City', 'NCR', 'Metro Manila', 5, 'morning', '2021-03-01', 'active', 2, 15, 55000.00, 1, NOW());

INSERT INTO user_roles (user_id, sub_role, created_by, created_at)
VALUES (3, 'it', 1, NOW());

-- 4. FRONT DESK ADMIN (user_id: 4)
-- Username: frontdeskadmin | Password: password123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('frontdeskadmin', '$2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG', 'admin', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, salary, created_by, created_at)
VALUES ('EMP-0004', 4, 'Ana', 'Garcia', 'Lopez', '1992-05-10', 'female', 'single', '321 Front St', 'Manila', 'NCR', 'Metro Manila', 9, 'morning', '2021-04-01', 'active', 3, 15, 35000.00, 1, NOW());

INSERT INTO user_roles (user_id, sub_role, created_by, created_at)
VALUES (4, 'front_desk', 1, NOW());

-- 5. HR SUPERVISOR (user_id: 5)
-- Username: hrsupervisor | Password: password123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('hrsupervisor', '$2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG', 'supervisor', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, supervisor_id, salary, created_by, created_at)
VALUES ('EMP-0005', 5, 'Pedro', 'Ramos', 'Silva', '1987-11-25', 'male', 'married', '654 Supervisor Ln', 'Quezon City', 'NCR', 'Metro Manila', 2, 'morning', '2021-05-01', 'active', 1, 15, 2, 40000.00, 1, NOW());

INSERT INTO user_roles (user_id, sub_role, created_by, created_at)
VALUES (5, 'hr', 1, NOW());

-- 6. IT SUPERVISOR (user_id: 6)
-- Username: itsupervisor | Password: password123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('itsupervisor', '$2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG', 'supervisor', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, supervisor_id, salary, created_by, created_at)
VALUES ('EMP-0006', 6, 'Carlos', 'Mendoza', 'Torres', '1986-09-18', 'male', 'married', '789 IT Supervisor St', 'Makati City', 'NCR', 'Metro Manila', 5, 'morning', '2021-05-15', 'active', 2, 15, 3, 50000.00, 1, NOW());

INSERT INTO user_roles (user_id, sub_role, created_by, created_at)
VALUES (6, 'it', 1, NOW());

-- 7. FRONT DESK SUPERVISOR (user_id: 7)
-- Username: frontdesksupervisor | Password: password123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('frontdesksupervisor', '$2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG', 'supervisor', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, supervisor_id, salary, created_by, created_at)
VALUES ('EMP-0007', 7, 'Rosa', 'Martinez', 'Fernandez', '1989-04-12', 'female', 'single', '321 Front Desk Supervisor Ave', 'Manila', 'NCR', 'Metro Manila', 9, 'morning', '2021-06-01', 'active', 3, 15, 4, 38000.00, 1, NOW());

INSERT INTO user_roles (user_id, sub_role, created_by, created_at)
VALUES (7, 'front_desk', 1, NOW());

-- 8-9. HR EMPLOYEES
-- Username: hremployee1 | Password: password123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('hremployee1', '$2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG', 'employee', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, supervisor_id, salary, created_by, created_at)
VALUES ('EMP-0008', 8, 'Lisa', 'Tan', 'Wong', '1995-06-22', 'female', 'single', '258 HR Plaza', 'Mandaluyong', 'NCR', 'Metro Manila', 4, 'morning', '2022-01-15', 'active', 1, 15, 5, 28000.00, 1, NOW());

-- Username: hremployee2 | Password: password123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('hremployee2', '$2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG', 'employee', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, supervisor_id, salary, created_by, created_at)
VALUES ('EMP-0009', 9, 'Mark', 'Villanueva', 'Castro', '1994-08-30', 'male', 'single', '369 Recruitment St', 'Quezon City', 'NCR', 'Metro Manila', 3, 'morning', '2022-02-01', 'active', 1, 15, 5, 32000.00, 1, NOW());

-- 10-11. IT EMPLOYEES
-- Username: itemployee1 | Password: password123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('itemployee1', '$2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG', 'employee', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, supervisor_id, salary, created_by, created_at)
VALUES ('EMP-0010', 10, 'James', 'Lim', 'Chen', '1993-12-05', 'male', 'single', '741 Dev Center', 'Makati City', 'NCR', 'Metro Manila', 6, 'morning', '2022-03-01', 'active', 2, 15, 6, 45000.00, 1, NOW());

-- Username: itemployee2 | Password: password123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('itemployee2', '$2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG', 'employee', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, supervisor_id, salary, created_by, created_at)
VALUES ('EMP-0011', 11, 'Sarah', 'Gomez', 'Rivera', '1996-02-14', 'female', 'single', '852 Support Hub', 'Pasig City', 'NCR', 'Metro Manila', 7, 'night', '2022-04-01', 'active', 2, 15, 6, 38000.00, 1, NOW());

-- 12-13. FRONT DESK EMPLOYEES
-- Username: receptionist1 | Password: password123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('receptionist1', '$2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG', 'employee', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, supervisor_id, salary, created_by, created_at)
VALUES ('EMP-0012', 12, 'Jenny', 'Cruz', 'Bautista', '1997-10-08', 'female', 'single', '963 Lobby Ave', 'Manila', 'NCR', 'Metro Manila', 10, 'morning', '2022-05-01', 'active', 3, 15, 7, 25000.00, 1, NOW());

-- Username: receptionist2 | Password: password123
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES ('receptionist2', '$2a$10$P4d0WRBcLHPwPHwM2ys60.8VkOpwnzAeMXmbTg1.tOLoMJUIKbNfG', 'employee', TRUE, 1, NOW());

INSERT INTO employees (employee_code, user_id, first_name, last_name, middle_name, birthdate, gender, civil_status, home_address, city, region, province, position_id, shift, hire_date, status, department_id, leave_credit, supervisor_id, salary, created_by, created_at)
VALUES ('EMP-0013', 13, 'Michael', 'Reyes', 'Santos', '1998-03-27', 'male', 'single', '159 Front Office', 'Pasay City', 'NCR', 'Metro Manila', 11, 'night', '2022-06-01', 'active', 3, 15, 7, 23000.00, 1, NOW());

-- ===========================
-- UPDATE DEPARTMENT SUPERVISORS
-- ===========================
UPDATE departments SET supervisor_id = 5 WHERE department_id = 1; -- HR Supervisor (EMP-0005)
UPDATE departments SET supervisor_id = 6 WHERE department_id = 2; -- IT Supervisor (EMP-0006)
UPDATE departments SET supervisor_id = 7 WHERE department_id = 3; -- Front Desk Supervisor (EMP-0007)

-- ===========================
-- EMPLOYEE CONTACT NUMBERS
-- ===========================
INSERT INTO employee_contact_numbers (employee_id, contact_number, created_by, created_at)
VALUES
(1, '+63 917 123 4567', 1, NOW()),
(2, '+63 918 234 5678', 1, NOW()),
(3, '+63 919 345 6789', 1, NOW()),
(4, '+63 920 456 7890', 1, NOW()),
(5, '+63 921 567 8901', 1, NOW()),
(6, '+63 922 678 9012', 1, NOW()),
(7, '+63 923 789 0123', 1, NOW()),
(8, '+63 924 890 1234', 1, NOW()),
(9, '+63 925 901 2345', 1, NOW()),
(10, '+63 926 012 3456', 1, NOW()),
(11, '+63 927 123 4567', 1, NOW()),
(12, '+63 928 234 5678', 1, NOW()),
(13, '+63 929 345 6789', 1, NOW());

-- ===========================
-- EMPLOYEE EMAILS
-- ===========================
INSERT INTO employee_emails (employee_id, email, created_by, created_at)
VALUES
(1, 'superadmin@company.com', 1, NOW()),
(2, 'maria.santos@company.com', 1, NOW()),
(3, 'juan.delacruz@company.com', 1, NOW()),
(4, 'ana.garcia@company.com', 1, NOW()),
(5, 'pedro.ramos@company.com', 1, NOW()),
(6, 'carlos.mendoza@company.com', 1, NOW()),
(7, 'rosa.martinez@company.com', 1, NOW()),
(8, 'lisa.tan@company.com', 1, NOW()),
(9, 'mark.villanueva@company.com', 1, NOW()),
(10, 'james.lim@company.com', 1, NOW()),
(11, 'sarah.gomez@company.com', 1, NOW()),
(12, 'jenny.cruz@company.com', 1, NOW()),
(13, 'michael.reyes@company.com', 1, NOW());

-- ===========================
-- EMPLOYEE ADDRESSES
-- ===========================
INSERT INTO employee_addresses (employee_id, region_name, province_name, city_name, home_address, created_by, created_at)
VALUES
(1, 'NCR', 'Metro Manila', 'Quezon City', '123 Admin St, Brgy. Central', 1, NOW()),
(2, 'NCR', 'Metro Manila', 'Makati City', '456 HR Ave, Brgy. Poblacion', 1, NOW()),
(3, 'NCR', 'Metro Manila', 'Pasig City', '789 Tech Blvd, Brgy. Kapitolyo', 1, NOW()),
(4, 'NCR', 'Metro Manila', 'Manila', '321 Front St, Brgy. Ermita', 1, NOW()),
(5, 'NCR', 'Metro Manila', 'Quezon City', '654 Supervisor Ln, Brgy. Diliman', 1, NOW()),
(6, 'NCR', 'Metro Manila', 'Makati City', '789 IT Supervisor St, Brgy. Salcedo', 1, NOW()),
(7, 'NCR', 'Metro Manila', 'Manila', '321 Front Desk Supervisor Ave, Brgy. Malate', 1, NOW()),
(8, 'NCR', 'Metro Manila', 'Mandaluyong', '258 HR Plaza, Brgy. Highway Hills', 1, NOW()),
(9, 'NCR', 'Metro Manila', 'Quezon City', '369 Recruitment St, Brgy. Cubao', 1, NOW()),
(10, 'NCR', 'Metro Manila', 'Makati City', '741 Dev Center, Brgy. Bel-Air', 1, NOW()),
(11, 'NCR', 'Metro Manila', 'Pasig City', '852 Support Hub, Brgy. Ortigas', 1, NOW()),
(12, 'NCR', 'Metro Manila', 'Manila', '963 Lobby Ave, Brgy. Intramuros', 1, NOW()),
(13, 'NCR', 'Metro Manila', 'Pasay City', '159 Front Office, Brgy. Baclaran', 1, NOW());

-- ===========================
-- ATTENDANCE RECORDS (October 2024)
-- Mix of present, late, absent, on_leave with overtime hours
-- ===========================
INSERT INTO attendance (attendance_code, employee_id, date, time_in, time_out, status, overtime_hours, created_by, created_at)
VALUES
-- Week 1: Oct 1-5, 2024
('ATT-0001', 1, '2024-10-01', '2024-10-01 08:00:00', '2024-10-01 17:00:00', 'present', 0, 1, NOW()),
('ATT-0002', 2, '2024-10-01', '2024-10-01 08:15:00', '2024-10-01 17:00:00', 'late', 0, 1, NOW()),
('ATT-0003', 3, '2024-10-01', '2024-10-01 08:00:00', '2024-10-01 19:30:00', 'present', 2.5, 1, NOW()),
('ATT-0004', 4, '2024-10-01', '2024-10-01 08:00:00', '2024-10-01 17:00:00', 'present', 0, 1, NOW()),
('ATT-0005', 5, '2024-10-01', '2024-10-01 08:30:00', '2024-10-01 17:00:00', 'late', 0, 1, NOW()),
('ATT-0006', 6, '2024-10-01', '2024-10-01 08:00:00', '2024-10-01 20:00:00', 'present', 3, 1, NOW()),
('ATT-0007', 7, '2024-10-01', '2024-10-01 08:00:00', '2024-10-01 17:00:00', 'present', 0, 1, NOW()),
('ATT-0008', 8, '2024-10-01', '2024-10-01 08:00:00', '2024-10-01 17:00:00', 'present', 0, 1, NOW()),
('ATT-0009', 9, '2024-10-01', '2024-10-01 08:00:00', '2024-10-01 18:30:00', 'present', 1.5, 1, NOW()),
('ATT-0010', 10, '2024-10-01', '2024-10-01 08:00:00', '2024-10-01 21:00:00', 'present', 4, 1, NOW()),
('ATT-0011', 11, '2024-10-01', '2024-10-01 20:00:00', '2024-10-02 04:00:00', 'present', 0, 1, NOW()),
('ATT-0012', 12, '2024-10-01', '2024-10-01 08:00:00', '2024-10-01 17:00:00', 'present', 0, 1, NOW()),
('ATT-0013', 13, '2024-10-01', '2024-10-01 20:00:00', '2024-10-02 04:00:00', 'present', 0, 1, NOW()),

('ATT-0014', 1, '2024-10-02', '2024-10-02 08:00:00', '2024-10-02 17:00:00', 'present', 0, 1, NOW()),
('ATT-0015', 2, '2024-10-02', '2024-10-02 08:00:00', '2024-10-02 17:00:00', 'present', 0, 1, NOW()),
('ATT-0016', 3, '2024-10-02', '2024-10-02 08:00:00', '2024-10-02 18:00:00', 'present', 1, 1, NOW()),
('ATT-0017', 4, '2024-10-02', '2024-10-02 08:20:00', '2024-10-02 17:00:00', 'late', 0, 1, NOW()),
('ATT-0018', 5, '2024-10-02', '2024-10-02 08:00:00', '2024-10-02 17:00:00', 'present', 0, 1, NOW()),
('ATT-0019', 6, '2024-10-02', '2024-10-02 08:00:00', '2024-10-02 19:00:00', 'present', 2, 1, NOW()),
('ATT-0020', 7, '2024-10-02', '2024-10-02 08:10:00', '2024-10-02 17:00:00', 'late', 0, 1, NOW()),
('ATT-0021', 8, '2024-10-02', '2024-10-02 08:00:00', '2024-10-02 17:00:00', 'present', 0, 1, NOW()),
('ATT-0022', 10, '2024-10-02', '2024-10-02 08:00:00', '2024-10-02 20:30:00', 'present', 3.5, 1, NOW()),
('ATT-0023', 11, '2024-10-02', '2024-10-02 20:00:00', '2024-10-03 04:00:00', 'present', 0, 1, NOW()),
('ATT-0024', 12, '2024-10-02', '2024-10-02 08:00:00', '2024-10-02 17:00:00', 'present', 0, 1, NOW()),
('ATT-0025', 13, '2024-10-02', '2024-10-02 20:00:00', '2024-10-03 04:00:00', 'present', 0, 1, NOW()),

('ATT-0026', 1, '2024-10-03', '2024-10-03 08:00:00', '2024-10-03 19:00:00', 'present', 2, 1, NOW()),
('ATT-0027', 2, '2024-10-03', '2024-10-03 08:00:00', '2024-10-03 17:00:00', 'present', 0, 1, NOW()),
('ATT-0028', 3, '2024-10-03', '2024-10-03 08:00:00', '2024-10-03 22:00:00', 'present', 5, 1, NOW()),
('ATT-0029', 4, '2024-10-03', '2024-10-03 08:00:00', '2024-10-03 17:00:00', 'present', 0, 1, NOW()),
('ATT-0030', 5, '2024-10-03', '2024-10-03 08:25:00', '2024-10-03 17:00:00', 'late', 0, 1, NOW()),
('ATT-0031', 6, '2024-10-03', '2024-10-03 08:00:00', '2024-10-03 18:30:00', 'present', 1.5, 1, NOW()),
('ATT-0032', 7, '2024-10-03', '2024-10-03 08:00:00', '2024-10-03 17:00:00', 'present', 0, 1, NOW()),
('ATT-0033', 8, '2024-10-03', '2024-10-03 08:00:00', '2024-10-03 17:00:00', 'present', 0, 1, NOW()),
('ATT-0034', 9, '2024-10-03', '2024-10-03 08:00:00', '2024-10-03 17:00:00', 'present', 0, 1, NOW()),
('ATT-0035', 10, '2024-10-03', '2024-10-03 08:00:00', '2024-10-03 19:30:00', 'present', 2.5, 1, NOW()),
('ATT-0036', 11, '2024-10-03', '2024-10-03 20:00:00', '2024-10-04 05:00:00', 'present', 1, 1, NOW()),
('ATT-0037', 12, '2024-10-03', '2024-10-03 08:00:00', '2024-10-03 17:00:00', 'present', 0, 1, NOW()),
('ATT-0038', 13, '2024-10-03', '2024-10-03 20:00:00', '2024-10-04 04:00:00', 'present', 0, 1, NOW()),

-- Oct 4, 2024 (Friday) - Employee 9 on leave
('ATT-0039', 1, '2024-10-04', '2024-10-04 08:00:00', '2024-10-04 17:00:00', 'present', 0, 1, NOW()),
('ATT-0040', 2, '2024-10-04', '2024-10-04 08:00:00', '2024-10-04 17:00:00', 'present', 0, 1, NOW()),
('ATT-0041', 3, '2024-10-04', '2024-10-04 08:00:00', '2024-10-04 20:00:00', 'present', 3, 1, NOW()),
('ATT-0042', 4, '2024-10-04', '2024-10-04 08:00:00', '2024-10-04 17:00:00', 'present', 0, 1, NOW()),
('ATT-0043', 5, '2024-10-04', '2024-10-04 08:00:00', '2024-10-04 17:00:00', 'present', 0, 1, NOW()),
('ATT-0044', 6, '2024-10-04', '2024-10-04 08:00:00', '2024-10-04 19:30:00', 'present', 2.5, 1, NOW()),
('ATT-0045', 7, '2024-10-04', '2024-10-04 08:00:00', '2024-10-04 17:00:00', 'present', 0, 1, NOW()),
('ATT-0046', 8, '2024-10-04', '2024-10-04 08:35:00', '2024-10-04 17:00:00', 'late', 0, 1, NOW()),
('ATT-0047', 9, '2024-10-04', NULL, NULL, 'on_leave', 0, 1, NOW()),
('ATT-0048', 10, '2024-10-04', '2024-10-04 08:00:00', '2024-10-04 18:00:00', 'present', 1, 1, NOW()),
('ATT-0049', 11, '2024-10-04', '2024-10-04 20:00:00', '2024-10-05 04:00:00', 'present', 0, 1, NOW()),
('ATT-0050', 12, '2024-10-04', '2024-10-04 08:00:00', '2024-10-04 17:00:00', 'present', 0, 1, NOW()),
('ATT-0051', 13, '2024-10-04', '2024-10-04 20:00:00', '2024-10-05 04:00:00', 'present', 0, 1, NOW()),

-- Week 2: Oct 7-11, 2024
('ATT-0052', 1, '2024-10-07', '2024-10-07 08:00:00', '2024-10-07 17:00:00', 'present', 0, 1, NOW()),
('ATT-0053', 2, '2024-10-07', '2024-10-07 08:00:00', '2024-10-07 17:00:00', 'present', 0, 1, NOW()),
('ATT-0054', 3, '2024-10-07', '2024-10-07 08:00:00', '2024-10-07 21:00:00', 'present', 4, 1, NOW()),
('ATT-0055', 4, '2024-10-07', '2024-10-07 08:00:00', '2024-10-07 17:00:00', 'present', 0, 1, NOW()),
('ATT-0056', 5, '2024-10-07', '2024-10-07 08:00:00', '2024-10-07 17:00:00', 'present', 0, 1, NOW()),
('ATT-0057', 6, '2024-10-07', '2024-10-07 08:00:00', '2024-10-07 18:00:00', 'present', 1, 1, NOW()),
('ATT-0058', 7, '2024-10-07', '2024-10-07 08:20:00', '2024-10-07 17:00:00', 'late', 0, 1, NOW()),
('ATT-0059', 8, '2024-10-07', '2024-10-07 08:00:00', '2024-10-07 17:00:00', 'present', 0, 1, NOW()),
('ATT-0060', 9, '2024-10-07', '2024-10-07 08:00:00', '2024-10-07 17:00:00', 'present', 0, 1, NOW()),
('ATT-0061', 10, '2024-10-07', '2024-10-07 08:00:00', '2024-10-07 22:00:00', 'present', 5, 1, NOW()),
('ATT-0062', 11, '2024-10-07', '2024-10-07 20:00:00', '2024-10-08 04:00:00', 'present', 0, 1, NOW()),
('ATT-0063', 12, '2024-10-07', '2024-10-07 08:00:00', '2024-10-07 17:00:00', 'present', 0, 1, NOW()),
('ATT-0064', 13, '2024-10-07', '2024-10-07 20:00:00', '2024-10-08 04:00:00', 'present', 0, 1, NOW()),

-- Oct 8 - Employee 12 absent
('ATT-0065', 1, '2024-10-08', '2024-10-08 08:00:00', '2024-10-08 17:00:00', 'present', 0, 1, NOW()),
('ATT-0066', 2, '2024-10-08', '2024-10-08 08:00:00', '2024-10-08 17:00:00', 'present', 0, 1, NOW()),
('ATT-0067', 3, '2024-10-08', '2024-10-08 08:00:00', '2024-10-08 19:00:00', 'present', 2, 1, NOW()),
('ATT-0068', 4, '2024-10-08', '2024-10-08 08:15:00', '2024-10-08 17:00:00', 'late', 0, 1, NOW()),
('ATT-0069', 5, '2024-10-08', '2024-10-08 08:00:00', '2024-10-08 17:00:00', 'present', 0, 1, NOW()),
('ATT-0070', 6, '2024-10-08', '2024-10-08 08:00:00', '2024-10-08 20:00:00', 'present', 3, 1, NOW()),
('ATT-0071', 7, '2024-10-08', '2024-10-08 08:00:00', '2024-10-08 17:00:00', 'present', 0, 1, NOW()),
('ATT-0072', 8, '2024-10-08', '2024-10-08 08:00:00', '2024-10-08 17:00:00', 'present', 0, 1, NOW()),
('ATT-0073', 9, '2024-10-08', '2024-10-08 08:00:00', '2024-10-08 18:30:00', 'present', 1.5, 1, NOW()),
('ATT-0074', 10, '2024-10-08', '2024-10-08 08:00:00', '2024-10-08 19:00:00', 'present', 2, 1, NOW()),
('ATT-0075', 11, '2024-10-08', '2024-10-08 20:00:00', '2024-10-09 04:00:00', 'present', 0, 1, NOW()),
('ATT-0076', 12, '2024-10-08', NULL, NULL, 'absent', 0, 1, NOW()),
('ATT-0077', 13, '2024-10-08', '2024-10-08 20:00:00', '2024-10-09 04:00:00', 'present', 0, 1, NOW()),

-- Oct 9 - Multiple lates
('ATT-0078', 1, '2024-10-09', '2024-10-09 08:00:00', '2024-10-09 17:00:00', 'present', 0, 1, NOW()),
('ATT-0079', 2, '2024-10-09', '2024-10-09 08:30:00', '2024-10-09 17:00:00', 'late', 0, 1, NOW()),
('ATT-0080', 3, '2024-10-09', '2024-10-09 08:00:00', '2024-10-09 18:30:00', 'present', 1.5, 1, NOW()),
('ATT-0081', 4, '2024-10-09', '2024-10-09 08:45:00', '2024-10-09 17:00:00', 'late', 0, 1, NOW()),
('ATT-0082', 5, '2024-10-09', '2024-10-09 08:20:00', '2024-10-09 17:00:00', 'late', 0, 1, NOW()),
('ATT-0083', 6, '2024-10-09', '2024-10-09 08:00:00', '2024-10-09 19:30:00', 'present', 2.5, 1, NOW()),
('ATT-0084', 7, '2024-10-09', '2024-10-09 08:15:00', '2024-10-09 17:00:00', 'late', 0, 1, NOW()),
('ATT-0085', 8, '2024-10-09', '2024-10-09 08:00:00', '2024-10-09 17:00:00', 'present', 0, 1, NOW()),
('ATT-0086', 9, '2024-10-09', '2024-10-09 08:00:00', '2024-10-09 17:00:00', 'present', 0, 1, NOW()),
('ATT-0087', 10, '2024-10-09', '2024-10-09 08:00:00', '2024-10-09 21:30:00', 'present', 4.5, 1, NOW()),
('ATT-0088', 11, '2024-10-09', '2024-10-09 20:00:00', '2024-10-10 05:30:00', 'present', 1.5, 1, NOW()),
('ATT-0089', 12, '2024-10-09', '2024-10-09 08:00:00', '2024-10-09 17:00:00', 'present', 0, 1, NOW()),
('ATT-0090', 13, '2024-10-09', '2024-10-09 20:00:00', '2024-10-10 04:00:00', 'present', 0, 1, NOW());

-- ===========================
-- LEAVE REQUESTS
-- ===========================
INSERT INTO leaves (leave_code, employee_id, leave_type, start_date, end_date, status, remarks, approved_by, created_by, created_at)
VALUES
('LEV-0001', 9, 'vacation', '2024-10-04', '2024-10-04', 'approved', 'Family event', 5, 9, '2024-09-28 10:00:00'),
('LEV-0002', 12, 'sick', '2024-10-08', '2024-10-08', 'approved', 'Flu symptoms', 7, 12, '2024-10-07 18:30:00'),
('LEV-0003', 8, 'vacation', '2024-10-15', '2024-10-16', 'approved', 'Personal matters', 5, 8, '2024-10-01 09:00:00'),
('LEV-0004', 11, 'sick', '2024-10-22', '2024-10-23', 'approved', 'Medical checkup', 6, 11, '2024-10-20 14:00:00'),
('LEV-0005', 4, 'emergency', '2024-10-25', '2024-10-25', 'approved', 'Family emergency', 7, 4, '2024-10-24 08:00:00'),
('LEV-0006', 10, 'vacation', '2024-11-05', '2024-11-07', 'pending', 'Planned vacation', NULL, 10, '2024-10-28 11:00:00'),
('LEV-0007', 2, 'sick', '2024-11-12', '2024-11-13', 'pending', 'Scheduled medical procedure', NULL, 2, '2024-10-30 15:00:00'),
('LEV-0008', 13, 'vacation', '2024-11-20', '2024-11-22', 'rejected', 'Insufficient leave credits', 7, 13, '2024-10-29 10:30:00'),
('LEV-0009', 5, 'others', '2024-09-15', '2024-09-15', 'approved', 'Training seminar', 2, 5, '2024-09-10 09:00:00'),
('LEV-0010', 7, 'vacation', '2024-12-23', '2024-12-27', 'pending', 'Christmas holiday', NULL, 7, '2024-11-01 08:00:00');

-- ===========================
-- DEPENDANTS
-- ===========================
INSERT INTO dependants (dependant_code, employee_id, firstname, lastname, relationship, birth_date, created_by, created_at)
VALUES
('DEP-0001', 2, 'Miguel', 'Santos', 'Spouse', '1989-05-20', 1, NOW()),
('DEP-0002', 2, 'Sofia', 'Santos', 'Child', '2015-08-12', 1, NOW()),
('DEP-0003', 5, 'Carmen', 'Ramos', 'Spouse', '1990-02-14', 1, NOW()),
('DEP-0004', 5, 'Luis', 'Ramos', 'Child', '2018-06-22', 1, NOW()),
('DEP-0005', 6, 'Isabella', 'Mendoza', 'Spouse', '1988-11-30', 1, NOW()),
('DEP-0006', 6, 'Diego', 'Mendoza', 'Child', '2016-03-15', 1, NOW()),
('DEP-0007', 6, 'Elena', 'Mendoza', 'Child', '2019-09-08', 1, NOW()),
('DEP-0008', 1, 'Roberto', 'Admin', 'Parent', '1960-04-10', 1, NOW()),
('DEP-0009', 3, 'Teresa', 'Dela Cruz', 'Mother', '1965-07-25', 1, NOW()),
('DEP-0010', 10, 'Patricia', 'Lim', 'Spouse', '1994-01-18', 1, NOW());

-- ===========================
-- DEPENDANT CONTACT NUMBERS
-- ===========================
INSERT INTO dependant_contact (dependant_id, contact_no, created_by, created_at)
VALUES
(1, '+63 917 555 1234', 1, NOW()),
(2, '+63 918 555 2345', 1, NOW()),
(3, '+63 919 555 3456', 1, NOW()),
(5, '+63 920 555 4567', 1, NOW()),
(8, '+63 921 555 5678', 1, NOW()),
(10, '+63 922 555 6789', 1, NOW());

-- ===========================
-- DEPENDANT EMAILS
-- ===========================
INSERT INTO dependant_email (dependant_id, email, created_by, created_at)
VALUES
(1, 'miguel.santos@email.com', 1, NOW()),
(3, 'carmen.ramos@email.com', 1, NOW()),
(5, 'isabella.mendoza@email.com', 1, NOW()),
(8, 'roberto.admin@email.com', 1, NOW()),
(10, 'patricia.lim@email.com', 1, NOW());

-- ===========================
-- DEPENDANT ADDRESSES
-- ===========================
INSERT INTO dependant_address (dependant_id, region_name, province_name, city_name, home_address, created_by, created_at)
VALUES
(1, 'NCR', 'Metro Manila', 'Makati City', '456 HR Ave, Brgy. Poblacion', 1, NOW()),
(3, 'NCR', 'Metro Manila', 'Quezon City', '654 Supervisor Ln, Brgy. Diliman', 1, NOW()),
(5, 'NCR', 'Metro Manila', 'Makati City', '789 IT Supervisor St, Brgy. Salcedo', 1, NOW()),
(8, 'NCR', 'Metro Manila', 'Quezon City', '123 Admin St, Brgy. Central', 1, NOW()),
(10, 'NCR', 'Metro Manila', 'Makati City', '741 Dev Center, Brgy. Bel-Air', 1, NOW());

-- ===========================
-- TICKETS
-- ===========================
INSERT INTO tickets (ticket_code, user_id, fixed_by, title, description, status, created_by, created_at)
VALUES
('TIC-0001', 8, 3, 'Computer not starting', 'My workstation won\'t boot up this morning', 'resolved', 8, '2024-10-01 08:30:00'),
('TIC-0002', 12, 3, 'Email access issue', 'Cannot access company email account', 'resolved', 12, '2024-10-02 09:15:00'),
('TIC-0003', 9, NULL, 'Printer not working', 'Office printer shows error message', 'in_progress', 9, '2024-10-07 10:00:00'),
('TIC-0004', 4, 3, 'Password reset request', 'Forgot my system password', 'resolved', 4, '2024-10-03 14:20:00'),
('TIC-0005', 13, NULL, 'Network connectivity', 'Slow internet connection at front desk', 'open', 13, '2024-10-09 11:30:00'),
('TIC-0006', 10, 3, 'Software installation', 'Need development tools installed', 'resolved', 10, '2024-10-04 13:00:00'),
('TIC-0007', 7, NULL, 'Phone system issue', 'Extension not receiving calls', 'open', 7, '2024-10-08 15:45:00'),
('TIC-0008', 11, 3, 'VPN access', 'Cannot connect to VPN for remote work', 'resolved', 11, '2024-10-05 16:00:00');

-- ===========================
-- ACTIVITY LOGS
-- ===========================
INSERT INTO activity_logs (user_id, action, module, description, created_by, created_at)
VALUES
(1, 'CREATE', 'employees', 'Created employee record EMP-0013', 1, '2024-09-01 10:00:00'),
(2, 'UPDATE', 'employees', 'Updated employee record EMP-0008', 2, '2024-09-15 11:30:00'),
(3, 'CREATE', 'tickets', 'Created ticket TIC-0001', 3, '2024-10-01 08:35:00'),
(3, 'UPDATE', 'tickets', 'Resolved ticket TIC-0001', 3, '2024-10-01 14:00:00'),
(5, 'APPROVE', 'leaves', 'Approved leave request LEV-0001', 5, '2024-09-29 09:00:00'),
(6, 'APPROVE', 'leaves', 'Approved leave request LEV-0004', 6, '2024-10-21 10:00:00'),
(7, 'REJECT', 'leaves', 'Rejected leave request LEV-0008', 7, '2024-10-30 14:00:00'),
(1, 'CREATE', 'attendance', 'Clock in recorded for employee ID 1 (ATT-0001)', 1, '2024-10-01 08:00:00'),
(2, 'UPDATE', 'positions', 'Updated position POS-0002 salary', 2, '2024-09-20 13:00:00'),
(3, 'CREATE', 'departments', 'Created new department', 1, '2024-08-15 09:00:00'),
(8, 'CREATE', 'tickets', 'Created ticket TIC-0001', 8, '2024-10-01 08:30:00'),
(10, 'UPDATE', 'attendance', 'Clock out recorded for employee ID 10 (ATT-0010)', 10, '2024-10-01 21:00:00'),
(12, 'CREATE', 'leaves', 'Created leave request LEV-0002', 12, '2024-10-07 18:30:00'),
(1, 'LOGIN', 'auth', 'User logged in successfully', 1, '2024-10-09 07:55:00'),
(2, 'LOGIN', 'auth', 'User logged in successfully', 2, '2024-10-09 08:00:00');