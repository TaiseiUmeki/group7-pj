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

type ProfileTagView struct {
	ID    int    `json:"id"`
	Label string `json:"label"`
}

type ProfileView struct {
	ID                    int              `json:"id"`
	UserID                int              `json:"user_id"`
	Username              string           `json:"username"`
	Bio                   *string          `json:"bio,omitempty"`
	TrainingFrequencyDays int              `json:"training_frequency_days"`
	StreakDays            int              `json:"streak_days"`
	TrainedToday          bool             `json:"trained_today"`
	LastWorkoutDate       *string          `json:"last_workout_date,omitempty"`
	Tags                  []ProfileTagView `json:"tags"`
	Following             *bool            `json:"following,omitempty"`
}

var profileTagLabels = map[int]string{
	1: "やる気",
	2: "大会勢",
	3: "健康維持",
	4: "ダイエット",
	5: "筋肥大",
	6: "パワーリフティング",
	7: "ボディメイク",
	8: "初心者",
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
func (s *Service) GetProfile(userID int) (*ProfileView, error) {
	profile, err := s.repo.GetProfileByUserID(userID)
	if err != nil {
		return nil, err
	}
	return s.buildProfileView(profile)
}

// SaveProfile はプロフィールを作成または更新します。
func (s *Service) SaveProfile(userID int, username string, bio *string, tagIDs []int, trainingFrequencyDays int) (*ProfileView, error) {
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
	normalizedTagIDs, err := normalizeProfileTagIDs(tagIDs)
	if err != nil {
		return nil, err
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
	profile.TrainingFrequencyDays = trainingFrequencyDays

	if profile.ID == 0 {
		if err := s.repo.CreateProfile(profile); err != nil {
			return nil, err
		}
	} else {
		if err := s.repo.UpdateProfile(profile); err != nil {
			return nil, err
		}
	}

	if err := s.repo.ReplaceProfileTags(profile.ID, normalizedTagIDs); err != nil {
		return nil, err
	}
	return s.buildProfileView(profile)
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

func (s *Service) buildProfileView(profile *model.Profile) (*ProfileView, error) {
	tagIDs, err := s.repo.GetProfileTagIDs(profile.ID)
	if err != nil {
		return nil, err
	}
	streakDays, trainedToday, lastWorkoutDate, err := s.RefreshWorkoutStreak(profile.UserID, time.Now())
	if err != nil {
		return nil, err
	}
	var lastWorkoutDateText *string
	if lastWorkoutDate != nil {
		value := lastWorkoutDate.Format("2006-01-02")
		lastWorkoutDateText = &value
	}

	return &ProfileView{
		ID:                    profile.ID,
		UserID:                profile.UserID,
		Username:              profile.Username,
		Bio:                   profile.Bio,
		TrainingFrequencyDays: profile.TrainingFrequencyDays,
		StreakDays:            streakDays,
		TrainedToday:          trainedToday,
		LastWorkoutDate:       lastWorkoutDateText,
		Tags:                  buildProfileTagViews(tagIDs),
	}, nil
}

func normalizeProfileTagIDs(tagIDs []int) ([]int, error) {
	seen := map[int]bool{}
	normalized := make([]int, 0, len(tagIDs))
	for _, tagID := range tagIDs {
		if _, ok := profileTagLabels[tagID]; !ok {
			return nil, fmt.Errorf("invalid tag id")
		}
		if seen[tagID] {
			continue
		}
		seen[tagID] = true
		normalized = append(normalized, tagID)
	}
	return normalized, nil
}

func buildProfileTagViews(tagIDs []int) []ProfileTagView {
	tags := make([]ProfileTagView, 0, len(tagIDs))
	for _, tagID := range tagIDs {
		label, ok := profileTagLabels[tagID]
		if !ok {
			continue
		}
		tags = append(tags, ProfileTagView{ID: tagID, Label: label})
	}
	return tags
}

// ここにビジネスロジックを追加します
