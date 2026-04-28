package user

import domainuser "backend/internal/domain/user"

// Usecase はユーザーに関するアプリケーションユースケースです。
type Usecase struct {
	repo domainuser.Repository
}

// NewUsecase はユーザーユースケースを初期化します。
func NewUsecase(repo domainuser.Repository) *Usecase {
	return &Usecase{
		repo: repo,
	}
}

// GetUser はIDからユーザー情報を取得します。
func (u *Usecase) GetUser(id int) (*UserDTO, error) {
	user, err := u.repo.GetUserByID(id)
	if err != nil {
		return nil, err
	}
	return newUserDTO(user), nil
}

// GetAllUsers はすべてのユーザー情報を取得します。
func (u *Usecase) GetAllUsers() ([]*UserDTO, error) {
	users, err := u.repo.GetAllUsers()
	if err != nil {
		return nil, err
	}
	return newUserDTOs(users), nil
}
