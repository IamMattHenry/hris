-- Penalty module tables and RBAC permission bootstrap
-- Run with: node scripts/runMigration.js create_penalty_module_tables.sql

CREATE TABLE IF NOT EXISTS employee_penalties (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  issued_by_user_id INT NULL,
  code VARCHAR(50) NOT NULL,
  penalty_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  amount_deducted DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  remaining_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'PHP',
  incident_date DATE NOT NULL,
  issued_date DATE NOT NULL,
  due_date DATE NULL,
  status ENUM('draft', 'pending', 'approved', 'rejected', 'settled', 'cancelled', 'waived') NOT NULL DEFAULT 'pending',
  payroll_deduction_mode ENUM('full', 'next_payroll', 'installment', 'manual', 'none') NOT NULL DEFAULT 'none',
  installment_count INT NULL,
  installment_frequency VARCHAR(30) NULL,
  settled_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  cancellation_reason VARCHAR(255) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employee_penalties_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_penalties_issued_by FOREIGN KEY (issued_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  UNIQUE KEY uq_employee_penalties_code (code),
  INDEX idx_employee_penalties_employee (employee_id),
  INDEX idx_employee_penalties_status (status),
  INDEX idx_employee_penalties_incident_date (incident_date),
  INDEX idx_employee_penalties_issued_date (issued_date),
  INDEX idx_employee_penalties_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS employee_penalty_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  penalty_id BIGINT UNSIGNED NOT NULL,
  action_type VARCHAR(80) NOT NULL,
  from_status VARCHAR(30) NULL,
  to_status VARCHAR(30) NULL,
  notes TEXT NULL,
  action_by_user_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_employee_penalty_events_penalty FOREIGN KEY (penalty_id) REFERENCES employee_penalties(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_penalty_events_action_by FOREIGN KEY (action_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_employee_penalty_events_penalty (penalty_id),
  INDEX idx_employee_penalty_events_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS payroll_penalty_deductions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  penalty_id BIGINT UNSIGNED NOT NULL,
  payroll_run_id BIGINT UNSIGNED NOT NULL,
  payroll_record_id BIGINT UNSIGNED NOT NULL,
  employee_id INT NOT NULL,
  deducted_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  deduction_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payroll_penalty_deductions_penalty FOREIGN KEY (penalty_id) REFERENCES employee_penalties(id) ON DELETE CASCADE,
  CONSTRAINT fk_payroll_penalty_deductions_run FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
  CONSTRAINT fk_payroll_penalty_deductions_record FOREIGN KEY (payroll_record_id) REFERENCES payroll_records(id) ON DELETE CASCADE,
  CONSTRAINT fk_payroll_penalty_deductions_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  UNIQUE KEY uq_payroll_penalty_deduction_unique (penalty_id, payroll_run_id, payroll_record_id),
  INDEX idx_payroll_penalty_deductions_employee (employee_id),
  INDEX idx_payroll_penalty_deductions_run (payroll_run_id),
  INDEX idx_payroll_penalty_deductions_date (deduction_date)
);

INSERT INTO permissions (permission_key, description, module)
SELECT 'penalties.read', 'View employee penalties', 'penalties'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'penalties.read');

INSERT INTO permissions (permission_key, description, module)
SELECT 'penalties.create', 'Create employee penalties', 'penalties'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'penalties.create');

INSERT INTO permissions (permission_key, description, module)
SELECT 'penalties.update', 'Update employee penalties', 'penalties'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'penalties.update');

INSERT INTO permissions (permission_key, description, module)
SELECT 'penalties.approve', 'Approve or reject employee penalties', 'penalties'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'penalties.approve');

INSERT INTO permissions (permission_key, description, module)
SELECT 'penalties.settle', 'Settle employee penalties', 'penalties'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'penalties.settle');

INSERT INTO permissions (permission_key, description, module)
SELECT 'penalties.cancel', 'Cancel employee penalties', 'penalties'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'penalties.cancel');

INSERT INTO permissions (permission_key, description, module)
SELECT 'penalties.delete', 'Delete employee penalties', 'penalties'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'penalties.delete');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'penalties.read'
WHERE r.role_key IN ('superadmin', 'hr_manager', 'hr_supervisor', 'leave_attendance_officer');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'penalties.create'
WHERE r.role_key IN ('superadmin', 'hr_manager', 'hr_supervisor');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'penalties.update'
WHERE r.role_key IN ('superadmin', 'hr_manager', 'hr_supervisor');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'penalties.approve'
WHERE r.role_key IN ('superadmin', 'hr_manager');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'penalties.settle'
WHERE r.role_key IN ('superadmin', 'hr_manager', 'hr_supervisor');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'penalties.cancel'
WHERE r.role_key IN ('superadmin', 'hr_manager');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'penalties.delete'
WHERE r.role_key IN ('superadmin', 'hr_manager');
