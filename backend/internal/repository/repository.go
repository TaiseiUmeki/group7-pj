package repository

import (
	"backend/internal/model"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"
)

// ErrUserNotFound はユーザーが見つからない場合のエラーです
var ErrUserNotFound = errors.New("user not found")

// ErrWorkoutRecordNotFound は運動記録が見つからない場合のエラーです
var ErrWorkoutRecordNotFound = errors.New("workout record not found")

// ErrProfileNotFound はプロフィールが見つからない場合のエラーです
var ErrProfileNotFound = errors.New("profile not found")

// Repository はデータベースアクセス層のインターフェースです
type Repository interface {
	// User関連
	GetUserByID(id int) (*model.User, error)
	GetUserByEmail(email string) (*model.User, error)
	GetAllUsers() ([]*model.User, error)
	CreateUser(user *model.User) error
	GetProfileByUserID(userID int) (*model.Profile, error)
	CreateProfile(profile *model.Profile) error
	UpdateProfile(profile *model.Profile) error
	UpdateUser(user *model.User) error
	DeleteUser(id int) error

	// WorkoutRecord関連
	GetWorkoutRecordByIDAndUserID(id, userID int) (*model.WorkoutRecord, error)
	GetWorkoutRecordsByUserID(userID int) ([]*model.WorkoutRecord, error)
	GetLatestWorkoutRecordByUserID(userID int) (*model.WorkoutRecord, error)
	CreateWorkoutRecord(record *model.WorkoutRecord) error
	UpdateWorkoutRecord(record *model.WorkoutRecord) error
	DeleteWorkoutRecord(id int) error

	// TrainingPost関連
	CreateTrainingPost(post *model.TrainingPost) error
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

// GetProfileByUserID はユーザーIDからプロフィールを取得します
func (r *MySQLRepository) GetProfileByUserID(userID int) (*model.Profile, error) {
	var profile model.Profile
	if err := r.db.Where("user_id = ? AND deleted_at IS NULL", userID).First(&profile).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProfileNotFound
		}
		return nil, err
	}
	return &profile, nil
}

// CreateProfile はプロフィールを作成します
func (r *MySQLRepository) CreateProfile(profile *model.Profile) error {
	return r.db.Create(profile).Error
}

// UpdateProfile はプロフィールを更新します
func (r *MySQLRepository) UpdateProfile(profile *model.Profile) error {
	return r.db.Save(profile).Error
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
	var post model.TrainingPost
	if err := r.db.Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, userID).First(&post).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWorkoutRecordNotFound
		}
		return nil, err
	}
	return workoutRecordFromTrainingPost(&post), nil
}

// GetWorkoutRecordsByUserID はユーザーの運動記録一覧を取得します
func (r *MySQLRepository) GetWorkoutRecordsByUserID(userID int) ([]*model.WorkoutRecord, error) {
	var posts []*model.TrainingPost
	if err := r.db.Where("user_id = ? AND deleted_at IS NULL", userID).Order("trained_on DESC, created_at DESC").Find(&posts).Error; err != nil {
		return nil, err
	}
	records := make([]*model.WorkoutRecord, 0, len(posts))
	for _, post := range posts {
		records = append(records, workoutRecordFromTrainingPost(post))
	}
	return records, nil
}

// GetLatestWorkoutRecordByUserID はユーザーの最新の運動記録を取得します
func (r *MySQLRepository) GetLatestWorkoutRecordByUserID(userID int) (*model.WorkoutRecord, error) {
	var post model.TrainingPost
	if err := r.db.Where("user_id = ? AND deleted_at IS NULL", userID).Order("trained_on DESC, created_at DESC").First(&post).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWorkoutRecordNotFound
		}
		return nil, err
	}
	return workoutRecordFromTrainingPost(&post), nil
}

// CreateWorkoutRecord は運動記録を作成します
func (r *MySQLRepository) CreateWorkoutRecord(record *model.WorkoutRecord) error {
	post := trainingPostFromWorkoutRecord(record)
	if err := r.db.Create(post).Error; err != nil {
		return err
	}
	applyTrainingPostToWorkoutRecord(record, post)
	return nil
}

// UpdateWorkoutRecord は運動記録を更新します
func (r *MySQLRepository) UpdateWorkoutRecord(record *model.WorkoutRecord) error {
	var post model.TrainingPost
	if err := r.db.Where("id = ? AND user_id = ? AND deleted_at IS NULL", record.ID, record.UserID).First(&post).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrWorkoutRecordNotFound
		}
		return err
	}

	next := trainingPostFromWorkoutRecord(record)
	post.DidTrain = next.DidTrain
	post.TrainedOn = next.TrainedOn
	post.StartedAt = next.StartedAt
	post.EndedAt = next.EndedAt
	post.ExerciseType = next.ExerciseType
	post.DurationMinutes = next.DurationMinutes
	post.Note = next.Note
	post.Visibility = next.Visibility

	if err := r.db.Save(&post).Error; err != nil {
		return err
	}
	applyTrainingPostToWorkoutRecord(record, &post)
	return nil
}

// DeleteWorkoutRecord は運動記録を削除します
func (r *MySQLRepository) DeleteWorkoutRecord(id int) error {
	now := time.Now()
	return r.db.Model(&model.TrainingPost{}).Where("id = ?", id).Update("deleted_at", now).Error
}

// CreateTrainingPost はトレーニング報告投稿を作成します
func (r *MySQLRepository) CreateTrainingPost(post *model.TrainingPost) error {
	return r.db.Create(post).Error
}

func trainingPostFromWorkoutRecord(record *model.WorkoutRecord) *model.TrainingPost {
	startedAt := record.StartTime
	endedAt := record.StartTime.Add(time.Duration(record.DurationMinutes) * time.Minute)
	duration := record.DurationMinutes
	exerciseType := exerciseTypeID(record.ExerciseType)
	note := strings.TrimSpace(record.ExerciseType)
	visibility := "followers_and_recommended"

	post := &model.TrainingPost{
		ID:              record.ID,
		UserID:          record.UserID,
		DidTrain:        true,
		TrainedOn:       dateOnly(record.StartTime),
		StartedAt:       &startedAt,
		EndedAt:         &endedAt,
		ExerciseType:    exerciseType,
		DurationMinutes: &duration,
		Visibility:      visibility,
	}
	if note != "" {
		post.Note = &note
	}
	return post
}

func workoutRecordFromTrainingPost(post *model.TrainingPost) *model.WorkoutRecord {
	recordType := "normal"
	if post.ExerciseType == nil {
		recordType = "quick"
	}

	startTime := post.TrainedOn
	if post.StartedAt != nil {
		startTime = *post.StartedAt
	}

	duration := 0
	if post.DurationMinutes != nil {
		duration = *post.DurationMinutes
	}

	return &model.WorkoutRecord{
		ID:              post.ID,
		UserID:          post.UserID,
		RecordType:      recordType,
		ExerciseType:    exerciseTypeLabel(post.ExerciseType, post.Note),
		StartTime:       startTime,
		DurationMinutes: duration,
		CreatedAt:       post.CreatedAt,
		UpdatedAt:       post.UpdatedAt,
	}
}

func applyTrainingPostToWorkoutRecord(record *model.WorkoutRecord, post *model.TrainingPost) {
	mapped := workoutRecordFromTrainingPost(post)
	record.ID = mapped.ID
	record.UserID = mapped.UserID
	record.RecordType = mapped.RecordType
	record.ExerciseType = mapped.ExerciseType
	record.StartTime = mapped.StartTime
	record.DurationMinutes = mapped.DurationMinutes
	record.CreatedAt = mapped.CreatedAt
	record.UpdatedAt = mapped.UpdatedAt
}

func dateOnly(value time.Time) time.Time {
	year, month, day := value.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, value.Location())
}

func exerciseTypeID(exercise string) *int {
	normalized := strings.TrimSpace(exercise)
	if normalized == "" {
		return nil
	}

	mappings := []struct {
		keyword string
		id      int
	}{
		{keyword: "胸", id: 1},
		{keyword: "ベンチ", id: 1},
		{keyword: "背中", id: 2},
		{keyword: "デッドリフト", id: 2},
		{keyword: "脚", id: 3},
		{keyword: "スクワット", id: 3},
		{keyword: "肩", id: 4},
		{keyword: "腕", id: 5},
		{keyword: "体幹", id: 6},
	}
	for _, mapping := range mappings {
		if strings.Contains(normalized, mapping.keyword) {
			return &mapping.id
		}
	}

	id := 0
	return &id
}

func exerciseTypeLabel(exerciseType *int, note *string) string {
	if note != nil && strings.TrimSpace(*note) != "" {
		return *note
	}
	if exerciseType == nil {
		return ""
	}

	switch *exerciseType {
	case 1:
		return "胸"
	case 2:
		return "背中"
	case 3:
		return "脚"
	case 4:
		return "肩"
	case 5:
		return "腕"
	case 6:
		return "体幹"
	default:
		return "その他"
	}
}
