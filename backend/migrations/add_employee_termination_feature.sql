-- Employee termination feature migration
-- Run with: node scripts/runMigration.js add_employee_termination_feature.sql

SET @db_name = DATABASE();

SET @has_terminated_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'employees'
    AND column_name = 'terminated_at'
);
SET @sql = IF(
  @has_terminated_at = 0,
  'ALTER TABLE employees ADD COLUMN terminated_at DATETIME NULL AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_terminated_by = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'employees'
    AND column_name = 'terminated_by_user_id'
);
SET @sql = IF(
  @has_terminated_by = 0,
  'ALTER TABLE employees ADD COLUMN terminated_by_user_id INT NULL AFTER terminated_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_termination_reason = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'employees'
    AND column_name = 'termination_reason'
);
SET @sql = IF(
  @has_termination_reason = 0,
  'ALTER TABLE employees ADD COLUMN termination_reason VARCHAR(255) NULL AFTER terminated_by_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx_terminated_at = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'employees'
    AND index_name = 'idx_employees_terminated_at'
);
SET @sql = IF(
  @has_idx_terminated_at = 0,
  'ALTER TABLE employees ADD INDEX idx_employees_terminated_at (terminated_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx_terminated_by = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'employees'
    AND index_name = 'idx_employees_terminated_by_user_id'
);
SET @sql = IF(
  @has_idx_terminated_by = 0,
  'ALTER TABLE employees ADD INDEX idx_employees_terminated_by_user_id (terminated_by_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_fk_terminated_by = (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = @db_name
    AND table_name = 'employees'
    AND constraint_name = 'fk_employees_terminated_by_user'
    AND constraint_type = 'FOREIGN KEY'
);
SET @sql = IF(
  @has_fk_terminated_by = 0,
  'ALTER TABLE employees ADD CONSTRAINT fk_employees_terminated_by_user FOREIGN KEY (terminated_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO permissions (permission_key, description, module)
SELECT 'employees.terminate', 'Terminate employee records', 'employees'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE permission_key = 'employees.terminate');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key = 'employees.terminate'
WHERE r.role_key IN ('superadmin', 'hr_manager');