package di

import (
	applicationuser "backend/internal/application/user"
	"backend/internal/infrastructure/db/repositories"

	"gorm.io/gorm"
)

// NewUserUsecase はInfrastructure実装をApplicationユースケースへ注入します。
func NewUserUsecase(db *gorm.DB) *applicationuser.Usecase {
	userRepository := repositories.NewUserRepository(db)
	return applicationuser.NewUsecase(userRepository)
}
