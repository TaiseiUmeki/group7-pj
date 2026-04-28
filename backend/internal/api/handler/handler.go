package handler

import (
	"encoding/json"
	"net/http"

	"backend/internal/service"
)

// Handler はHTTPハンドラーを扱う構造体です
type Handler struct {
	service *service.Service
}

// NewHandler はハンドラーを初期化します
func NewHandler(svc *service.Service) *Handler {
	return &Handler{
		service: svc,
	}
}

// HealthCheck はサーバーのヘルスチェックを行います
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// ここにハンドラーメソッドを追加します
