package main

import (
	"fmt"
	"log"
	"net/http"

	"backend/internal/api"
	"backend/internal/config"
	"backend/internal/model"

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
	if err := db.AutoMigrate(&model.User{}); err != nil {
		log.Fatalf("Failed to run migration: %v", err)
	}
	fmt.Println("Database migration completed")

	// ハンドラーとミドルウェアを設定
	router := api.NewRouter(db)

	addr := fmt.Sprintf(":%s", cfg.Port)
	fmt.Printf("backend started on %s\n", addr)

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
