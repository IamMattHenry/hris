-- Grant Payroll Officer access needed for Payroll/Penalty module navigation
-- Run with: node scripts/runMigration.js grant_payroll_officer_module_access.sql

-- Ensure departments.read permission exists
INSERT INTO permissions (permission_key, description, module)
SELECT 'departments.read', 'View departments', 'departments'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'departments.read');

-- Ensure penalties.read permission exists
INSERT INTO permissions (permission_key, description, module)
SELECT 'penalties.read', 'View employee penalties', 'penalties'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'penalties.read');

-- Grant departments.read to payroll_officer (for payroll scope filters)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'departments.read'
WHERE r.role_key = 'payroll_officer';

-- Grant penalties.read to payroll_officer (for penalty module access)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'penalties.read'
WHERE r.role_key = 'payroll_officer';
