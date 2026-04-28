package presentationhttp

import (
	stdhttp "net/http"

	"backend/internal/di"
	"backend/internal/presentation/http/handler"
	"backend/internal/presentation/http/middleware"

	"gorm.io/gorm"
)

// NewRouter はHTTPルーターを初期化します。
func NewRouter(dbs ...*gorm.DB) stdhttp.Handler {
	var db *gorm.DB
	if len(dbs) > 0 {
		db = dbs[0]
	}

	userUsecase := di.NewUserUsecase(db)
	h := handler.NewHandler(userUsecase)

	mux := stdhttp.NewServeMux()

	mux.HandleFunc("/health", h.HealthCheck)
	mux.HandleFunc("/api/users", h.GetAllUsers)
	mux.HandleFunc("/api/users/get", h.GetUser)

	return middleware.CORSMiddleware(middleware.LoggingMiddleware(mux))
}
