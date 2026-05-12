-- Tracks outstanding negative net pay balances to carry over to the next payroll run
-- Run with: node scripts/runMigration.js create_payroll_negative_net_pay_balances.sql

CREATE TABLE IF NOT EXISTS payroll_negative_net_pay_balances (
  employee_id INT NOT NULL PRIMARY KEY,
  run_id BIGINT UNSIGNED NULL,
  record_id BIGINT UNSIGNED NULL,
  outstanding_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_negative_net_pay_balance_run FOREIGN KEY (run_id) REFERENCES payroll_runs(id) ON DELETE SET NULL,
  CONSTRAINT fk_negative_net_pay_balance_record FOREIGN KEY (record_id) REFERENCES payroll_records(id) ON DELETE SET NULL,
  INDEX idx_negative_net_pay_balance_run (run_id)
);
