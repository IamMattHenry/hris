-- Grant Payroll Officer core HR module read permissions
-- Run with: node scripts/runMigration.js grant_payroll_officer_hr_module_read_permissions.sql

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT payroll_role.role_id, p.permission_id
FROM roles payroll_role
JOIN permissions p ON p.permission_key IN (
  'employees.read',
  'attendance.read',
  'leave.read',
  'positions.read',
  'departments.read',
  'payroll.read',
  'penalties.read'
)
WHERE payroll_role.role_key = 'payroll_officer';
