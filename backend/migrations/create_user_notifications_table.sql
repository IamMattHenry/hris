CREATE TABLE IF NOT EXISTS user_notifications (
  notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recipient_user_id INT NOT NULL,
  actor_user_id INT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'general',
  reference_module VARCHAR(80) NULL,
  reference_id VARCHAR(120) NULL,
  status ENUM('unread', 'read') NOT NULL DEFAULT 'unread',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  INDEX idx_user_notifications_recipient_status (recipient_user_id, status, created_at),
  INDEX idx_user_notifications_created_at (created_at)
);
