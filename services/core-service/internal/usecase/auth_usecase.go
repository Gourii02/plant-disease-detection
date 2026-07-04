package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/plant-disease-detection/core-service/internal/auth"
	"github.com/plant-disease-detection/core-service/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  domain.User `json:"user"`
}

type AuthUsecase interface {
	Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error)
	Login(ctx context.Context, req LoginRequest) (*AuthResponse, error)
}

type authUsecase struct {
	userRepo   domain.UserRepository
	jwtService auth.JWTService
}

func NewAuthUsecase(userRepo domain.UserRepository, jwtService auth.JWTService) AuthUsecase {
	return &authUsecase{
		userRepo:   userRepo,
		jwtService: jwtService,
	}
}

func (u *authUsecase) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	// Check duplicate user email
	existing, err := u.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("user email is already registered")
	}

	// Hash password
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	newUser := &domain.User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: string(hashed),
		CreatedAt:    time.Now(),
	}

	if err := u.userRepo.Create(ctx, newUser); err != nil {
		return nil, err
	}

	token, err := u.jwtService.GenerateToken(newUser.ID)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User:  *newUser,
	}, nil
}

func (u *authUsecase) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	user, err := u.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid email credentials")
	}

	// Verify hashed password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid password credentials")
	}

	token, err := u.jwtService.GenerateToken(user.ID)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}
