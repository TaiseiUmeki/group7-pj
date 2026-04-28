package user

import domainuser "backend/internal/domain/user"

// UserDTO はApplication層からPresentation層へ返すユーザーDTOです。
type UserDTO struct {
	ID    int
	Name  string
	Email string
}

func newUserDTO(user *domainuser.User) *UserDTO {
	return &UserDTO{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
	}
}

func newUserDTOs(users []*domainuser.User) []*UserDTO {
	dtos := make([]*UserDTO, 0, len(users))
	for _, user := range users {
		dtos = append(dtos, newUserDTO(user))
	}
	return dtos
}
