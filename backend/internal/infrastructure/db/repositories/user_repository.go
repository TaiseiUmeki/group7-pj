package repositories

import (
	"fmt"

	domainuser "backend/internal/domain/user"
	"backend/internal/infrastructure/db/models"

	"gorm.io/gorm"
)

// UserRepository はGORMを使ったユーザーリポジトリ実装です。
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository はUserRepositoryを初期化します。
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{
		db: db,
	}
}

// GetUserByID はIDからユーザー情報を取得します。
func (r *UserRepository) GetUserByID(id int) (*domainuser.User, error) {
	var model models.UserModel
	if err := r.db.Where("id = ?", id).First(&model).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}
	return model.ToEntity(), nil
}

// GetAllUsers はすべてのユーザー情報を取得します。
func (r *UserRepository) GetAllUsers() ([]*domainuser.User, error) {
	var userModels []models.UserModel
	if err := r.db.Find(&userModels).Error; err != nil {
		return nil, err
	}

	users := make([]*domainuser.User, 0, len(userModels))
	for _, model := range userModels {
		users = append(users, model.ToEntity())
	}
	return users, nil
}

// CreateUser はユーザーを作成します。
func (r *UserRepository) CreateUser(user *domainuser.User) error {
	return r.db.Create(models.UserModelFromEntity(user)).Error
}

// UpdateUser はユーザーを更新します。
func (r *UserRepository) UpdateUser(user *domainuser.User) error {
	return r.db.Save(models.UserModelFromEntity(user)).Error
}

// DeleteUser はユーザーを削除します。
func (r *UserRepository) DeleteUser(id int) error {
	return r.db.Delete(&models.UserModel{}, id).Error
}
