-- Add barangay_name column to dependant_address table
-- Run with: node scripts/runMigration.js add_dependant_address_barangay.sql

SET @db_name = DATABASE();

SET @has_barangay_name = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'dependant_address'
    AND column_name = 'barangay_name'
);

SET @sql = IF(
  @has_barangay_name = 0,
  'ALTER TABLE dependant_address ADD COLUMN barangay_name VARCHAR(255) NULL AFTER home_address',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
