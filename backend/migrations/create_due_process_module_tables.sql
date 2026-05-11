-- Due process & attendance violation module tables and RBAC permissions
-- Run with: node scripts/runMigration.js create_due_process_module_tables.sql

CREATE TABLE IF NOT EXISTS attendance_violations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  attendance_id BIGINT UNSIGNED NULL,
  violation_type ENUM('late', 'absence', 'undertime', 'missing_log', 'unauthorized_ot') NOT NULL,
  violation_minutes INT NULL,
  violation_date DATE NOT NULL,
  policy_rule_triggered VARCHAR(160) NULL,
  status ENUM('pending', 'escalated', 'resolved', 'dismissed') NOT NULL DEFAULT 'pending',
  auto_generated TINYINT(1) NOT NULL DEFAULT 1,
  remarks TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_violations_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_violations_attendance FOREIGN KEY (attendance_id) REFERENCES attendance(attendance_id) ON DELETE SET NULL,
  UNIQUE KEY uq_attendance_violation_unique (employee_id, attendance_id, violation_type),
  INDEX idx_attendance_violations_employee (employee_id),
  INDEX idx_attendance_violations_date (violation_date),
  INDEX idx_attendance_violations_status (status)
);

CREATE TABLE IF NOT EXISTS disciplinary_cases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  case_number VARCHAR(40) NOT NULL,
  case_type VARCHAR(80) NOT NULL DEFAULT 'attendance',
  status ENUM('draft', 'nte_issued', 'awaiting_explanation', 'under_investigation', 'hearing_scheduled', 'decision_pending', 'resolved', 'closed') NOT NULL DEFAULT 'draft',
  severity VARCHAR(40) NULL,
  assigned_hr_id INT NULL,
  assigned_manager_id INT NULL,
  opened_at DATETIME NULL,
  closed_at DATETIME NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_disciplinary_cases_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_disciplinary_cases_assigned_hr FOREIGN KEY (assigned_hr_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_disciplinary_cases_assigned_manager FOREIGN KEY (assigned_manager_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_disciplinary_cases_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_disciplinary_cases_updated_by FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL,
  UNIQUE KEY uq_disciplinary_cases_number (case_number),
  INDEX idx_disciplinary_cases_employee (employee_id),
  INDEX idx_disciplinary_cases_status (status),
  INDEX idx_disciplinary_cases_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS case_violations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  case_id BIGINT UNSIGNED NOT NULL,
  violation_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_case_violations_case FOREIGN KEY (case_id) REFERENCES disciplinary_cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_case_violations_violation FOREIGN KEY (violation_id) REFERENCES attendance_violations(id) ON DELETE CASCADE,
  UNIQUE KEY uq_case_violations_unique (case_id, violation_id),
  INDEX idx_case_violations_case (case_id),
  INDEX idx_case_violations_violation (violation_id)
);

CREATE TABLE IF NOT EXISTS case_notices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  case_id BIGINT UNSIGNED NOT NULL,
  notice_type ENUM('NTE', 'hearing_notice', 'decision_notice') NOT NULL,
  recipient_employee_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  sent_via ENUM('email', 'internal', 'both') NOT NULL DEFAULT 'internal',
  status ENUM('draft', 'sent', 'acknowledged') NOT NULL DEFAULT 'draft',
  sent_at DATETIME NULL,
  acknowledged_at DATETIME NULL,
  due_date DATETIME NULL,
  created_by INT NULL,
  auto_generated TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_case_notices_case FOREIGN KEY (case_id) REFERENCES disciplinary_cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_case_notices_employee FOREIGN KEY (recipient_employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_case_notices_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_case_notices_case (case_id),
  INDEX idx_case_notices_type (notice_type),
  INDEX idx_case_notices_status (status)
);

CREATE TABLE IF NOT EXISTS case_explanations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  case_id BIGINT UNSIGNED NOT NULL,
  employee_id INT NOT NULL,
  explanation_text TEXT NOT NULL,
  attachment_url VARCHAR(500) NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_case_explanations_case FOREIGN KEY (case_id) REFERENCES disciplinary_cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_case_explanations_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  INDEX idx_case_explanations_case (case_id)
);

CREATE TABLE IF NOT EXISTS case_hearings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  case_id BIGINT UNSIGNED NOT NULL,
  hearing_datetime DATETIME NOT NULL,
  hearing_type ENUM('virtual', 'face_to_face') NOT NULL DEFAULT 'face_to_face',
  location_or_link VARCHAR(255) NULL,
  investigator_id INT NULL,
  notes TEXT NULL,
  outcome_summary TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_case_hearings_case FOREIGN KEY (case_id) REFERENCES disciplinary_cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_case_hearings_investigator FOREIGN KEY (investigator_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_case_hearings_case (case_id),
  INDEX idx_case_hearings_datetime (hearing_datetime)
);

CREATE TABLE IF NOT EXISTS case_decisions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  case_id BIGINT UNSIGNED NOT NULL,
  decision_type ENUM('dismissed', 'verbal_warning', 'written_warning', 'suspension', 'termination', 'policy_coaching', 'no_violation') NOT NULL,
  penalty_days INT NULL,
  effective_date DATE NULL,
  decision_summary TEXT NULL,
  approved_by INT NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_case_decisions_case FOREIGN KEY (case_id) REFERENCES disciplinary_cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_case_decisions_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
  UNIQUE KEY uq_case_decisions_case (case_id),
  INDEX idx_case_decisions_issued_at (issued_at)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  entity_type VARCHAR(120) NOT NULL,
  entity_id VARCHAR(120) NOT NULL,
  action VARCHAR(120) NOT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(64) NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_entity (entity_type, entity_id),
  INDEX idx_audit_logs_user (user_id),
  INDEX idx_audit_logs_timestamp (timestamp)
);

INSERT INTO permissions (permission_key, description, module)
SELECT 'due_process.read', 'View attendance violations and due process cases', 'due_process'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'due_process.read');

INSERT INTO permissions (permission_key, description, module)
SELECT 'due_process.manage', 'Create and update due process cases', 'due_process'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'due_process.manage');

INSERT INTO permissions (permission_key, description, module)
SELECT 'due_process.notice_send', 'Send due process notices', 'due_process'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'due_process.notice_send');

INSERT INTO permissions (permission_key, description, module)
SELECT 'due_process.hearing_schedule', 'Schedule due process hearings', 'due_process'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'due_process.hearing_schedule');

INSERT INTO permissions (permission_key, description, module)
SELECT 'due_process.decision_issue', 'Issue due process decisions', 'due_process'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'due_process.decision_issue');

INSERT INTO permissions (permission_key, description, module)
SELECT 'due_process.policy_manage', 'Manage due process policy settings', 'due_process'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'due_process.policy_manage');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN ('due_process.read', 'due_process.manage', 'due_process.notice_send', 'due_process.hearing_schedule', 'due_process.decision_issue', 'due_process.policy_manage')
WHERE r.role_key = 'hr_manager';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN ('due_process.read', 'due_process.manage', 'due_process.notice_send', 'due_process.hearing_schedule')
WHERE r.role_key = 'hr_supervisor';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN ('due_process.read')
WHERE r.role_key IN ('leave_attendance_officer', 'payroll_officer');
