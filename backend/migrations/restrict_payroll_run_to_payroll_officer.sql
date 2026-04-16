-- Restrict payroll run creation to Payroll Officer only
-- Run with: node scripts/runMigration.js restrict_payroll_run_to_payroll_officer.sql

-- Remove payroll.create from all roles except payroll_officer
DELETE rp
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.role_id
JOIN permissions p ON rp.permission_id = p.permission_id
WHERE p.permission_key = 'payroll.create'
  AND r.role_key <> 'payroll_officer';

-- Ensure payroll_officer keeps payroll.create
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'payroll.create'
WHERE r.role_key = 'payroll_officer';
