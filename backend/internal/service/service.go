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
