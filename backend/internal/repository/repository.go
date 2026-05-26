package repository

import (
	"backend/internal/model"
	"errors"

	"gorm.io/gorm"
)

// ErrUserNotFound はユーザーが見つからない場合のエラーです
var ErrUserNotFound = errors.New("user not found")

// ErrWorkoutRecordNotFound は運動記録が見つからない場合のエラーです
var ErrWorkoutRecordNotFound = errors.New("workout record not found")

// Repository はデータベースアクセス層のインターフェースです
type Repository interface {
	// User関連
	GetUserByID(id int) (*model.User, error)
	GetUserByEmail(email string) (*model.User, error)
	GetAllUsers() ([]*model.User, error)
	CreateUser(user *model.User) error
	UpdateUser(user *model.User) error
	DeleteUser(id int) error

	// WorkoutRecord関連
	GetWorkoutRecordByIDAndUserID(id, userID int) (*model.WorkoutRecord, error)
	GetWorkoutRecordsByUserID(userID int) ([]*model.WorkoutRecord, error)
	CreateWorkoutRecord(record *model.WorkoutRecord) error
	UpdateWorkoutRecord(record *model.WorkoutRecord) error
	DeleteWorkoutRecord(id int) error
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
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

// GetUserByEmail はメールアドレスからユーザー情報を取得します
func (r *MySQLRepository) GetUserByEmail(email string) (*model.User, error) {
	var user model.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
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

// GetWorkoutRecordByIDAndUserID はIDとユーザーIDから運動記録を取得します
func (r *MySQLRepository) GetWorkoutRecordByIDAndUserID(id, userID int) (*model.WorkoutRecord, error) {
	var record model.WorkoutRecord
	if err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWorkoutRecordNotFound
		}
		return nil, err
	}
	return &record, nil
}

// GetWorkoutRecordsByUserID はユーザーの運動記録一覧を取得します
func (r *MySQLRepository) GetWorkoutRecordsByUserID(userID int) ([]*model.WorkoutRecord, error) {
	var records []*model.WorkoutRecord
	if err := r.db.Where("user_id = ?", userID).Order("start_time DESC").Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

// CreateWorkoutRecord は運動記録を作成します
func (r *MySQLRepository) CreateWorkoutRecord(record *model.WorkoutRecord) error {
	return r.db.Create(record).Error
}

// UpdateWorkoutRecord は運動記録を更新します
func (r *MySQLRepository) UpdateWorkoutRecord(record *model.WorkoutRecord) error {
	return r.db.Save(record).Error
}

// DeleteWorkoutRecord は運動記録を削除します
func (r *MySQLRepository) DeleteWorkoutRecord(id int) error {
	return r.db.Delete(&model.WorkoutRecord{}, id).Error
}
