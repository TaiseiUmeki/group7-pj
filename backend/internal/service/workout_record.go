package service

import (
	"backend/internal/model"
	"fmt"
	"strings"
	"time"
)

const (
	WorkoutRecordTypeQuick  = "quick"
	WorkoutRecordTypeNormal = "normal"
)

// WorkoutRecordInput は運動記録の入力値です。
type WorkoutRecordInput struct {
	RecordType      string
	ExerciseType    string
	StartTime       time.Time
	DurationMinutes int
}

// GetWorkoutRecords はユーザーの運動記録一覧を取得します。
func (s *Service) GetWorkoutRecords(userID int) ([]*model.WorkoutRecord, error) {
	return s.repo.GetWorkoutRecordsByUserID(userID)
}

// GetWorkoutRecord はユーザーの運動記録を1件取得します。
func (s *Service) GetWorkoutRecord(userID, recordID int) (*model.WorkoutRecord, error) {
	return s.repo.GetWorkoutRecordByIDAndUserID(recordID, userID)
}

// CreateWorkoutRecord は運動記録を作成します。
func (s *Service) CreateWorkoutRecord(userID int, input WorkoutRecordInput) (*model.WorkoutRecord, error) {
	record, err := s.buildWorkoutRecord(userID, input)
	if err != nil {
		return nil, err
	}

	if err := s.repo.CreateWorkoutRecord(record); err != nil {
		return nil, err
	}

	return record, nil
}

// UpdateWorkoutRecord は運動記録を更新します。
func (s *Service) UpdateWorkoutRecord(userID, recordID int, input WorkoutRecordInput) (*model.WorkoutRecord, error) {
	record, err := s.repo.GetWorkoutRecordByIDAndUserID(recordID, userID)
	if err != nil {
		return nil, err
	}

	updatedRecord, err := s.buildWorkoutRecord(userID, input)
	if err != nil {
		return nil, err
	}

	record.RecordType = updatedRecord.RecordType
	record.ExerciseType = updatedRecord.ExerciseType
	record.StartTime = updatedRecord.StartTime
	record.DurationMinutes = updatedRecord.DurationMinutes

	if err := s.repo.UpdateWorkoutRecord(record); err != nil {
		return nil, err
	}

	return record, nil
}

func (s *Service) buildWorkoutRecord(userID int, input WorkoutRecordInput) (*model.WorkoutRecord, error) {
	recordType := strings.TrimSpace(strings.ToLower(input.RecordType))
	exerciseType := strings.TrimSpace(input.ExerciseType)

	if input.StartTime.IsZero() {
		return nil, fmt.Errorf("start time is required")
	}
	if input.DurationMinutes <= 0 {
		return nil, fmt.Errorf("duration minutes must be greater than 0")
	}

	switch recordType {
	case WorkoutRecordTypeQuick:
		if exerciseType != "" {
			return nil, fmt.Errorf("quick record cannot include exercise type")
		}
	case WorkoutRecordTypeNormal:
		if exerciseType == "" {
			return nil, fmt.Errorf("exercise type is required for normal record")
		}
	default:
		return nil, fmt.Errorf("invalid record type")
	}

	return &model.WorkoutRecord{
		UserID:          userID,
		RecordType:      recordType,
		ExerciseType:    exerciseType,
		StartTime:       input.StartTime,
		DurationMinutes: input.DurationMinutes,
	}, nil
}