package seed

import (
	"errors"

	"backend/internal/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const devPassword = "password123"

type userSeed struct {
	Username string
	Email    string
}

var users = []userSeed{
	{Username: "Alice Tanaka", Email: "alice@example.com"},
	{Username: "Bob Suzuki", Email: "bob@example.com"},
	{Username: "Carol Sato", Email: "carol@example.com"},
}

// Run inserts development seed data without duplicating rows on restart.
func Run(db *gorm.DB) error {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(devPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	for _, seedUser := range users {
		var existing model.User
		err := db.Where("email = ?", seedUser.Email).First(&existing).Error
		if err == nil {
			if err := ensureDefaultProfile(db, existing.ID, seedUser.Username); err != nil {
				return err
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		user := model.User{
			Email:        seedUser.Email,
			PasswordHash: string(passwordHash),
		}
		if err := db.Create(&user).Error; err != nil {
			return err
		}
		if err := ensureDefaultProfile(db, user.ID, seedUser.Username); err != nil {
			return err
		}
	}

	return nil
}

func ensureDefaultProfile(db *gorm.DB, userID int, username string) error {
	var existing model.Profile
	err := db.Where("user_id = ?", userID).First(&existing).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	if username == "" {
		username = "user"
	}

	profile := model.Profile{
		UserID:                userID,
		Username:              username,
		TrainingFrequencyDays: 3,
	}
	return db.Create(&profile).Error
}
