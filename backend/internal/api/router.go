package api

import (
	"log"
	"net/http"

	"backend/internal/api/handler"
	"backend/internal/api/middleware"
	"backend/internal/repository"
	"backend/internal/service"

	"gorm.io/gorm"
)

// NewRouter はHTTPルーターを初期化します
func NewRouter(db *gorm.DB, jwtSecret string) http.Handler {
	// リポジトリ、サービス、ハンドラーを作成
	repo := repository.NewMySQLRepository(db)
	svc := service.NewService(repo, jwtSecret)
	h := handler.NewHandler(svc)

	mux := http.NewServeMux()

	// ルート定義
	mux.HandleFunc("/health", h.HealthCheck)

	// Register auth login with and without trailing slash to avoid
	// accidental 404s caused by subtle path differences.
	mux.HandleFunc("/api/auth/login", h.Login)
	mux.HandleFunc("/api/auth/login/", h.Login)

	mux.HandleFunc("/api/auth/me", h.Me)
	mux.HandleFunc("/api/users", h.GetAllUsers)
	mux.HandleFunc("/api/users/get", h.GetUser)

	// Log registered routes for easier debugging
	log.Println("Registered routes: /health, /api/auth/login, /api/auth/me, /api/users, /api/users/get")

	// ミドルウェアを適用
	return middleware.CORSMiddleware(middleware.LoggingMiddleware(mux))
}
