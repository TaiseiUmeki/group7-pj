package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Service はビジネスロジックを扱うサービス層です
type Service struct {
	repo      repository.Repository
	jwtSecret string
}

// NewService はサービスを初期化します
func NewService(repo repository.Repository, jwtSecret string) *Service {
	return &Service{
		repo:      repo,
		jwtSecret: jwtSecret,
	}
}

// GetUser はIDからユーザー情報を取得します
func (s *Service) GetUser(id int) (*model.User, error) {
	return s.repo.GetUserByID(id)
}

// GetAllUsers はすべてのユーザー情報を取得します
func (s *Service) GetAllUsers() ([]*model.User, error) {
	return s.repo.GetAllUsers()
}

// Login はメールアドレスとパスワードからJWTを発行します。
func (s *Service) Login(email, password string) (*model.User, string, error) {
	normalizedEmail := strings.TrimSpace(strings.ToLower(email))
	if normalizedEmail == "" || password == "" {
		return nil, "", fmt.Errorf("email and password are required")
	}

	user, err := s.repo.GetUserByEmail(normalizedEmail)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, "", fmt.Errorf("invalid email or password")
		}
		return nil, "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, "", fmt.Errorf("invalid email or password")
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}

// Register は認証用ユーザーを作成します（サインアップ）。
func (s *Service) Register(email, password string) (*model.User, error) {
	normalizedEmail := strings.TrimSpace(strings.ToLower(email))
	if normalizedEmail == "" || password == "" {
		return nil, fmt.Errorf("email and password are required")
	}

	// 既に存在するか確認
	if _, err := s.repo.GetUserByEmail(normalizedEmail); err == nil {
		return nil, fmt.Errorf("email already in use")
	} else if err != nil && !errors.Is(err, repository.ErrUserNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Email:        normalizedEmail,
		PasswordHash: string(hash),
	}

	if err := s.repo.CreateUser(user); err != nil {
		return nil, err
	}

	return user, nil
}

// GetProfile はユーザーのプロフィールを取得します。
func (s *Service) GetProfile(userID int) (*model.Profile, error) {
	return s.repo.GetProfileByUserID(userID)
}

// SaveProfile はプロフィールを作成または更新します。
func (s *Service) SaveProfile(userID int, username string, bio *string, focusType *int, trainingFrequencyDays int) (*model.Profile, error) {
	normalizedUsername := strings.TrimSpace(username)
	if normalizedUsername == "" {
		return nil, fmt.Errorf("username is required")
	}
	if trainingFrequencyDays < 1 {
		return nil, fmt.Errorf("training frequency days must be at least 1")
	}

	var normalizedBio *string
	if bio != nil {
		trimmedBio := strings.TrimSpace(*bio)
		if trimmedBio != "" {
			normalizedBio = &trimmedBio
		}
	}

	profile, err := s.repo.GetProfileByUserID(userID)
	if err != nil {
		if !errors.Is(err, repository.ErrProfileNotFound) {
			return nil, err
		}
		profile = &model.Profile{
			UserID: userID,
		}
	}

	profile.Username = normalizedUsername
	profile.Bio = normalizedBio
	profile.FocusType = focusType
	profile.TrainingFrequencyDays = trainingFrequencyDays

	if profile.ID == 0 {
		if err := s.repo.CreateProfile(profile); err != nil {
			return nil, err
		}
		return profile, nil
	}

	if err := s.repo.UpdateProfile(profile); err != nil {
		return nil, err
	}
	return profile, nil
}

// GetCurrentUser はJWTから現在のユーザーを取得します。
func (s *Service) GetCurrentUser(tokenString string) (*model.User, error) {
	claims := &authClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		return []byte(s.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return s.repo.GetUserByID(claims.UserID)
}

func (s *Service) generateToken(user *model.User) (string, error) {
	claims := authClaims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", user.ID),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

type authClaims struct {
	UserID int    `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// ここにビジネスロジックを追加します
