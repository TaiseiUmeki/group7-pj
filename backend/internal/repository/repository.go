package repository

import (
	"backend/internal/model"
)

// Repository はデータベースアクセス層のインターフェースです
type Repository interface {
	// User関連
	GetUserByID(id int) (*model.User, error)
	CreateUser(user *model.User) error
	UpdateUser(user *model.User) error
	DeleteUser(id int) error
}

// ここに具体的な実装を追加します（例：MySQL, PostgreSQL等のドライバ）
