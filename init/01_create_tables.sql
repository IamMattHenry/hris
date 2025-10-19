-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employee') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_code VARCHAR(10) UNIQUE,
    department_name VARCHAR(100) NOT NULL,
    description TEXT,
    CHECK (department_code REGEXP '^DEP-[0-9]{4}$')
);

-- JOB POSITIONS TABLE
CREATE TABLE IF NOT EXISTS job_positions (
    position_id INT AUTO_INCREMENT PRIMARY KEY,
    position_code VARCHAR(10) UNIQUE,
    position_name VARCHAR(100) NOT NULL,
    position_desc VARCHAR(255),
    department_id INT,
    salary DECIMAL(10,2),
    availability INT DEFAULT 0,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    CHECK (position_code REGEXP '^POS-[0-9]{4}$')
);

-- EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(10) UNIQUE,
    user_id INT UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birthdate DATE,
    position_id INT,
    hire_date DATE,
    status ENUM('active', 'resigned', 'terminated') DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES job_positions(position_id) ON DELETE SET NULL,
    CHECK (employee_code REGEXP '^EMP-[0-9]{4}$')
);

-- ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_code VARCHAR(10) UNIQUE,
    employee_id INT NOT NULL,
    user_id INT NOT NULL,
    sub_role ENUM('hr', 'manager', 'finance', 'it') NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY (employee_id),
    CHECK (admin_code REGEXP '^ADM-[0-9]{4}$')
);

-- EMPLOYEE CONTACT NUMBERS TABLE
CREATE TABLE IF NOT EXISTS employee_contact_numbers (
    contact_number_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- EMPLOYEE EMAILS TABLE
CREATE TABLE IF NOT EXISTS employee_emails (
    email_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    email VARCHAR(100) NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    attendance_code VARCHAR(10) UNIQUE,
    employee_id INT NOT NULL,
    date DATE NOT NULL,
    time_in TIME,
    time_out TIME,
    status ENUM('present', 'absent', 'late', 'on_leave') NOT NULL,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    UNIQUE KEY (employee_id, date),
    CHECK (attendance_code REGEXP '^ATT-[0-9]{4}$')
);

-- LEAVES TABLE
CREATE TABLE IF NOT EXISTS leaves (
    leave_id INT AUTO_INCREMENT PRIMARY KEY,
    leave_code VARCHAR(10) UNIQUE,
    employee_id INT NOT NULL,
    leave_type ENUM('vacation', 'sick', 'emergency', 'others') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    remarks TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    CHECK (leave_code REGEXP '^LEV-[0-9]{4}$')
);

-- PAYROLL TABLE
CREATE TABLE IF NOT EXISTS payroll (
    payroll_id INT AUTO_INCREMENT PRIMARY KEY,
    payroll_code VARCHAR(10) UNIQUE,
    employee_id INT NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    basic_pay DECIMAL(10,2) NOT NULL,
    overtime_pay DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    net_pay DECIMAL(10,2) NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    CHECK (payroll_code REGEXP '^PAY-[0-9]{4}$')
);
