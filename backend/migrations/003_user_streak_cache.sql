SET @streak_days_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'streak_days'
);
SET @add_streak_days = IF(
  @streak_days_exists = 0,
  'ALTER TABLE users ADD COLUMN streak_days INT NOT NULL DEFAULT 0 AFTER password_hash',
  'SELECT 1'
);
PREPARE add_streak_days_stmt FROM @add_streak_days;
EXECUTE add_streak_days_stmt;
DEALLOCATE PREPARE add_streak_days_stmt;

SET @last_workout_date_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'last_workout_date'
);
SET @add_last_workout_date = IF(
  @last_workout_date_exists = 0,
  'ALTER TABLE users ADD COLUMN last_workout_date DATE NULL AFTER streak_days',
  'SELECT 1'
);
PREPARE add_last_workout_date_stmt FROM @add_last_workout_date;
EXECUTE add_last_workout_date_stmt;
DEALLOCATE PREPARE add_last_workout_date_stmt;

SET @last_workout_date_index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'idx_users_last_workout_date'
);
SET @add_last_workout_date_index = IF(
  @last_workout_date_index_exists = 0,
  'ALTER TABLE users ADD KEY idx_users_last_workout_date (last_workout_date)',
  'SELECT 1'
);
PREPARE add_last_workout_date_index_stmt FROM @add_last_workout_date_index;
EXECUTE add_last_workout_date_index_stmt;
DEALLOCATE PREPARE add_last_workout_date_index_stmt;
