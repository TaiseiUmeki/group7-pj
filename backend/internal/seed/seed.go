package seed

import (
	"errors"

	"backend/internal/model"

	"gorm.io/gorm"
)

var users = []model.User{
	{Name: "Alice Tanaka", Email: "alice@example.com"},
	{Name: "Bob Suzuki", Email: "bob@example.com"},
	{Name: "Carol Sato", Email: "carol@example.com"},
}

// Run inserts development seed data without duplicating rows on restart.
func Run(db *gorm.DB) error {
	for _, seedUser := range users {
		var existing model.User
		err := db.Where("email = ?", seedUser.Email).First(&existing).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := db.Create(&seedUser).Error; err != nil {
			return err
		}
	}

	return nil
}
