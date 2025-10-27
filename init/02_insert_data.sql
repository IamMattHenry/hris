
-- ===========================
-- INITIAL DATA SEEDING
-- ===========================
-- Note: All passwords are hashed using bcrypt (10 salt rounds)
-- admin123 -> $2b$10$oTgzQ4u5puIYcLTrzMwbmOaALazu4MFwkGA.2L9gJWBirc/Xnf.ry

-- USERS
-- user_id 1: admin (admin role)
INSERT INTO users (username, password, role, is_active, created_by, created_at)
VALUES
('admin', '$2b$10$oTgzQ4u5puIYcLTrzMwbmOaALazu4MFwkGA.2L9gJWBirc/Xnf.ry', 'admin', TRUE, 1, NOW());

-- DEPARTMENTS
INSERT INTO departments (department_name, description, supervisor_id, created_by, created_at)
VALUES
('Human Resources', 'Handles employee records, recruitment, and payroll', NULL, 1, NOW()),
('IT', 'Maintains company systems and databases', NULL, 1, NOW());

-- JOB POSITIONS
INSERT INTO job_positions (position_name, position_code, position_desc, department_id, salary, availability, created_by, created_at)
VALUES
-- HR Department Positions
('HR Manager', 'POS-0001', 'Oversees HR operations and employee management', 1, 45000.00, 1, 1, NOW()),
('HR Specialist', 'POS-0002', 'Handles recruitment and employee relations', 1, 35000.00, 1, 1, NOW()),
('Recruiter', 'POS-0003', 'Sources and screens job candidates', 1, 32000.00, 1, 1, NOW()),
-- IT Department Positions
('IT Manager', 'POS-0007', 'Oversees IT infrastructure and projects', 2, 55000.00, 1, 1, NOW()),
('Software Developer', 'POS-0008', 'Develops and maintains software applications', 2, 45000.00, 1, 1, NOW()),
('IT Support Specialist', 'POS-0009', 'Maintains hardware and software systems', 2, 38000.00, 1, 1, NOW()),
('System Administrator', 'POS-0010', 'Manages servers and network infrastructure', 2, 42000.00, 1, 1, NOW());