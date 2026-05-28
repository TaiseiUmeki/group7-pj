-- 固定タグIDをプロフィールに複数紐づける中間テーブル

CREATE TABLE IF NOT EXISTS profile_tags (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  profile_id BIGINT NOT NULL,
  tag_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_profile_tags_pair (profile_id, tag_id),
  KEY idx_profile_tags_profile (profile_id),
  KEY idx_profile_tags_tag_id (tag_id),
  CONSTRAINT fk_profile_tags_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
