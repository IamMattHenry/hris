-- Payroll module tables for Philippine labor-law aligned computations
-- Run with: node scripts/runMigration.js create_payroll_module_tables.sql

CREATE TABLE IF NOT EXISTS payroll_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_schedule ENUM('weekly', 'semi-monthly', 'monthly') NOT NULL DEFAULT 'semi-monthly',
  status ENUM('draft', 'finalized') NOT NULL DEFAULT 'draft',
  employee_scope JSON NULL,
  notes TEXT NULL,
  created_by INT NULL,
  finalized_by INT NULL,
  finalized_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payroll_runs_period (pay_period_start, pay_period_end),
  INDEX idx_payroll_runs_status (status)
);

CREATE TABLE IF NOT EXISTS payroll_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id BIGINT UNSIGNED NOT NULL,
  employee_id INT NOT NULL,
  gross_pay DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_deductions DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  withholding_tax DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  net_pay DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  json_breakdown JSON NULL,
  payslip_data JSON NULL,
  raw_inputs JSON NULL,
  override_meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payroll_records_run FOREIGN KEY (run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_payroll_record_run_employee (run_id, employee_id),
  INDEX idx_payroll_records_employee (employee_id)
);

CREATE TABLE IF NOT EXISTS payroll_contributions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  record_id BIGINT UNSIGNED NOT NULL,
  employee_id INT NOT NULL,
  sss_ee DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  sss_er DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  philhealth_ee DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  philhealth_er DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  pagibig_ee DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  pagibig_er DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  bir_withholding DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payroll_contributions_record FOREIGN KEY (record_id) REFERENCES payroll_records(id) ON DELETE CASCADE,
  INDEX idx_payroll_contrib_period (period_start, period_end),
  INDEX idx_payroll_contrib_employee (employee_id)
);

CREATE TABLE IF NOT EXISTS payroll_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pay_schedule ENUM('weekly', 'semi-monthly', 'monthly') NOT NULL DEFAULT 'semi-monthly',
  allowances_config JSON NULL,
  holiday_overrides JSON NULL,
  de_minimis_config JSON NULL,
  company_name VARCHAR(255) NULL,
  monthly_work_days DECIMAL(6,2) NOT NULL DEFAULT 22.00,
  effective_date DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payroll_settings_active (is_active, effective_date)
);

CREATE TABLE IF NOT EXISTS payroll_override_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id BIGINT UNSIGNED NOT NULL,
  record_id BIGINT UNSIGNED NOT NULL,
  employee_id INT NOT NULL,
  changed_by INT NOT NULL,
  reason VARCHAR(255) NULL,
  previous_values JSON NULL,
  new_values JSON NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payroll_override_run FOREIGN KEY (run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
  CONSTRAINT fk_payroll_override_record FOREIGN KEY (record_id) REFERENCES payroll_records(id) ON DELETE CASCADE,
  INDEX idx_payroll_override_run (run_id),
  INDEX idx_payroll_override_employee (employee_id)
);

INSERT INTO payroll_settings (
  pay_schedule,
  allowances_config,
  holiday_overrides,
  de_minimis_config,
  company_name,
  monthly_work_days,
  effective_date,
  is_active
)
SELECT
  'semi-monthly',
  JSON_OBJECT(
    'rice_subsidy_monthly', 2000,
    'clothing_annual', 6000,
    'custom', JSON_ARRAY()
  ),
  JSON_ARRAY(),
  JSON_OBJECT(
    'rice_subsidy_monthly_cap', 2000,
    'clothing_annual_cap', 6000
  ),
  'HRIS Company',
  22,
  CURRENT_DATE,
  1
WHERE NOT EXISTS (SELECT 1 FROM payroll_settings);
