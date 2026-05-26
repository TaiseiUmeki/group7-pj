-- 初期マイグレーション
-- ユーザーテーブルを作成
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  record_type VARCHAR(20) NOT NULL,
  exercise_type VARCHAR(255) NOT NULL DEFAULT '',
  start_time DATETIME NOT NULL,
  duration_minutes INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_workout_records_user_id (user_id),
  INDEX idx_workout_records_start_time (start_time),
  CONSTRAINT fk_workout_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
