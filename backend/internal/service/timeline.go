package service

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"backend/internal/repository"
)

const (
	TimelineSourceFollowing   = "following"
	TimelineSourceRecommended = "recommended"
	defaultTimelineLimit      = 20
	maxTimelineLimit          = 50
)

type TimelineInput struct {
	Source string
	Limit  int
	Cursor string
}

type TimelineResponse struct {
	Items      []TimelinePostView `json:"items"`
	NextCursor *string            `json:"nextCursor"`
}

type TimelinePostView struct {
	ID                int            `json:"id"`
	Source            string         `json:"source"`
	DidTrain          bool           `json:"didTrain"`
	TrainedOn         string         `json:"trainedOn"`
	StartedAt         *string        `json:"startedAt,omitempty"`
	EndedAt           *string        `json:"endedAt,omitempty"`
	ExerciseType      *int           `json:"exerciseType,omitempty"`
	ExerciseTypeLabel *string        `json:"exerciseTypeLabel,omitempty"`
	DurationMinutes   *int           `json:"durationMinutes,omitempty"`
	Note              *string        `json:"note,omitempty"`
	Visibility        string         `json:"visibility"`
	LikeCount         int            `json:"likeCount"`
	LikedByMe         bool           `json:"likedByMe"`
	CreatedAt         string         `json:"createdAt"`
	Author            TimelineAuthor `json:"author"`
}

type TimelineAuthor struct {
	ID                    int              `json:"id"`
	Username              string           `json:"username"`
	Bio                   *string          `json:"bio,omitempty"`
	TrainingFrequencyDays int              `json:"trainingFrequencyDays"`
	Tags                  []ProfileTagView `json:"tags"`
}

type timelineCursor struct {
	CreatedAt string `json:"createdAt"`
	ID        int    `json:"id"`
}

var exerciseTypeLabels = map[int]string{
	1: "胸",
	2: "背中",
	3: "脚",
	4: "肩",
	5: "腕",
	6: "体幹",
}

func (s *Service) GetTimeline(userID int, input TimelineInput) (*TimelineResponse, error) {
	source := strings.TrimSpace(input.Source)
	if source == "" {
		source = TimelineSourceFollowing
	}
	switch source {
	case TimelineSourceFollowing, TimelineSourceRecommended:
	default:
		return nil, fmt.Errorf("invalid source")
	}

	limit := input.Limit
	if limit <= 0 {
		limit = defaultTimelineLimit
	}
	if limit > maxTimelineLimit {
		limit = maxTimelineLimit
	}

	cursorTime, cursorID, err := decodeTimelineCursor(input.Cursor)
	if err != nil {
		return nil, err
	}

	rows, err := s.repo.ListTimelinePosts(repository.TimelineQuery{
		UserID:      userID,
		Source:      source,
		Limit:       limit + 1,
		CursorTime:  cursorTime,
		CursorID:    cursorID,
		CurrentDate: time.Now(),
	})
	if err != nil {
		return nil, err
	}

	hasNext := len(rows) > limit
	if hasNext {
		rows = rows[:limit]
	}

	items := make([]TimelinePostView, 0, len(rows))
	for _, row := range rows {
		tagIDs, err := s.repo.GetProfileTagIDs(row.AuthorProfileID)
		if err != nil {
			return nil, err
		}
		items = append(items, buildTimelinePostView(row, buildProfileTagViews(tagIDs)))
	}

	var nextCursor *string
	if hasNext && len(rows) > 0 {
		encoded, err := encodeTimelineCursor(rows[len(rows)-1].CreatedAt, rows[len(rows)-1].ID)
		if err != nil {
			return nil, err
		}
		nextCursor = &encoded
	}

	return &TimelineResponse{
		Items:      items,
		NextCursor: nextCursor,
	}, nil
}

func (s *Service) GetTimelinePost(postID int, currentUserID int) (*TimelinePostView, error) {
	row, err := s.repo.GetTimelinePostByID(postID, currentUserID)
	if err != nil {
		return nil, err
	}
	tagIDs, err := s.repo.GetProfileTagIDs(row.AuthorProfileID)
	if err != nil {
		return nil, err
	}
	post := buildTimelinePostView(*row, buildProfileTagViews(tagIDs))
	return &post, nil
}

func (s *Service) GetUserProfile(userID int) (*ProfileView, error) {
	return s.GetProfile(userID)
}

func buildTimelinePostView(row repository.TimelinePostRow, tags []ProfileTagView) TimelinePostView {
	var startedAt *string
	if row.StartedAt != nil {
		value := row.StartedAt.Format(time.RFC3339)
		startedAt = &value
	}

	var endedAt *string
	if row.EndedAt != nil {
		value := row.EndedAt.Format(time.RFC3339)
		endedAt = &value
	}

	var exerciseTypeLabel *string
	if row.ExerciseType != nil {
		if label, ok := exerciseTypeLabels[*row.ExerciseType]; ok {
			exerciseTypeLabel = &label
		}
	}

	return TimelinePostView{
		ID:                row.ID,
		Source:            row.Source,
		DidTrain:          row.DidTrain,
		TrainedOn:         row.TrainedOn.Format("2006-01-02"),
		StartedAt:         startedAt,
		EndedAt:           endedAt,
		ExerciseType:      row.ExerciseType,
		ExerciseTypeLabel: exerciseTypeLabel,
		DurationMinutes:   row.DurationMinutes,
		Note:              row.Note,
		Visibility:        row.Visibility,
		LikeCount:         row.LikeCount,
		LikedByMe:         row.LikedByMe,
		CreatedAt:         row.CreatedAt.Format(time.RFC3339),
		Author: TimelineAuthor{
			ID:                    row.AuthorUserID,
			Username:              row.AuthorUsername,
			Bio:                   row.AuthorBio,
			TrainingFrequencyDays: row.TrainingFrequencyDays,
			Tags:                  tags,
		},
	}
}

func decodeTimelineCursor(value string) (*time.Time, *int, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil, nil
	}

	raw, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid cursor")
	}

	var cursor timelineCursor
	if err := json.Unmarshal(raw, &cursor); err != nil {
		return nil, nil, fmt.Errorf("invalid cursor")
	}

	createdAt, err := time.Parse(time.RFC3339Nano, cursor.CreatedAt)
	if err != nil || cursor.ID == 0 {
		return nil, nil, fmt.Errorf("invalid cursor")
	}

	return &createdAt, &cursor.ID, nil
}

func encodeTimelineCursor(createdAt time.Time, id int) (string, error) {
	raw, err := json.Marshal(timelineCursor{
		CreatedAt: createdAt.Format(time.RFC3339Nano),
		ID:        id,
	})
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}
