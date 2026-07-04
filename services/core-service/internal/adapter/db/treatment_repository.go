package db

import (
	"context"
	"errors"

	"github.com/plant-disease-detection/core-service/internal/domain"
	"gorm.io/gorm"
)

type treatmentRepo struct {
	db *gorm.DB
}

func NewTreatmentRepository(db *gorm.DB) domain.TreatmentRepository {
	return &treatmentRepo{db: db}
}

func (r *treatmentRepo) Save(ctx context.Context, t *domain.Treatment) error {
	return r.db.WithContext(ctx).Save(t).Error
}

func (r *treatmentRepo) GetByKey(ctx context.Context, key string) (*domain.Treatment, error) {
	var t domain.Treatment
	err := r.db.WithContext(ctx).First(&t, "disease_key = ?", key).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *treatmentRepo) ListAll(ctx context.Context) ([]domain.Treatment, error) {
	var list []domain.Treatment
	err := r.db.WithContext(ctx).Find(&list).Error
	if err != nil {
		return nil, err
	}
	return list, nil
}
