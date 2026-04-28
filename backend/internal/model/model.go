package model

// ここにビジネスドメインのデータモデルを定義します
// 例：

// User はユーザー情報を表します
type User struct {
	ID    int    `json:"id" gorm:"primaryKey"`
	Name  string `json:"name" gorm:"size:255;not null"`
	Email string `json:"email" gorm:"size:255;not null;uniqueIndex"`
}
