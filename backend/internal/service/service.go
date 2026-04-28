package service

import (
	"backend/internal/model"
	"backend/internal/repository"
)

// Service はビジネスロジックを扱うサービス層です
type Service struct {
	repo repository.Repository
}

// NewService はサービスを初期化します
func NewService(repo repository.Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// GetUser はIDからユーザー情報を取得します
func (s *Service) GetUser(id int) (*model.User, error) {
	return s.repo.GetUserByID(id)
}

// ここにビジネスロジックを追加します
