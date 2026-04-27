-- Grant broad read/view permissions to all HR RBAC roles
-- Run with: node scripts/runMigration.js grant_all_hr_roles_view_permissions.sql

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'employees.read',
  'attendance.read',
  'attendance.read_department',
  'leave.read',
  'leave.read_department',
  'positions.read',
  'departments.read',
  'payroll.read',
  'penalties.read',
  'tickets.read',
  'activity.read',
  'dashboard.read_own'
)
WHERE r.role_key IN (
  'hr_manager',
  'hr_supervisor',
  'payroll_officer',
  'leave_attendance_officer',
  'recruitment_officer'
);
