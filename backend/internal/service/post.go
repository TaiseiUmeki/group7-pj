package service

import (
	"backend/internal/model"
	"fmt"
	"strings"
	"time"
)

// TrainingPostInput はトレーニング報告投稿の入力値です。
type TrainingPostInput struct {
	SessionID       *int
	DidTrain        *bool
	TrainedOn       string
	StartedAt       *string
	EndedAt         *string
	ExerciseType    *int
	DurationMinutes *int
	Note            *string
	Visibility      string
}

// CreateTrainingPost はトレーニング報告投稿を作成します。
func (s *Service) CreateTrainingPost(userID int, input TrainingPostInput) (*model.TrainingPost, error) {
	post, err := s.buildTrainingPost(userID, input)
	if err != nil {
		return nil, err
	}

	if err := s.repo.CreateTrainingPost(post); err != nil {
		return nil, err
	}

	return post, nil
}

func (s *Service) buildTrainingPost(userID int, input TrainingPostInput) (*model.TrainingPost, error) {
	if input.DidTrain == nil {
		return nil, fmt.Errorf("did_train is required")
	}

	trainedOn, err := parseDate(input.TrainedOn)
	if err != nil {
		return nil, fmt.Errorf("trained_on is required")
	}

	startedAt, err := parseOptionalDateTime(input.StartedAt)
	if err != nil {
		return nil, fmt.Errorf("started_at is invalid")
	}
	endedAt, err := parseOptionalDateTime(input.EndedAt)
	if err != nil {
		return nil, fmt.Errorf("ended_at is invalid")
	}

	if input.DurationMinutes != nil && *input.DurationMinutes < 0 {
		return nil, fmt.Errorf("duration_minutes must be greater than or equal to 0")
	}

	visibility := strings.TrimSpace(input.Visibility)
	if visibility == "" {
		visibility = "followers_and_recommended"
	}
	switch visibility {
	case "followers", "recommended", "followers_and_recommended":
	default:
		return nil, fmt.Errorf("invalid visibility")
	}

	note := trimOptionalString(input.Note)

	return &model.TrainingPost{
		UserID:          userID,
		SessionID:       input.SessionID,
		DidTrain:        *input.DidTrain,
		TrainedOn:       trainedOn,
		StartedAt:       startedAt,
		EndedAt:         endedAt,
		ExerciseType:    input.ExerciseType,
		DurationMinutes: input.DurationMinutes,
		Note:            note,
		Visibility:      visibility,
	}, nil
}

func parseDate(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, fmt.Errorf("empty date")
	}
	if parsed, err := time.Parse("2006-01-02", value); err == nil {
		return parsed, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}, err
	}
	year, month, day := parsed.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, parsed.Location()), nil
}

func parseOptionalDateTime(value *string) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func trimOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
