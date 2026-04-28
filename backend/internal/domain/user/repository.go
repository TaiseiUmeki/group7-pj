package user

// Repository はユーザー永続化のドメインインターフェースです。
type Repository interface {
	GetUserByID(id int) (*User, error)
	GetAllUsers() ([]*User, error)
	CreateUser(user *User) error
	UpdateUser(user *User) error
	DeleteUser(id int) error
}
