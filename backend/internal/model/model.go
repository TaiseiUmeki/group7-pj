package model

import "time"

// User はユーザー認証情報を表します。
type User struct {
	ID              int        `json:"id" gorm:"primaryKey;type:bigint;autoIncrement"`
	Email           string     `json:"email" gorm:"size:255;not null;uniqueIndex:uk_users_email"`
	PasswordHash    string     `json:"-" gorm:"size:255;not null"`
	StreakDays      int        `json:"streak_days" gorm:"not null;default:0"`
	LastWorkoutDate *time.Time `json:"last_workout_date,omitempty" gorm:"type:date"`
	CreatedAt       time.Time  `json:"created_at" gorm:"not null;autoCreateTime"`
	UpdatedAt       time.Time  `json:"updated_at" gorm:"not null;autoUpdateTime"`
	DeletedAt       *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

// Profile はユーザーの表示情報、推薦条件、トレーニング頻度を表します。
type Profile struct {
	ID                    int        `json:"id" gorm:"primaryKey;type:bigint;autoIncrement"`
	UserID                int        `json:"user_id" gorm:"type:bigint;not null;uniqueIndex:uk_profiles_user_id"`
	Username              string     `json:"username" gorm:"size:80;not null"`
	Bio                   *string    `json:"bio,omitempty" gorm:"type:text"`
	TrainingFrequencyDays int        `json:"training_frequency_days" gorm:"not null;default:3"`
	CreatedAt             time.Time  `json:"created_at" gorm:"not null;autoCreateTime"`
	UpdatedAt             time.Time  `json:"updated_at" gorm:"not null;autoUpdateTime"`
	DeletedAt             *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

// ProfileTag はプロフィールに紐づく固定タグIDを表します。
type ProfileTag struct {
	ID        int       `json:"id" gorm:"primaryKey;type:bigint;autoIncrement"`
	ProfileID int       `json:"profile_id" gorm:"type:bigint;not null;uniqueIndex:uk_profile_tags_pair,priority:1;index:idx_profile_tags_profile"`
	TagID     int       `json:"tag_id" gorm:"not null;uniqueIndex:uk_profile_tags_pair,priority:2;index:idx_profile_tags_tag_id"`
	CreatedAt time.Time `json:"created_at" gorm:"not null;autoCreateTime"`
}

// TrainingSession はクイックスタートによる開始・終了記録を表します。
type TrainingSession struct {
	ID        int        `json:"id" gorm:"primaryKey;type:bigint;autoIncrement"`
	UserID    int        `json:"user_id" gorm:"type:bigint;not null;index:idx_training_sessions_user_status,priority:1"`
	StartedAt time.Time  `json:"started_at" gorm:"not null;index:idx_training_sessions_started_at"`
	EndedAt   *time.Time `json:"ended_at,omitempty"`
	Status    int        `json:"status" gorm:"not null;default:1;index:idx_training_sessions_user_status,priority:2"`
	CreatedAt time.Time  `json:"created_at" gorm:"not null;autoCreateTime"`
	UpdatedAt time.Time  `json:"updated_at" gorm:"not null;autoUpdateTime"`
}

// TrainingPost はトレーニング報告投稿を表します。
type TrainingPost struct {
	ID              int        `json:"id" gorm:"primaryKey;type:bigint;autoIncrement"`
	UserID          int        `json:"user_id" gorm:"type:bigint;not null;index:idx_training_posts_user_created,priority:1;index:idx_training_posts_user_trained_on,priority:1"`
	SessionID       *int       `json:"session_id,omitempty" gorm:"type:bigint;uniqueIndex:uk_training_posts_session_id"`
	DidTrain        bool       `json:"did_train" gorm:"not null;default:true"`
	TrainedOn       time.Time  `json:"trained_on" gorm:"type:date;not null;index:idx_training_posts_user_trained_on,priority:2"`
	StartedAt       *time.Time `json:"started_at,omitempty"`
	EndedAt         *time.Time `json:"ended_at,omitempty"`
	ExerciseType    *int       `json:"exercise_type,omitempty"`
	DurationMinutes *int       `json:"duration_minutes,omitempty"`
	Note            *string    `json:"note,omitempty" gorm:"type:text"`
	Visibility      string     `json:"visibility" gorm:"size:30;not null;default:followers_and_recommended"`
	CreatedAt       time.Time  `json:"created_at" gorm:"not null;autoCreateTime;index:idx_training_posts_user_created,priority:2;index:idx_training_posts_created_at"`
	UpdatedAt       time.Time  `json:"updated_at" gorm:"not null;autoUpdateTime"`
	DeletedAt       *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

// Follow はフォロー関係を表します。
type Follow struct {
	ID             int       `json:"id" gorm:"primaryKey;type:bigint;autoIncrement"`
	FollowerUserID int       `json:"follower_user_id" gorm:"type:bigint;not null;uniqueIndex:uk_follows_pair,priority:1"`
	FolloweeUserID int       `json:"followee_user_id" gorm:"type:bigint;not null;uniqueIndex:uk_follows_pair,priority:2;index:idx_follows_followee"`
	CreatedAt      time.Time `json:"created_at" gorm:"not null;autoCreateTime"`
}

// PostLike は投稿へのいいねを表します。
type PostLike struct {
	ID        int       `json:"id" gorm:"primaryKey;type:bigint;autoIncrement"`
	PostID    int       `json:"post_id" gorm:"type:bigint;not null;uniqueIndex:uk_post_likes_pair,priority:1"`
	UserID    int       `json:"user_id" gorm:"type:bigint;not null;uniqueIndex:uk_post_likes_pair,priority:2;index:idx_post_likes_user"`
	CreatedAt time.Time `json:"created_at" gorm:"not null;autoCreateTime"`
}

// RecommendationSlot は日替わり推薦ユーザー枠を表します。
type RecommendationSlot struct {
	ID                int       `json:"id" gorm:"primaryKey;type:bigint;autoIncrement"`
	UserID            int       `json:"user_id" gorm:"type:bigint;not null;uniqueIndex:uk_recommendation_slots_pair,priority:1;index:idx_recommendation_slots_user_date,priority:1"`
	RecommendedUserID int       `json:"recommended_user_id" gorm:"type:bigint;not null;uniqueIndex:uk_recommendation_slots_pair,priority:2"`
	SlotDate          time.Time `json:"slot_date" gorm:"type:date;not null;uniqueIndex:uk_recommendation_slots_pair,priority:3;index:idx_recommendation_slots_user_date,priority:2"`
	DisplayOrder      int       `json:"display_order" gorm:"not null;default:0"`
	Status            int       `json:"status" gorm:"not null;default:1;index:idx_recommendation_slots_status"`
	CreatedAt         time.Time `json:"created_at" gorm:"not null;autoCreateTime"`
	UpdatedAt         time.Time `json:"updated_at" gorm:"not null;autoUpdateTime"`
}

// SupportMessage はがんばれボタン押下による応援記録を表します。
type SupportMessage struct {
	ID             int       `json:"id" gorm:"primaryKey;type:bigint;autoIncrement"`
	SenderUserID   int       `json:"sender_user_id" gorm:"type:bigint;not null;index:idx_support_messages_sender_created,priority:1"`
	ReceiverUserID int       `json:"receiver_user_id" gorm:"type:bigint;not null;index:idx_support_messages_receiver_created,priority:1"`
	CreatedAt      time.Time `json:"created_at" gorm:"not null;autoCreateTime;index:idx_support_messages_sender_created,priority:2;index:idx_support_messages_receiver_created,priority:2"`
}

// Notification はユーザーへの通知を表します。
type Notification struct {
	ID               int        `json:"id" gorm:"primaryKey;type:bigint;autoIncrement"`
	UserID           int        `json:"user_id" gorm:"type:bigint;not null;index:idx_notifications_user_created,priority:1;index:idx_notifications_user_read,priority:1"`
	NotificationType int        `json:"notification_type" gorm:"not null"`
	TrainingPostID   *int       `json:"training_post_id,omitempty" gorm:"type:bigint"`
	SupportMessageID *int       `json:"support_message_id,omitempty" gorm:"type:bigint"`
	Body             string     `json:"body" gorm:"type:text;not null"`
	IsRead           bool       `json:"is_read" gorm:"not null;default:false;index:idx_notifications_user_read,priority:2"`
	CreatedAt        time.Time  `json:"created_at" gorm:"not null;autoCreateTime;index:idx_notifications_user_created,priority:2"`
	ReadAt           *time.Time `json:"read_at,omitempty"`
}

// Badge はバッジのマスタ情報を表します。
type Badge struct {
	ID             int       `json:"id" gorm:"primaryKey;type:bigint;autoIncrement"`
	Code           string    `json:"code" gorm:"size:80;not null;uniqueIndex:uk_badges_code"`
	Name           string    `json:"name" gorm:"size:100;not null"`
	Description    *string   `json:"description,omitempty" gorm:"type:text"`
	ConditionType  string    `json:"condition_type" gorm:"size:50;not null"`
	ConditionValue int       `json:"condition_value" gorm:"not null;default:0"`
	CreatedAt      time.Time `json:"created_at" gorm:"not null;autoCreateTime"`
	UpdatedAt      time.Time `json:"updated_at" gorm:"not null;autoUpdateTime"`
}

// UserBadge はユーザーが獲得したバッジを表します。
type UserBadge struct {
	ID       int       `json:"id" gorm:"primaryKey;type:bigint;autoIncrement"`
	UserID   int       `json:"user_id" gorm:"type:bigint;not null;uniqueIndex:uk_user_badges_pair,priority:1;index:idx_user_badges_user"`
	BadgeID  int       `json:"badge_id" gorm:"type:bigint;not null;uniqueIndex:uk_user_badges_pair,priority:2"`
	EarnedAt time.Time `json:"earned_at" gorm:"not null;autoCreateTime"`
}
