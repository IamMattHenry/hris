-- Insert into user table first (required for admin and employee)
INSERT INTO user (username, password, role) VALUES
('admin', '$2b$10$rF5k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8', 'admin'),
('john.doe', '$2b$10$rF5k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8', 'employee'),
('jane.smith', '$2b$10$rF5k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8', 'employee'),
('bob.johnson', '$2b$10$rF5k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8L3k8', 'admin');

-- Insert admin records (references user table)
INSERT INTO admin (user_id, first_name, last_name, email, sub_role, contact_number) VALUES
(1, 'System', 'Admin', 'admin@company.com', 'hr', '555-0101'),
(4, 'Robert', 'Johnson', 'robert@company.com', 'manager', '555-0104');

-- Insert departments
INSERT INTO department (department_name, description) VALUES
('Human Resources', 'Handles all HR-related functions including recruitment and employee relations'),
('Engineering', 'Responsible for product development and technical solutions'),
('Finance', 'Manages financial operations, accounting, and payroll'),
('Marketing', 'Handles marketing campaigns and brand management'),
('Operations', 'Oversees daily business operations');

-- Insert job positions (references department table)
INSERT INTO job_position (position_name, position_desc, department_id, salary, availability) VALUES
('HR Manager', 'Manages HR department and policies', 1, 80000.00, 1),
('HR Assistant', 'Supports HR operations and recruitment', 1, 45000.00, 2),
('Software Engineer', 'Develops and maintains software applications', 2, 95000.00, 3),
('Senior Software Engineer', 'Leads development teams and architecture', 2, 120000.00, 1),
('QA Engineer', 'Ensures quality through testing and validation', 2, 70000.00, 2),
('Accountant', 'Manages financial records and reporting', 3, 65000.00, 1),
('Financial Analyst', 'Analyzes financial data and trends', 3, 75000.00, 1),
('Marketing Manager', 'Leads marketing initiatives and campaigns', 4, 85000.00, 1),
('Marketing Specialist', 'Executes marketing campaigns and content', 4, 55000.00, 2),
('Operations Manager', 'Oversees daily business operations', 5, 90000.00, 1);

-- Insert employee records (references user and job_position tables)
INSERT INTO employee (user_id, first_name, last_name, email, birthdate, position_id, hire_date, contact_number, socmed_link, status) VALUES
(2, 'John', 'Doe', 'john.doe@company.com', '1990-05-15', 3, '2020-01-15', '555-0102', 'https://linkedin.com/in/johndoe', 'active'),
(1, 'Jane', 'Smith', 'jane.smith@company.com', '1988-11-22', 5, '2019-03-10', '555-0103', 'https://linkedin.com/in/janesmith', 'active');

-- Insert attendance records (references employee table)
INSERT INTO attendance (employee_id, date, time_in, time_out, status, overtime_hours) VALUES
(2, '2023-01-15', '08:45:00', '17:30:00', 'late', 1.5),
(2, '2023-01-16', '08:30:00', '17:15:00', 'present', 0.75),
(2, '2023-01-17', '08:55:00', '17:45:00', 'late', 2.0),
(1, '2023-01-15', '09:00:00', '18:00:00', 'present', 1.5),
(1, '2023-01-16', '08:45:00', '17:30:00', 'present', 0.5),
(1, '2023-01-17', '08:30:00', '17:00:00', 'present', 0);

-- Insert employee leave records (references employee table)
INSERT INTO employee_leave (employee_id, leave_type, start_date, end_date, status, remarks) VALUES
(2, 'vacation', '2023-02-01', '2023-02-05', 'approved', 'Annual vacation'),
(2, 'sick', '2023-03-15', '2023-03-16', 'approved', 'Medical appointment'),
(1, 'emergency', '2023-02-10', '2023-02-11', 'approved', 'Family emergency'),
(1, 'vacation', '2023-04-01', '2023-04-07', 'pending', 'Planned vacation');

-- Insert payroll records (references employee table)
INSERT INTO payroll (employee_id, pay_period_start, pay_period_end, basic_pay, overtime_pay, deductions, net_pay) VALUES
(1, '2023-01-01', '2023-01-15', 3692.31, 115.38, 500.00, 3307.69),
(1, '2023-01-16', '2023-01-31', 3692.31, 57.69, 500.00, 3250.00),
(1, '2023-01-01', '2023-01-15', 2708.33, 115.38, 400.00, 2423.71),
(2, '2023-01-16', '2023-01-31', 2708.33, 38.46, 400.00, 2346.79);