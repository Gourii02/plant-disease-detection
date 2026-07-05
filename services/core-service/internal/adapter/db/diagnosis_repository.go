package db

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/plant-disease-detection/core-service/internal/domain"
	"gorm.io/gorm"
)

type diagnosisRepo struct {
	db *gorm.DB
}

func NewDiagnosisRepository(db *gorm.DB) domain.DiagnosisRepository {
	return &diagnosisRepo{db: db}
}

func (r *diagnosisRepo) Create(ctx context.Context, diag *domain.Diagnosis) error {
	return r.db.WithContext(ctx).Create(diag).Error
}

func (r *diagnosisRepo) Update(ctx context.Context, diag *domain.Diagnosis) error {
	return r.db.WithContext(ctx).Save(diag).Error
}

func (r *diagnosisRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Diagnosis, error) {
	var diag domain.Diagnosis
	err := r.db.WithContext(ctx).First(&diag, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &diag, nil
}

func (r *diagnosisRepo) GetByUserID(ctx context.Context, userID uint, limit int, offset int) ([]domain.Diagnosis, error) {
	var diags []domain.Diagnosis
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&diags).Error
	if err != nil {
		return nil, err
	}
	return diags, nil
}
