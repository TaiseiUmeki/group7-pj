package api

import (
	"net/http"

	"backend/internal/api/handler"
	"backend/internal/api/middleware"
	"backend/internal/service"
)

// NewRouter はHTTPルーターを初期化します
func NewRouter() http.Handler {
	// 仮のサービスとハンドラーを作成（実装に合わせて修正してください）
	svc := service.NewService(nil)
	h := handler.NewHandler(svc)

	mux := http.NewServeMux()

	// ルート定義
	mux.HandleFunc("/health", h.HealthCheck)

	// ここにその他のルートを追加します

	// ミドルウェアを適用
	return middleware.LoggingMiddleware(mux)
}
