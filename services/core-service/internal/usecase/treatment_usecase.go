package usecase

import (
	"context"

	"github.com/plant-disease-detection/core-service/internal/domain"
)

type TreatmentUsecase interface {
	GetTreatment(ctx context.Context, key string) (*domain.Treatment, error)
	ListTreatments(ctx context.Context) ([]domain.Treatment, error)
}

type treatmentUsecase struct {
	repo domain.TreatmentRepository
}

func NewTreatmentUsecase(repo domain.TreatmentRepository) TreatmentUsecase {
	return &treatmentUsecase{repo: repo}
}

func (u *treatmentUsecase) GetTreatment(ctx context.Context, key string) (*domain.Treatment, error) {
	return u.repo.GetByKey(ctx, key)
}

func (u *treatmentUsecase) ListTreatments(ctx context.Context) ([]domain.Treatment, error) {
	return u.repo.ListAll(ctx)
}
