package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"backend/internal/api"
	"backend/internal/config"
	"backend/internal/model"
	"backend/internal/repository"
	"backend/internal/seed"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// 設定を読み込む
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// データベース接続
	db, err := gorm.Open(mysql.Open(cfg.DBURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// マイグレーション実行
	if err := runSQLMigrations(db); err != nil {
		log.Fatalf("Failed to run migration: %v", err)
	}
	fmt.Println("Database migration completed")

	if cfg.Env != "production" {
		if err := seed.Run(db); err != nil {
			log.Fatalf("Failed to seed database: %v", err)
		}
		fmt.Println("Database seed completed")

		if err := seedLoginUser(db); err != nil {
			log.Fatalf("Failed to seed login user: %v", err)
		}
	}

	// ハンドラーとミドルウェアを設定
	router := api.NewRouter(db, cfg.JWTSecret)

	addr := fmt.Sprintf(":%s", cfg.Port)
	fmt.Printf("backend started on %s\n", addr)

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func runSQLMigrations(db *gorm.DB) error {
	migrationsDir, err := resolveMigrationsDir()
	if err != nil {
		return err
	}

	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.sql"))
	if err != nil {
		return err
	}
	if len(files) == 0 {
		return fmt.Errorf("no migration files found in %s", migrationsDir)
	}

	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			return err
		}
		statements := strings.Split(string(content), ";")
		for _, statement := range statements {
			statement = strings.TrimSpace(statement)
			if statement == "" {
				continue
			}
			if err := db.Exec(statement).Error; err != nil {
				return fmt.Errorf("%s: %w", file, err)
			}
		}
	}

	return nil
}

func resolveMigrationsDir() (string, error) {
	candidates := []string{
		"migrations",
		filepath.Join("backend", "migrations"),
	}
	for _, candidate := range candidates {
		info, err := os.Stat(candidate)
		if err == nil && info.IsDir() {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("migrations directory not found")
}

const (
	seedUserName     = "Demo User"
	seedUserEmail    = "seed@example.com"
	seedUserPassword = "password123"
)

func seedLoginUser(db *gorm.DB) error {
	repo := repository.NewMySQLRepository(db)
	_, err := repo.GetUserByEmail(seedUserEmail)
	if err == nil {
		var existing model.User
		if err := db.Where("email = ?", seedUserEmail).First(&existing).Error; err != nil {
			return err
		}
		return ensureSeedProfile(db, existing.ID, seedUserName)
	}
	if err != nil && err != repository.ErrUserNotFound {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(seedUserPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := &model.User{
		Name:         seedUserName,
		Email:        seedUserEmail,
		PasswordHash: string(hash),
	}

	if err := repo.CreateUser(user); err != nil {
		return err
	}

	if err := ensureSeedProfile(db, user.ID, seedUserName); err != nil {
		return err
	}

	fmt.Printf("Seeded login user %s at %s\n", seedUserEmail, time.Now().Format(time.RFC3339))
	return nil
}

func ensureSeedProfile(db *gorm.DB, userID int, username string) error {
	var existing model.Profile
	err := db.Where("user_id = ?", userID).First(&existing).Error
	if err == nil {
		return nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	profile := &model.Profile{
		UserID:                userID,
		Username:              username,
		TrainingFrequencyDays: 3,
	}
	return db.Create(profile).Error
}
