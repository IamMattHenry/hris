
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