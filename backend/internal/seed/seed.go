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
	TagIDs   []int
}

var users = []userSeed{
	{Username: "Alice Tanaka", Email: "alice@example.com", TagIDs: []int{1, 5, 8}},
	{Username: "Bob Suzuki", Email: "bob@example.com", TagIDs: []int{2, 6}},
	{Username: "Carol Sato", Email: "carol@example.com", TagIDs: []int{3, 7}},
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
			if err := ensureDefaultProfile(db, existing.ID, seedUser.Username, seedUser.TagIDs); err != nil {
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
		if err := ensureDefaultProfile(db, user.ID, seedUser.Username, seedUser.TagIDs); err != nil {
			return err
		}
	}

	return nil
}

func ensureDefaultProfile(db *gorm.DB, userID int, username string, tagIDs []int) error {
	var existing model.Profile
	err := db.Where("user_id = ?", userID).First(&existing).Error
	if err == nil {
		return ensureDefaultProfileTags(db, existing.ID, tagIDs)
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
	if err := db.Create(&profile).Error; err != nil {
		return err
	}
	return ensureDefaultProfileTags(db, profile.ID, tagIDs)
}

func ensureDefaultProfileTags(db *gorm.DB, profileID int, tagIDs []int) error {
	for _, tagID := range tagIDs {
		var existing model.ProfileTag
		err := db.Where("profile_id = ? AND tag_id = ?", profileID, tagID).First(&existing).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := db.Create(&model.ProfileTag{ProfileID: profileID, TagID: tagID}).Error; err != nil {
			return err
		}
	}
	return nil
}
