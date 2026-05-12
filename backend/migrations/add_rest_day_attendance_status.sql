-- Ensure attendance.status supports rest_day

SET @status_column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'attendance'
    AND COLUMN_NAME = 'status'
);

SET @status_column_type := (
  SELECT COLUMN_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'attendance'
    AND COLUMN_NAME = 'status'
  LIMIT 1
);

SET @has_rest_day := IF(
  @status_column_type IS NULL,
  0,
  LOCATE("'rest_day'", @status_column_type) > 0
);

SET @alter_sql := IF(
  @status_column_exists = 0 OR @has_rest_day = 1,
  'SELECT 1',
  "ALTER TABLE attendance MODIFY COLUMN status ENUM('present','absent','late','early_leave','half_day','on_leave','work_from_home','overtime','rest_day','others') NOT NULL DEFAULT 'present'"
);

PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
