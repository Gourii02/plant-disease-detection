package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/plant-disease-detection/core-service/internal/domain"
)

type CreateDiagnosisRequest struct {
	ImageURL  string   `json:"image_url" binding:"required"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
}

type DiagnosisUsecase interface {
	GetDiagnosis(ctx context.Context, id uuid.UUID) (*domain.Diagnosis, error)
	GetHistory(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.Diagnosis, error)
	InitiateDiagnosis(ctx context.Context, userID uuid.UUID, req CreateDiagnosisRequest) (*domain.Diagnosis, error)
}

type diagnosisUsecase struct {
	repo domain.DiagnosisRepository
}

func NewDiagnosisUsecase(repo domain.DiagnosisRepository) DiagnosisUsecase {
	return &diagnosisUsecase{repo: repo}
}

func (u *diagnosisUsecase) GetDiagnosis(ctx context.Context, id uuid.UUID) (*domain.Diagnosis, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *diagnosisUsecase) GetHistory(ctx context.Context, userID uuid.UUID, limit, offset int) ([]domain.Diagnosis, error) {
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.GetByUserID(ctx, userID, limit, offset)
}

func (u *diagnosisUsecase) InitiateDiagnosis(ctx context.Context, userID uuid.UUID, req CreateDiagnosisRequest) (*domain.Diagnosis, error) {
	diag := &domain.Diagnosis{
		ID:        uuid.New(),
		UserID:    userID,
		ImageURL:  req.ImageURL,
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
		Status:    domain.StatusPending,
		CreatedAt: time.Now(),
	}

	if err := u.repo.Create(ctx, diag); err != nil {
		return nil, err
	}

	// In Phase 3, this will publish a background task message to Celery/RabbitMQ.
	// For Phase 1 baseline, we return the initialized record.

	return diag, nil
}
