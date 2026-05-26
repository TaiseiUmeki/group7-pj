package api

import (
	"log"
	"net/http"

	"backend/internal/api/handler"
	"backend/internal/api/middleware"
	"backend/internal/repository"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// NewRouter initializes the Gin router and returns it as an http.Handler
func NewRouter(db *gorm.DB, jwtSecret string) http.Handler {
	repo := repository.NewMySQLRepository(db)
	svc := service.NewService(repo, jwtSecret)
	h := handler.NewHandler(svc)

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()

	// Apply middleware
	r.Use(middleware.LoggingMiddleware())
	r.Use(middleware.CORSMiddleware())

	// Routes
	r.GET("/health", h.HealthCheck)

	r.POST("/api/auth/login", h.Login)
	r.POST("/api/auth/signup", h.Signup)
	r.GET("/api/auth/me", h.Me)

	r.GET("/api/users", h.GetAllUsers)
	r.GET("/api/users/get", h.GetUser)

	r.GET("/api/workout-records", h.ListWorkoutRecords)
	r.POST("/api/workout-records", h.CreateWorkoutRecord)
	r.GET("/api/workout-records/:id", h.GetWorkoutRecord)
	r.PUT("/api/workout-records/:id", h.UpdateWorkoutRecord)
	r.GET("/api/workout-records/latest", h.GetLatestWorkoutRecord)

	log.Println("Registered routes: /health, /api/auth/login, /api/auth/me, /api/users, /api/workout-records")

	return r
}
