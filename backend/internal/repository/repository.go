package repository

import (
	"backend/internal/model"
	"fmt"

	"gorm.io/gorm"
)

// Repository はデータベースアクセス層のインターフェースです
type Repository interface {
	// User関連
	GetUserByID(id int) (*model.User, error)
	GetAllUsers() ([]*model.User, error)
	CreateUser(user *model.User) error
	UpdateUser(user *model.User) error
	DeleteUser(id int) error
}

// MySQLRepository はMySQL用のRepository実装です
type MySQLRepository struct {
	db *gorm.DB
}

// NewMySQLRepository はMySQLRepositoryを初期化します
func NewMySQLRepository(db *gorm.DB) *MySQLRepository {
	return &MySQLRepository{
		db: db,
	}
}

// GetUserByID はIDからユーザー情報を取得します
func (r *MySQLRepository) GetUserByID(id int) (*model.User, error) {
	var user model.User
	if err := r.db.Where("id = ?", id).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// GetAllUsers はすべてのユーザー情報を取得します
func (r *MySQLRepository) GetAllUsers() ([]*model.User, error) {
	var users []*model.User
	if err := r.db.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

// CreateUser はユーザーを作成します
func (r *MySQLRepository) CreateUser(user *model.User) error {
	return r.db.Create(user).Error
}

// UpdateUser はユーザーを更新します
func (r *MySQLRepository) UpdateUser(user *model.User) error {
	return r.db.Save(user).Error
}

// DeleteUser はユーザーを削除します
func (r *MySQLRepository) DeleteUser(id int) error {
	return r.db.Delete(&model.User{}, id).Error
}
