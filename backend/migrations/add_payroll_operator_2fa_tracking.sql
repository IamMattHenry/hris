-- Add payroll operator tracking and 2FA verification
-- Tracks who creates and finalizes payroll runs with 2FA confirmation

ALTER TABLE payroll_runs ADD COLUMN created_by_user_id INT NULL AFTER created_by;
ALTER TABLE payroll_runs ADD COLUMN creator_2fa_method VARCHAR(50) NULL COMMENT 'fingerprint, qr, password, or null' AFTER created_by_user_id;
ALTER TABLE payroll_runs ADD COLUMN creator_2fa_verified_at DATETIME NULL AFTER creator_2fa_method;

ALTER TABLE payroll_runs ADD COLUMN finalized_by_user_id INT NULL AFTER finalized_by;
ALTER TABLE payroll_runs ADD COLUMN finalizer_2fa_method VARCHAR(50) NULL COMMENT 'fingerprint, qr, password, or null' AFTER finalized_by_user_id;
ALTER TABLE payroll_runs ADD COLUMN finalizer_2fa_verified_at DATETIME NULL AFTER finalizer_2fa_method;

-- Index for operator tracking
CREATE INDEX idx_payroll_runs_created_by_user ON payroll_runs(created_by_user_id);
CREATE INDEX idx_payroll_runs_finalized_by_user ON payroll_runs(finalized_by_user_id);

-- Add audit log table for payroll operator actions
CREATE TABLE IF NOT EXISTS payroll_operator_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id BIGINT UNSIGNED NOT NULL,
  operator_user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL COMMENT 'create, finalize, modify',
  twofa_method VARCHAR(50) NULL COMMENT 'fingerprint, qr, password',
  twofa_verified_at DATETIME NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  notes TEXT NULL,
  logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payroll_operator_logs_run FOREIGN KEY (run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
  INDEX idx_payroll_operator_logs_run (run_id),
  INDEX idx_payroll_operator_logs_operator (operator_user_id),
  INDEX idx_payroll_operator_logs_date (logged_at)
);

-- Add 2FA session tracking for payroll (temporary, expires after use)
CREATE TABLE IF NOT EXISTS payroll_2fa_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL COMMENT 'payroll_create, payroll_finalize',
  action_reference_id BIGINT UNSIGNED NULL COMMENT 'run_id or other reference',
  verification_code VARCHAR(255) NOT NULL,
  verification_method VARCHAR(50) NOT NULL COMMENT 'fingerprint, qr, password, sms, email',
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  attempted_at DATETIME NULL,
  verified_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payroll_2fa_user (user_id),
  INDEX idx_payroll_2fa_expires (expires_at),
  INDEX idx_payroll_2fa_verified (is_verified)
);
