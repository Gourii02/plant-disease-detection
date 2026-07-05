package domain

import (
	"context"
	"time"
)

type User struct {
	ID           uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	Email        string    `json:"email" gorm:"uniqueIndex;not null;type:varchar(255)"`
	PasswordHash string    `json:"-" gorm:"not null;type:varchar(255)"`
	CreatedAt    time.Time `json:"created_at"`
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByID(ctx context.Context, id uint) (*User, error)
}
