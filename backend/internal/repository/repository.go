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

var ErrTrainingPostNotFound = errors.New("training post not found")

// Repository はデータベースアクセス層のインターフェースです
type Repository interface {
	// User関連
	GetUserByID(id int) (*model.User, error)
	GetUserByEmail(email string) (*model.User, error)
	GetAllUsers() ([]*model.User, error)
	CreateUser(user *model.User) error
	GetProfileByUserID(userID int) (*model.Profile, error)
	GetProfileTagIDs(profileID int) ([]int, error)
	CreateProfile(profile *model.Profile) error
	ReplaceProfileTags(profileID int, tagIDs []int) error
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
	ListTimelinePosts(input TimelineQuery) ([]TimelinePostRow, error)
	GetTimelinePostByID(postID int, currentUserID int) (*TimelinePostRow, error)
	CreatePostLike(postID int, userID int) error
	DeletePostLike(postID int, userID int) error
	GetPostLikeStatus(postID int, userID int) (PostLikeStatus, error)

	// Follow関連
	CreateFollow(followerUserID int, followeeUserID int) error
	DeleteFollow(followerUserID int, followeeUserID int) error
	GetFollowStatus(followerUserID int, followeeUserID int) (FollowStatus, error)
	ListFollowingProfiles(userID int) ([]FollowConnectionRow, error)
	ListFollowerProfiles(userID int) ([]FollowConnectionRow, error)
}

type TimelineQuery struct {
	UserID      int
	Source      string
	Limit       int
	CursorTime  *time.Time
	CursorID    *int
	CurrentDate time.Time
}

type TimelinePostRow struct {
	ID                    int
	Source                string
	UserID                int
	DidTrain              bool
	TrainedOn             time.Time
	StartedAt             *time.Time
	EndedAt               *time.Time
	ExerciseType          *int
	DurationMinutes       *int
	Note                  *string
	Visibility            string
	CreatedAt             time.Time
	AuthorProfileID       int
	AuthorUserID          int
	AuthorUsername        string
	AuthorBio             *string
	TrainingFrequencyDays int
	LikeCount             int
	LikedByMe             bool
}

type PostLikeStatus struct {
	LikeCount int  `json:"likeCount"`
	LikedByMe bool `json:"likedByMe"`
}

type FollowStatus struct {
	Following bool `json:"following"`
}

type FollowConnectionRow struct {
	UserID   int
	Username string
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

// GetProfileTagIDs はプロフィールに設定されたタグIDを取得します
func (r *MySQLRepository) GetProfileTagIDs(profileID int) ([]int, error) {
	var profileTags []model.ProfileTag
	if err := r.db.Where("profile_id = ?", profileID).Order("tag_id ASC").Find(&profileTags).Error; err != nil {
		return nil, err
	}

	tagIDs := make([]int, 0, len(profileTags))
	for _, profileTag := range profileTags {
		tagIDs = append(tagIDs, profileTag.TagID)
	}
	return tagIDs, nil
}

// CreateProfile はプロフィールを作成します
func (r *MySQLRepository) CreateProfile(profile *model.Profile) error {
	return r.db.Create(profile).Error
}

// ReplaceProfileTags はプロフィールのタグを指定ID群で置き換えます
func (r *MySQLRepository) ReplaceProfileTags(profileID int, tagIDs []int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("profile_id = ?", profileID).Delete(&model.ProfileTag{}).Error; err != nil {
			return err
		}

		for _, tagID := range tagIDs {
			profileTag := model.ProfileTag{
				ProfileID: profileID,
				TagID:     tagID,
			}
			if err := tx.Create(&profileTag).Error; err != nil {
				return err
			}
		}
		return nil
	})
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

func (r *MySQLRepository) GetTimelinePostByID(postID int, currentUserID int) (*TimelinePostRow, error) {
	var row TimelinePostRow
	err := r.timelinePostBaseQuery(currentUserID).
		Where("tp.id = ?", postID).
		First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTrainingPostNotFound
		}
		return nil, err
	}
	return &row, nil
}

func (r *MySQLRepository) CreatePostLike(postID int, userID int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := ensureTrainingPostExists(tx, postID); err != nil {
			return err
		}

		var existing model.PostLike
		err := tx.Where("post_id = ? AND user_id = ?", postID, userID).First(&existing).Error
		if err == nil {
			return nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		return tx.Create(&model.PostLike{PostID: postID, UserID: userID}).Error
	})
}

func (r *MySQLRepository) DeletePostLike(postID int, userID int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := ensureTrainingPostExists(tx, postID); err != nil {
			return err
		}
		return tx.Where("post_id = ? AND user_id = ?", postID, userID).Delete(&model.PostLike{}).Error
	})
}

func (r *MySQLRepository) GetPostLikeStatus(postID int, userID int) (PostLikeStatus, error) {
	if err := ensureTrainingPostExists(r.db, postID); err != nil {
		return PostLikeStatus{}, err
	}

	var likeCount int64
	if err := r.db.Model(&model.PostLike{}).Where("post_id = ?", postID).Count(&likeCount).Error; err != nil {
		return PostLikeStatus{}, err
	}

	var liked model.PostLike
	err := r.db.Where("post_id = ? AND user_id = ?", postID, userID).First(&liked).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return PostLikeStatus{}, err
	}

	return PostLikeStatus{
		LikeCount: int(likeCount),
		LikedByMe: err == nil,
	}, nil
}

func (r *MySQLRepository) CreateFollow(followerUserID int, followeeUserID int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := ensureUserExists(tx, followeeUserID); err != nil {
			return err
		}

		var existing model.Follow
		err := tx.Where("follower_user_id = ? AND followee_user_id = ?", followerUserID, followeeUserID).First(&existing).Error
		if err == nil {
			return nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		return tx.Create(&model.Follow{FollowerUserID: followerUserID, FolloweeUserID: followeeUserID}).Error
	})
}

func (r *MySQLRepository) DeleteFollow(followerUserID int, followeeUserID int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := ensureUserExists(tx, followeeUserID); err != nil {
			return err
		}
		return tx.Where("follower_user_id = ? AND followee_user_id = ?", followerUserID, followeeUserID).Delete(&model.Follow{}).Error
	})
}

func (r *MySQLRepository) GetFollowStatus(followerUserID int, followeeUserID int) (FollowStatus, error) {
	if err := ensureUserExists(r.db, followeeUserID); err != nil {
		return FollowStatus{}, err
	}

	var follow model.Follow
	err := r.db.Where("follower_user_id = ? AND followee_user_id = ?", followerUserID, followeeUserID).First(&follow).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return FollowStatus{}, err
	}
	return FollowStatus{Following: err == nil}, nil
}

func (r *MySQLRepository) ListFollowingProfiles(userID int) ([]FollowConnectionRow, error) {
	var rows []FollowConnectionRow
	err := r.db.Table("follows AS f").
		Select("p.user_id, p.username").
		Joins("JOIN profiles AS p ON p.user_id = f.followee_user_id AND p.deleted_at IS NULL").
		Where("f.follower_user_id = ?", userID).
		Order("f.created_at DESC, f.id DESC").
		Find(&rows).Error
	return rows, err
}

func (r *MySQLRepository) ListFollowerProfiles(userID int) ([]FollowConnectionRow, error) {
	var rows []FollowConnectionRow
	err := r.db.Table("follows AS f").
		Select("p.user_id, p.username").
		Joins("JOIN profiles AS p ON p.user_id = f.follower_user_id AND p.deleted_at IS NULL").
		Where("f.followee_user_id = ?", userID).
		Order("f.created_at DESC, f.id DESC").
		Find(&rows).Error
	return rows, err
}

func ensureUserExists(db *gorm.DB, userID int) error {
	var user model.User
	err := db.Select("id").Where("id = ? AND deleted_at IS NULL", userID).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}
	return nil
}

func ensureTrainingPostExists(db *gorm.DB, postID int) error {
	var post model.TrainingPost
	err := db.Select("id").Where("id = ? AND deleted_at IS NULL", postID).First(&post).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrTrainingPostNotFound
		}
		return err
	}
	return nil
}

func (r *MySQLRepository) ListTimelinePosts(input TimelineQuery) ([]TimelinePostRow, error) {
	query := r.timelinePostBaseQuery(input.UserID).
		Where("tp.user_id <> ?", input.UserID)

	switch input.Source {
	case "following":
		query = query.
			Joins("JOIN follows AS f ON f.followee_user_id = tp.user_id AND f.follower_user_id = ?", input.UserID).
			Where("tp.visibility IN ?", []string{"followers", "followers_and_recommended"})
	case "recommended":
		query = query.
			Joins("JOIN recommendation_slots AS rs ON rs.recommended_user_id = tp.user_id AND rs.user_id = ? AND rs.slot_date = ? AND rs.status = 1", input.UserID, dateOnly(input.CurrentDate)).
			Where("tp.visibility IN ?", []string{"recommended", "followers_and_recommended"})
	default:
		return nil, errors.New("invalid timeline source")
	}

	if input.CursorTime != nil && input.CursorID != nil {
		query = query.Where("(tp.created_at < ? OR (tp.created_at = ? AND tp.id < ?))", input.CursorTime, input.CursorTime, *input.CursorID)
	}

	var rows []TimelinePostRow
	err := query.
		Order("tp.created_at DESC, tp.id DESC").
		Limit(input.Limit).
		Find(&rows).Error
	for i := range rows {
		rows[i].Source = input.Source
	}
	return rows, err
}

func (r *MySQLRepository) timelinePostBaseQuery(currentUserID int) *gorm.DB {
	return r.db.Table("training_posts AS tp").
		Select(`
			tp.id,
			tp.user_id,
			tp.did_train,
			tp.trained_on,
			tp.started_at,
			tp.ended_at,
			tp.exercise_type,
			tp.duration_minutes,
			tp.note,
			tp.visibility,
			tp.created_at,
			p.id AS author_profile_id,
			p.user_id AS author_user_id,
			p.username AS author_username,
			p.bio AS author_bio,
			p.training_frequency_days,
			(SELECT COUNT(*) FROM post_likes AS pl WHERE pl.post_id = tp.id) AS like_count,
			CASE WHEN my_like.id IS NULL THEN FALSE ELSE TRUE END AS liked_by_me
		`).
		Joins("JOIN profiles AS p ON p.user_id = tp.user_id AND p.deleted_at IS NULL").
		Joins("LEFT JOIN post_likes AS my_like ON my_like.post_id = tp.id AND my_like.user_id = ?", currentUserID).
		Where("tp.deleted_at IS NULL")
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
