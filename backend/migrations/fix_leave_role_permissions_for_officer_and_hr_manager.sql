-- Align leave permissions with intended workflow:
-- - Leave & Attendance Officer: view all + approve/reject
-- - HR Manager: view all only (no approve/reject/delete)

-- Ensure Leave & Attendance Officer has required leave permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'leave.read'
WHERE r.role_key = 'leave_attendance_officer';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'leave.approve'
WHERE r.role_key = 'leave_attendance_officer';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'leave.reject'
WHERE r.role_key = 'leave_attendance_officer';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'leave.apply'
WHERE r.role_key = 'leave_attendance_officer';

-- Keep HR Manager read-only for leave requests
DELETE rp
FROM role_permissions rp
JOIN roles r ON r.role_id = rp.role_id
JOIN permissions p ON p.permission_id = rp.permission_id
WHERE r.role_key = 'hr_manager'
  AND p.permission_key IN ('leave.approve', 'leave.reject', 'leave.delete');

-- Ensure HR Manager can still view leave requests
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'leave.read'
WHERE r.role_key = 'hr_manager';
