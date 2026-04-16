-- Add Payroll Officer position under HR department and assign seed_payroll_officer to it
-- Run with: node scripts/runMigration.js add_payroll_officer_position_and_seed_assignment.sql

-- Find HR department (supports common naming)
SET @hr_department_id := (
  SELECT department_id
  FROM departments
  WHERE LOWER(department_name) LIKE '%human resource%'
     OR LOWER(department_name) = 'hr'
     OR LOWER(department_name) = 'human resources'
  ORDER BY department_id
  LIMIT 1
);

-- Ensure Payroll Officer position exists in HR
INSERT INTO job_positions (
  position_name,
  position_desc,
  department_id,
  availability,
  employment_type,
  default_salary,
  salary_unit,
  created_by,
  position_code
)
SELECT
  'Payroll Officer',
  'Handles payroll processing, runs, deductions, and payroll compliance reporting.',
  @hr_department_id,
  1,
  'regular',
  25000.00,
  'monthly',
  NULL,
  NULL
WHERE @hr_department_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM job_positions
    WHERE department_id = @hr_department_id
      AND LOWER(position_name) = 'payroll officer'
  );

-- Set generated position_code for newly inserted row if missing
UPDATE job_positions
SET position_code = CONCAT('POS-', LPAD(position_id, 4, '0'))
WHERE department_id = @hr_department_id
  AND LOWER(position_name) = 'payroll officer'
  AND (position_code IS NULL OR position_code = '');

-- Resolve Payroll Officer position id
SET @payroll_officer_position_id := (
  SELECT position_id
  FROM job_positions
  WHERE department_id = @hr_department_id
    AND LOWER(position_name) = 'payroll officer'
  ORDER BY position_id
  LIMIT 1
);

-- Update seed_payroll_officer employee position to Payroll Officer
UPDATE employees e
JOIN users u ON u.user_id = e.user_id
SET e.position_id = @payroll_officer_position_id,
    e.department_id = COALESCE(e.department_id, @hr_department_id)
WHERE u.username = 'seed_payroll_officer'
  AND @payroll_officer_position_id IS NOT NULL;
