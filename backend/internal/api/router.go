package api

import (
	"net/http"

	"backend/internal/api/handler"
	"backend/internal/api/middleware"
	"backend/internal/repository"
	"backend/internal/service"

	"gorm.io/gorm"
)

// NewRouter はHTTPルーターを初期化します
func NewRouter(db *gorm.DB) http.Handler {
	// リポジトリ、サービス、ハンドラーを作成
	repo := repository.NewMySQLRepository(db)
	svc := service.NewService(repo)
	h := handler.NewHandler(svc)

	mux := http.NewServeMux()

	// ルート定義
	mux.HandleFunc("/health", h.HealthCheck)
	mux.HandleFunc("/api/users", h.GetAllUsers)
	mux.HandleFunc("/api/users/get", h.GetUser)

	// ミドルウェアを適用
	return middleware.CORSMiddleware(middleware.LoggingMiddleware(mux))
}
