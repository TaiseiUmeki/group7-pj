package model

// ここにビジネスドメインのデータモデルを定義します
// 例：

// User はユーザー情報を表します
type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}
