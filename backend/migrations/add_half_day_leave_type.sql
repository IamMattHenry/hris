-- Migration: Add 'half_day' to leave_type ENUM and 'early_leave' to attendance status ENUM
-- Date: 2025-11-25

-- Add 'half_day' to leaves table leave_type ENUM
ALTER TABLE leaves 
MODIFY COLUMN leave_type ENUM('vacation', 'sick', 'emergency', 'personal', 'parental', 'bereavement', 'half_day', 'others');

-- Add 'early_leave' to attendance table status ENUM
ALTER TABLE attendance 
MODIFY COLUMN status ENUM('present', 'absent', 'late', 'early_leave', 'half_day', 'on_leave', 'work_from_home', 'others') DEFAULT 'present';

