package models

import domainuser "backend/internal/domain/user"

// UserModel は users テーブルのGORMモデルです。
type UserModel struct {
	ID    int    `gorm:"primaryKey;autoIncrement"`
	Name  string `gorm:"size:255;not null"`
	Email string `gorm:"size:255;not null;unique"`
}

// TableName は対応するDBテーブル名を返します。
func (UserModel) TableName() string {
	return "users"
}

// ToEntity はDBモデルをドメインエンティティに変換します。
func (m UserModel) ToEntity() *domainuser.User {
	return &domainuser.User{
		ID:    m.ID,
		Name:  m.Name,
		Email: m.Email,
	}
}

// UserModelFromEntity はドメインエンティティをDBモデルに変換します。
func UserModelFromEntity(entity *domainuser.User) *UserModel {
	return &UserModel{
		ID:    entity.ID,
		Name:  entity.Name,
		Email: entity.Email,
	}
}
