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

	api := r.Group("/api")
	api.POST("/auth/login", h.Login)
	api.POST("/auth/signup", h.Signup)

	auth := r.Group("/api")
	auth.Use(middleware.AuthMiddleware(jwtSecret))
	auth.GET("/auth/me", h.Me)
	auth.GET("/me/profile", h.GetMyProfile)
	auth.POST("/me/profile", h.SaveMyProfile)
	auth.PUT("/me/profile", h.SaveMyProfile)

	auth.GET("/users", h.GetAllUsers)
	auth.GET("/users/get", h.GetUser)

	auth.GET("/workout-records", h.ListWorkoutRecords)
	auth.POST("/workout-records", h.CreateWorkoutRecord)
	auth.GET("/workout-records/latest", h.GetLatestWorkoutRecord)
	auth.GET("/workout-records/:id", h.GetWorkoutRecord)
	auth.PUT("/workout-records/:id", h.UpdateWorkoutRecord)

	auth.POST("/posts", h.CreateTrainingPost)

	log.Println("Registered routes: /health, /api/auth/login, /api/auth/me, /api/me/profile, /api/users, /api/workout-records, /api/posts")

	return r
}
