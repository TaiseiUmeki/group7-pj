package service

import (
	"strconv"

	"backend/internal/repository"
)

type ConnectionView struct {
	UserID   int    `json:"userId"`
	Username string `json:"username"`
	Handle   string `json:"handle"`
	Relation string `json:"relation"`
}

type ConnectionsResponse struct {
	Items []ConnectionView `json:"items"`
}

func (s *Service) GetFollowing(userID int) (*ConnectionsResponse, error) {
	rows, err := s.repo.ListFollowingProfiles(userID)
	if err != nil {
		return nil, err
	}
	return &ConnectionsResponse{Items: buildConnectionViews(rows, "フォロー中")}, nil
}

func (s *Service) GetFollowers(userID int) (*ConnectionsResponse, error) {
	rows, err := s.repo.ListFollowerProfiles(userID)
	if err != nil {
		return nil, err
	}
	return &ConnectionsResponse{Items: buildConnectionViews(rows, "フォロワー")}, nil
}

func buildConnectionViews(rows []repository.FollowConnectionRow, relation string) []ConnectionView {
	items := make([]ConnectionView, 0, len(rows))
	for _, row := range rows {
		items = append(items, ConnectionView{
			UserID:   row.UserID,
			Username: row.Username,
			Handle:   userHandle(row.UserID),
			Relation: relation,
		})
	}
	return items
}

func userHandle(userID int) string {
	return "@user-" + strconv.Itoa(userID)
}
