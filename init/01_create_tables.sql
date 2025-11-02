-- =====================================================
-- USERS, ROLES, AND PERMISSIONS
-- =====================================================
-- USERS TABLE
-- Role System:
--   - superadmin: Full system access, no department restriction
--   - admin: Manage CRUD on employees, positions, departments (one per department)
--   - supervisor: View-only access, handle leave requests (one per department)
--   - employee: Regular employee with limited access
CREATE TABLE
    IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM ('employee', 'admin', 'supervisor', 'superadmin') DEFAULT 'employee',
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT
    );

-- USER ROLES TABLE
-- Sub-roles are only for admins and supervisors to indicate their department specialization
CREATE TABLE
    IF NOT EXISTS user_roles (
        user_role_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        sub_role ENUM ('hr', 'it', 'front_desk'),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    );

-- =====================================================
-- DEPARTMENTS AND POSITIONS
-- =====================================================
-- DEPARTMENTS TABLE
CREATE TABLE
    IF NOT EXISTS departments (
        department_id INT AUTO_INCREMENT PRIMARY KEY,
        department_code VARCHAR(10) UNIQUE,
        department_name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        supervisor_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        CHECK (department_code REGEXP '^DEP-[0-9]{4}$')
    );

-- JOB POSITIONS TABLE
CREATE TABLE
    IF NOT EXISTS job_positions (
        position_id INT AUTO_INCREMENT PRIMARY KEY,
        position_name VARCHAR(100) NOT NULL,
        position_code VARCHAR(10) UNIQUE,
        position_desc VARCHAR(255),
        department_id INT NOT NULL,
        salary DECIMAL(10, 2),
        availability INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        FOREIGN KEY (department_id) REFERENCES departments (department_id) ON DELETE CASCADE,
        CHECK (position_code REGEXP '^POS-[0-9]{4}$')
    );

-- =====================================================
-- EMPLOYEES
-- =====================================================
-- EMPLOYEES TABLE
CREATE TABLE
    IF NOT EXISTS employees (
        employee_id INT AUTO_INCREMENT PRIMARY KEY,
        employee_code VARCHAR(10) UNIQUE,
        user_id INT UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        extension_name VARCHAR(10),
        birthdate DATE,
        gender ENUM ('male', 'female', 'others') CHARACTER
        SET
            utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'others',
            civil_status ENUM ('single', 'married', 'divorced', 'widowed') DEFAULT 'single',
            home_address TEXT,
            city VARCHAR(100),
            region VARCHAR(100),
            province VARCHAR(100),
            position_id INT,
            department_id INT,
            shift ENUM ('morning', 'night') DEFAULT 'morning',
            salary DECIMAL(10, 2),
            hire_date DATE,
            leave_credit INT DEFAULT 15,
            supervisor_id INT,
            status ENUM ('active', 'resigned', 'terminated', 'on-leave') DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by INT,
            updated_by INT,
            FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
            FOREIGN KEY (position_id) REFERENCES job_positions (position_id) ON DELETE SET NULL,
            FOREIGN KEY (department_id) REFERENCES departments (department_id) ON DELETE SET NULL,
            FOREIGN KEY (supervisor_id) REFERENCES employees (employee_id) ON DELETE SET NULL,
            CHECK (employee_code REGEXP '^EMP-[0-9]{4}$')
    );

-- Add foreign key to departments after employees table is created
ALTER TABLE departments ADD CONSTRAINT fk_dept_supervisor FOREIGN KEY (supervisor_id) REFERENCES employees (employee_id) ON DELETE SET NULL;

-- =====================================================
-- EMPLOYEE ADDRESS
-- =====================================================
-- EMPLOYEE ADDRESSES TABLE
CREATE TABLE
    IF NOT EXISTS employee_addresses (
        address_id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT UNIQUE,
        region_name VARCHAR(50),
        province_name VARCHAR(50),
        city_name VARCHAR(50),
        home_address VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        FOREIGN KEY (employee_id) REFERENCES employees (employee_id) ON DELETE CASCADE
    );

-- =====================================================
-- CONTACTS AND EMAILS
-- =====================================================
-- EMPLOYEE CONTACT NUMBERS TABLE
CREATE TABLE
    IF NOT EXISTS employee_contact_numbers (
        contact_id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        contact_number VARCHAR(20),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        FOREIGN KEY (employee_id) REFERENCES employees (employee_id) ON DELETE CASCADE
    );

-- EMPLOYEE EMAILS TABLE
CREATE TABLE
    IF NOT EXISTS employee_emails (
        email_id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        email VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        FOREIGN KEY (employee_id) REFERENCES employees (employee_id) ON DELETE CASCADE
    );

-- =====================================================
-- ATTENDANCE AND LEAVES
-- =====================================================
-- ATTENDANCE TABLE
CREATE TABLE
    IF NOT EXISTS attendance (
        attendance_id INT AUTO_INCREMENT PRIMARY KEY,
        attendance_code VARCHAR(10) UNIQUE,
        employee_id INT NOT NULL,
        date DATE,
        time_in DATETIME,
        time_out DATETIME,
        status ENUM ('present', 'absent', 'late', 'on_leave') DEFAULT 'present',
        overtime_hours DECIMAL(5, 2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        FOREIGN KEY (employee_id) REFERENCES employees (employee_id) ON DELETE CASCADE,
        CHECK (attendance_code REGEXP '^ATT-[0-9]{4}$')
    );

-- LEAVES TABLE
CREATE TABLE
    IF NOT EXISTS leaves (
        leave_id INT AUTO_INCREMENT PRIMARY KEY,
        leave_code VARCHAR(10) UNIQUE,
        employee_id INT NOT NULL,
        leave_type ENUM ('vacation', 'sick', 'emergency', 'others'),
        start_date DATE,
        end_date DATE,
        status ENUM ('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
        remarks TEXT,
        approved_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        FOREIGN KEY (employee_id) REFERENCES employees (employee_id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users (user_id) ON DELETE SET NULL,
        CHECK (leave_code REGEXP '^LEV-[0-9]{4}$')
    );

-- =====================================================
-- DEPENDENTS
-- =====================================================
-- DEPENDENTS TABLE
CREATE TABLE
    IF NOT EXISTS dependants (
        dependant_id INT AUTO_INCREMENT PRIMARY KEY,
        dependant_code VARCHAR(10) UNIQUE,
        employee_id INT NOT NULL,
        firstname VARCHAR(100),
        lastname VARCHAR(100),
        relationship VARCHAR(100),
        birth_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        FOREIGN KEY (employee_id) REFERENCES employees (employee_id) ON DELETE CASCADE,
        CHECK (dependant_code REGEXP '^DEP-[0-9]{4}$')
    );

-- DEPENDANT EMAIL TABLE
CREATE TABLE
    IF NOT EXISTS dependant_email (
        dependant_email_id INT AUTO_INCREMENT PRIMARY KEY,
        dependant_id INT UNIQUE,
        email VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        FOREIGN KEY (dependant_id) REFERENCES dependants (dependant_id) ON DELETE CASCADE
    );

-- DEPENDANT CONTACT TABLE
CREATE TABLE
    IF NOT EXISTS dependant_contact (
        dependant_contact_id INT AUTO_INCREMENT PRIMARY KEY,
        dependant_id INT UNIQUE,
        contact_no VARCHAR(25),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        FOREIGN KEY (dependant_id) REFERENCES dependants (dependant_id) ON DELETE CASCADE
    );

-- DEPENDANT ADDRESS TABLE
CREATE TABLE
    IF NOT EXISTS dependant_address (
        dependant_address_id INT AUTO_INCREMENT PRIMARY KEY,
        dependant_id INT UNIQUE,
        region_name VARCHAR(50),
        province_name VARCHAR(50),
        city_name VARCHAR(50),
        home_address VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by INT,
        updated_by INT,
        FOREIGN KEY (dependant_id) REFERENCES dependants (dependant_id) ON DELETE CASCADE
    );

-- =====================================================
-- ACTIVITY LOGS (AUDIT TRAIL)
-- =====================================================
-- ACTIVITY LOGS TABLE
CREATE TABLE
    IF NOT EXISTS activity_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(255),
        module VARCHAR(100),
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INT,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    );

-- =====================================================
-- TICKET SYSTEM
-- =====================================================
-- TICKET TABLE
CREATE TABLE
    IF NOT EXISTS tickets (
        ticket_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ticket_code VARCHAR(10) UNIQUE,
        user_id INT NOT NULL,
        fixed_by INT,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        status ENUM ('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by INT,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        FOREIGN KEY (fixed_by) REFERENCES users (user_id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL,
        FOREIGN KEY (updated_by) REFERENCES users (user_id) ON DELETE SET NULL,
        CHECK (ticket_code REGEXP '^TIC-[0-9]{4}$')
    );

-- PUBLIC TICKET EMAILS TABLE
CREATE TABLE
    IF NOT EXISTS public_ticket_emails (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        email VARCHAR(100),
        name VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets (ticket_id) ON DELETE CASCADE
    );
