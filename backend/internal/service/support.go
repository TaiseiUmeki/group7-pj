package service

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"backend/internal/model"
	"backend/internal/repository"
)

const (
	NotificationTypeSupport  = 1
	defaultNotificationLimit = 20
	maxNotificationLimit     = 50
)

var ErrSupportTargetNotEligible = errors.New("support target is not eligible")

type SupportTargetUserView struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
}

type SupportTargetItemView struct {
	User                  SupportTargetUserView `json:"user"`
	LastTrainedOn         string                `json:"lastTrainedOn"`
	TrainingFrequencyDays int                   `json:"trainingFrequencyDays"`
	DaysWithoutTraining   int                   `json:"daysWithoutTraining"`
}

type SupportTargetsResponse struct {
	Items []SupportTargetItemView `json:"items"`
}

type CreateSupportInput struct {
	ReceiverUserID int
}

type SupportResponse struct {
	ID             int    `json:"id"`
	ReceiverUserID int    `json:"receiverUserId"`
	CreatedAt      string `json:"createdAt"`
}

type NotificationsInput struct {
	Limit      int
	Cursor     string
	UnreadOnly bool
}

type NotificationsResponse struct {
	Items      []NotificationView `json:"items"`
	NextCursor *string            `json:"nextCursor"`
}

type NotificationView struct {
	ID                    int    `json:"id"`
	NotificationType      int    `json:"notificationType"`
	NotificationTypeLabel string `json:"notificationTypeLabel"`
	Body                  string `json:"body"`
	TrainingPostID        *int   `json:"trainingPostId"`
	SupportMessageID      *int   `json:"supportMessageId"`
	IsRead                bool   `json:"isRead"`
	CreatedAt             string `json:"createdAt"`
}

type MarkNotificationReadResponse struct {
	ID     int    `json:"id"`
	IsRead bool   `json:"isRead"`
	ReadAt string `json:"readAt"`
}

type notificationCursor struct {
	CreatedAt string `json:"createdAt"`
	ID        int    `json:"id"`
}

func (s *Service) GetSupportTargets(userID int) (*SupportTargetsResponse, error) {
	currentDate := supportDateOnly(time.Now())
	rows, err := s.repo.ListSupportTargetRows(userID, currentDate)
	if err != nil {
		return nil, err
	}

	items := make([]SupportTargetItemView, 0, len(rows))
	for _, row := range rows {
		items = append(items, buildSupportTargetItem(row, currentDate))
	}
	return &SupportTargetsResponse{Items: items}, nil
}

func (s *Service) CreateSupport(senderUserID int, input CreateSupportInput) (*SupportResponse, error) {
	if input.ReceiverUserID <= 0 {
		return nil, fmt.Errorf("receiverUserId is required")
	}
	if senderUserID == input.ReceiverUserID {
		return nil, ErrSupportTargetNotEligible
	}

	currentDate := supportDateOnly(time.Now())
	targets, err := s.repo.ListSupportTargetRows(senderUserID, currentDate)
	if err != nil {
		return nil, err
	}
	eligible := false
	for _, target := range targets {
		if target.UserID == input.ReceiverUserID {
			eligible = true
			break
		}
	}
	if !eligible {
		return nil, ErrSupportTargetNotEligible
	}

	senderProfile, err := s.repo.GetProfileByUserID(senderUserID)
	if err != nil {
		return nil, err
	}

	support := &model.SupportMessage{
		SenderUserID:   senderUserID,
		ReceiverUserID: input.ReceiverUserID,
	}
	notification := &model.Notification{
		UserID:           input.ReceiverUserID,
		NotificationType: NotificationTypeSupport,
		Body:             fmt.Sprintf("%sさんから応援が届きました", senderProfile.Username),
	}
	if err := s.repo.CreateSupportWithNotification(support, notification); err != nil {
		return nil, err
	}

	return &SupportResponse{
		ID:             support.ID,
		ReceiverUserID: support.ReceiverUserID,
		CreatedAt:      support.CreatedAt.Format(time.RFC3339),
	}, nil
}

func (s *Service) GetNotifications(userID int, input NotificationsInput) (*NotificationsResponse, error) {
	limit := input.Limit
	if limit <= 0 {
		limit = defaultNotificationLimit
	}
	if limit > maxNotificationLimit {
		limit = maxNotificationLimit
	}

	cursorTime, cursorID, err := decodeNotificationCursor(input.Cursor)
	if err != nil {
		return nil, err
	}

	rows, err := s.repo.ListNotificationRows(repository.NotificationQuery{
		UserID:     userID,
		Limit:      limit + 1,
		CursorTime: cursorTime,
		CursorID:   cursorID,
		UnreadOnly: input.UnreadOnly,
	})
	if err != nil {
		return nil, err
	}

	hasNext := len(rows) > limit
	if hasNext {
		rows = rows[:limit]
	}

	items := make([]NotificationView, 0, len(rows))
	for _, row := range rows {
		items = append(items, buildNotificationView(row))
	}

	var nextCursor *string
	if hasNext && len(rows) > 0 {
		encoded, err := encodeNotificationCursor(rows[len(rows)-1].CreatedAt, rows[len(rows)-1].ID)
		if err != nil {
			return nil, err
		}
		nextCursor = &encoded
	}

	return &NotificationsResponse{Items: items, NextCursor: nextCursor}, nil
}

func (s *Service) MarkNotificationRead(userID int, notificationID int) (*MarkNotificationReadResponse, error) {
	if notificationID <= 0 {
		return nil, fmt.Errorf("invalid notification id")
	}
	notification, err := s.repo.MarkNotificationRead(userID, notificationID, time.Now())
	if err != nil {
		return nil, err
	}
	readAt := ""
	if notification.ReadAt != nil {
		readAt = notification.ReadAt.Format(time.RFC3339)
	}
	return &MarkNotificationReadResponse{
		ID:     notification.ID,
		IsRead: notification.IsRead,
		ReadAt: readAt,
	}, nil
}

func buildSupportTargetItem(row repository.SupportTargetRow, currentDate time.Time) SupportTargetItemView {
	lastTrainedOn := supportDateOnly(row.LastTrainedOn)
	return SupportTargetItemView{
		User: SupportTargetUserView{
			ID:       row.UserID,
			Username: row.Username,
		},
		LastTrainedOn:         lastTrainedOn.Format("2006-01-02"),
		TrainingFrequencyDays: row.TrainingFrequencyDays,
		DaysWithoutTraining:   int(currentDate.Sub(lastTrainedOn).Hours() / 24),
	}
}

func buildNotificationView(row repository.NotificationRow) NotificationView {
	return NotificationView{
		ID:                    row.ID,
		NotificationType:      row.NotificationType,
		NotificationTypeLabel: notificationTypeLabel(row.NotificationType),
		Body:                  row.Body,
		TrainingPostID:        row.TrainingPostID,
		SupportMessageID:      row.SupportMessageID,
		IsRead:                row.IsRead,
		CreatedAt:             row.CreatedAt.Format(time.RFC3339),
	}
}

func notificationTypeLabel(notificationType int) string {
	switch notificationType {
	case NotificationTypeSupport:
		return "応援"
	case 2:
		return "サボり検知"
	default:
		return "不明"
	}
}

func decodeNotificationCursor(value string) (*time.Time, *int, error) {
	if value == "" {
		return nil, nil, nil
	}
	raw, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid cursor")
	}
	var cursor notificationCursor
	if err := json.Unmarshal(raw, &cursor); err != nil {
		return nil, nil, fmt.Errorf("invalid cursor")
	}
	createdAt, err := time.Parse(time.RFC3339Nano, cursor.CreatedAt)
	if err != nil || cursor.ID == 0 {
		return nil, nil, fmt.Errorf("invalid cursor")
	}
	return &createdAt, &cursor.ID, nil
}

func encodeNotificationCursor(createdAt time.Time, id int) (string, error) {
	raw, err := json.Marshal(notificationCursor{
		CreatedAt: createdAt.Format(time.RFC3339Nano),
		ID:        id,
	})
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func supportDateOnly(value time.Time) time.Time {
	year, month, day := value.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, value.Location())
}
