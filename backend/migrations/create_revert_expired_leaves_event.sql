-- Creates a MySQL event that runs daily to revert employee status when their approved leaves have expired.
-- Run this script against your database (e.g. using mysql CLI or a migration runner).

DELIMITER $$
CREATE EVENT IF NOT EXISTS revert_expired_leaves_event
ON SCHEDULE EVERY 1 DAY
STARTS (CURRENT_DATE + INTERVAL 1 DAY) + INTERVAL 5 MINUTE
DO
BEGIN
  -- For each employee currently marked on-leave where all approved leaves have ended before today,
  -- set their status back to 'active'.
  UPDATE employees e
  SET e.status = 'active'
  WHERE e.status = 'on-leave'
    AND NOT EXISTS (
      SELECT 1 FROM leaves l
      WHERE l.employee_id = e.employee_id
        AND l.status = 'approved'
        AND l.end_date >= CURDATE()
    );
END$$
DELIMITER ;
