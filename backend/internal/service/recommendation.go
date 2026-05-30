package service

import (
	"time"

	"backend/internal/repository"
)

const recommendationLimit = 5

type RecommendationUserView struct {
	ID       int              `json:"id"`
	Username string           `json:"username"`
	Tags     []ProfileTagView `json:"tags"`
}

type RecommendationItemView struct {
	User        RecommendationUserView `json:"user"`
	Status      int                    `json:"status"`
	StatusLabel string                 `json:"statusLabel"`
	IsFollowing bool                   `json:"isFollowing"`
}

type RecommendationsResponse struct {
	Items []RecommendationItemView `json:"items"`
}

func (s *Service) GetRecommendations(userID int) (*RecommendationsResponse, error) {
	rows, err := s.repo.ListDailyRecommendationProfiles(repository.RecommendationQuery{
		UserID:      userID,
		CurrentDate: time.Now(),
		Limit:       recommendationLimit,
	})
	if err != nil {
		return nil, err
	}

	items := make([]RecommendationItemView, 0, len(rows))
	for _, row := range rows {
		tagIDs, err := s.repo.GetProfileTagIDs(row.ProfileID)
		if err != nil {
			return nil, err
		}
		items = append(items, RecommendationItemView{
			User: RecommendationUserView{
				ID:       row.UserID,
				Username: row.Username,
				Tags:     buildProfileTagViews(tagIDs),
			},
			Status:      row.Status,
			StatusLabel: recommendationStatusLabel(row.Status),
			IsFollowing: false,
		})
	}

	return &RecommendationsResponse{Items: items}, nil
}

func recommendationStatusLabel(status int) string {
	switch status {
	case 1:
		return "有効"
	case 2:
		return "フォロー済み"
	case 3:
		return "期限切れ"
	default:
		return "不明"
	}
}
