-- Ensure attendance.status supports holiday

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

SET @has_holiday := IF(
  @status_column_type IS NULL,
  0,
  LOCATE("'holiday'", @status_column_type) > 0
);

SET @alter_sql := IF(
  @status_column_exists = 0 OR @has_holiday = 1,
  'SELECT 1',
  "ALTER TABLE attendance MODIFY COLUMN status ENUM('present','absent','late','early_leave','half_day','on_leave','work_from_home','overtime','rest_day','holiday','others') NOT NULL DEFAULT 'present'"
);

PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
