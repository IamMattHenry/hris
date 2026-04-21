-- Payroll module RBAC permissions and role assignments
-- Run with: node scripts/runMigration.js setup_payroll_rbac.sql

-- Create payroll_officer role if it doesn't exist
INSERT INTO roles (role_key, role_name, description)
SELECT 'payroll_officer', 'Payroll Officer', 'Manages payroll processing, runs, and records'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_key = 'payroll_officer');

-- Define payroll module permissions
INSERT INTO permissions (permission_key, description, module)
SELECT 'payroll.read', 'View payroll runs, records, and reports', 'payroll'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'payroll.read');

INSERT INTO permissions (permission_key, description, module)
SELECT 'payroll.create', 'Create and manage payroll runs', 'payroll'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'payroll.create');

INSERT INTO permissions (permission_key, description, module)
SELECT 'payroll.update', 'Update payroll records and settings', 'payroll'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'payroll.update');

INSERT INTO permissions (permission_key, description, module)
SELECT 'payroll.finalize', 'Finalize and lock payroll runs', 'payroll'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'payroll.finalize');

INSERT INTO permissions (permission_key, description, module)
SELECT 'payroll.override', 'Override payroll calculations and records', 'payroll'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'payroll.override');

-- Assign payroll permissions to HR roles
-- HR Manager: full access (read, create, update, finalize, override)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN ('payroll.read', 'payroll.create', 'payroll.update', 'payroll.finalize', 'payroll.override')
WHERE r.role_key = 'hr_manager';

-- Payroll Officer: full access (read, create, update, finalize, override)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN ('payroll.read', 'payroll.create', 'payroll.update', 'payroll.finalize', 'payroll.override')
WHERE r.role_key = 'payroll_officer';

-- Payroll Officer: module-level read access aligned with HR module visibility
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN ('employees.read', 'attendance.read', 'leave.read', 'positions.read', 'departments.read', 'penalties.read')
WHERE r.role_key = 'payroll_officer';

-- HR Supervisor: read, create, update, finalize (no override)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN ('payroll.read', 'payroll.create', 'payroll.update', 'payroll.finalize')
WHERE r.role_key = 'hr_supervisor';

-- Leave & Attendance Officer: read-only
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'payroll.read'
WHERE r.role_key = 'leave_attendance_officer';
