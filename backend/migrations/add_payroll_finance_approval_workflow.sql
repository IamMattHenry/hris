-- Add finance approval workflow to payroll runs and payroll records
-- Run with: node scripts/runMigration.js add_payroll_finance_approval_workflow.sql

ALTER TABLE payroll_runs
  MODIFY COLUMN status ENUM('draft', 'pending_finance_approval', 'finance_approved', 'finance_rejected', 'finalized', 'aborted') NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approval_requested_at DATETIME NULL AFTER created_by,
  ADD COLUMN IF NOT EXISTS finance_reviewed_by INT NULL AFTER approval_requested_at,
  ADD COLUMN IF NOT EXISTS finance_reviewed_at DATETIME NULL AFTER finance_reviewed_by,
  ADD COLUMN IF NOT EXISTS aborted_by INT NULL AFTER finalized_at,
  ADD COLUMN IF NOT EXISTS aborted_at DATETIME NULL AFTER aborted_by;

ALTER TABLE payroll_records
  ADD COLUMN IF NOT EXISTS status ENUM('draft', 'pending_finance_approval', 'finance_approved', 'finance_rejected', 'finalized', 'aborted') NULL AFTER employee_id;

UPDATE payroll_records rec
JOIN payroll_runs r ON r.id = rec.run_id
SET rec.status = CASE
  WHEN r.status IN ('draft', 'pending_finance_approval', 'finance_approved', 'finance_rejected', 'finalized', 'aborted') THEN r.status
  ELSE 'draft'
END
WHERE rec.status IS NULL;

ALTER TABLE payroll_records
  MODIFY COLUMN status ENUM('draft', 'pending_finance_approval', 'finance_approved', 'finance_rejected', 'finalized', 'aborted') NOT NULL DEFAULT 'draft';
