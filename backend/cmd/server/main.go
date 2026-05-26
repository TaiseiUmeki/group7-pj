package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"backend/internal/api"
	"backend/internal/config"
	"backend/internal/model"
	"backend/internal/seed"
	"backend/internal/repository"

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
	if err := db.AutoMigrate(&model.User{}, &model.WorkoutRecord{}); err != nil {
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

const (
	seedUserName     = "Demo User"
	seedUserEmail    = "seed@example.com"
	seedUserPassword = "password123"
)

func seedLoginUser(db *gorm.DB) error {
	repo := repository.NewMySQLRepository(db)
	_, err := repo.GetUserByEmail(seedUserEmail)
	if err == nil {
		return nil
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

	fmt.Printf("Seeded login user %s at %s\n", seedUserEmail, time.Now().Format(time.RFC3339))
	return nil
}
