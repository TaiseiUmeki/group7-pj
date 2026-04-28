package tests

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/internal/api"
)

// TestHealthCheck はヘルスチェックエンドポイントをテストします
func TestHealthCheck(t *testing.T) {
	router := api.NewRouter()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

// ここに他のテストを追加します
