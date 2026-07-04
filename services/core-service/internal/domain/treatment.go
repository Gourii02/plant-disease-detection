package domain

import (
	"context"
	"time"
)

type Treatment struct {
	DiseaseKey         string    `json:"disease_key" gorm:"primary_key;type:varchar(100)"`
	DisplayName        string    `json:"display_name" gorm:"type:varchar(255);not null"`
	Description        string    `json:"description" gorm:"type:text;not null"`
	PreventiveMeasures []string  `json:"preventive_measures" gorm:"serializer:json"`
	OrganicTreatments  []string  `json:"organic_treatments" gorm:"serializer:json"`
	ChemicalTreatments []string  `json:"chemical_treatments" gorm:"serializer:json"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type TreatmentRepository interface {
	Save(ctx context.Context, treatment *Treatment) error
	GetByKey(ctx context.Context, key string) (*Treatment, error)
	ListAll(ctx context.Context) ([]Treatment, error)
}
