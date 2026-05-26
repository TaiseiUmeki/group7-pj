package model

import "time"

// WorkoutRecord は運動記録を表します。
type WorkoutRecord struct {
	ID              int       `json:"id" gorm:"primaryKey"`
	UserID          int       `json:"user_id" gorm:"index;not null"`
	RecordType      string    `json:"record_type" gorm:"size:20;not null"`
	ExerciseType    string    `json:"exercise_type,omitempty" gorm:"size:255"`
	StartTime       time.Time `json:"start_time" gorm:"not null"`
	DurationMinutes int       `json:"duration_minutes" gorm:"not null"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}