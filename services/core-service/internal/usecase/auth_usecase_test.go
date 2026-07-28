package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/plant-disease-detection/core-service/internal/auth"
	"github.com/plant-disease-detection/core-service/internal/config"
	"github.com/plant-disease-detection/core-service/internal/domain"
	"github.com/plant-disease-detection/core-service/internal/usecase"
)

// ─── Mocks ───────────────────────────────────────────────────────────────────

type mockUserRepo struct {
	users map[string]*domain.User
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{users: make(map[string]*domain.User)}
}

func (m *mockUserRepo) Create(ctx context.Context, u *domain.User) error {
	u.ID = uint(len(m.users) + 1)
	u.CreatedAt = time.Now()
	m.users[u.Email] = u
	return nil
}

func (m *mockUserRepo) Update(ctx context.Context, u *domain.User) error {
	m.users[u.Email] = u
	return nil
}

func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	if u, ok := m.users[email]; ok {
		return u, nil
	}
	return nil, nil
}

func (m *mockUserRepo) GetByID(ctx context.Context, id uint) (*domain.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, nil
}

func newTestJWTService() auth.JWTService {
	cfg := &config.Config{JWTSecret: "test-secret-key", JWTExpiry: 60}
	return auth.NewJWTService(cfg)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

func TestRegister_Success(t *testing.T) {
	repo := newMockUserRepo()
	svc := usecase.NewAuthUsecase(repo, newTestJWTService())

	resp, err := svc.Register(context.Background(), usecase.RegisterRequest{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "password123",
	})

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if resp == nil {
		t.Fatal("expected response, got nil")
	}
	if resp.Token == "" {
		t.Error("expected a JWT token in response, got empty string")
	}
	if resp.User.Email != "test@example.com" {
		t.Errorf("expected email test@example.com, got %s", resp.User.Email)
	}
	if resp.User.Name != "Test User" {
		t.Errorf("expected name Test User, got %s", resp.User.Name)
	}
}

func TestRegister_DuplicateEmail(t *testing.T) {
	repo := newMockUserRepo()
	svc := usecase.NewAuthUsecase(repo, newTestJWTService())

	req := usecase.RegisterRequest{Email: "dup@example.com", Password: "password123"}
	_, _ = svc.Register(context.Background(), req)

	_, err := svc.Register(context.Background(), req)
	if err == nil {
		t.Fatal("expected duplicate email error, got nil")
	}
}

func TestLogin_Success(t *testing.T) {
	repo := newMockUserRepo()
	svc := usecase.NewAuthUsecase(repo, newTestJWTService())

	_, _ = svc.Register(context.Background(), usecase.RegisterRequest{
		Email:    "login@example.com",
		Password: "securepass",
	})

	resp, err := svc.Login(context.Background(), usecase.LoginRequest{
		Email:    "login@example.com",
		Password: "securepass",
	})

	if err != nil {
		t.Fatalf("expected no error on login, got: %v", err)
	}
	if resp.Token == "" {
		t.Error("expected JWT token on successful login")
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	repo := newMockUserRepo()
	svc := usecase.NewAuthUsecase(repo, newTestJWTService())

	_, _ = svc.Register(context.Background(), usecase.RegisterRequest{
		Email:    "user@example.com",
		Password: "correctpassword",
	})

	_, err := svc.Login(context.Background(), usecase.LoginRequest{
		Email:    "user@example.com",
		Password: "wrongpassword",
	})

	if err == nil {
		t.Fatal("expected error for wrong password, got nil")
	}
}

func TestUpdateMe_Success(t *testing.T) {
	repo := newMockUserRepo()
	svc := usecase.NewAuthUsecase(repo, newTestJWTService())

	resp, _ := svc.Register(context.Background(), usecase.RegisterRequest{
		Name:     "Old Name",
		Email:    "update@example.com",
		Password: "pass123",
	})

	updated, err := svc.UpdateMe(context.Background(), resp.User.ID, usecase.UpdateProfileRequest{
		Name: "New Name",
	})

	if err != nil {
		t.Fatalf("expected no error on UpdateMe, got: %v", err)
	}
	if updated.Name != "New Name" {
		t.Errorf("expected name New Name, got %s", updated.Name)
	}
}
