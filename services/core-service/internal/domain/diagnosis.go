package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type DiagnosisStatus string

const (
	StatusPending   DiagnosisStatus = "pending"
	StatusCompleted DiagnosisStatus = "completed"
	StatusFailed    DiagnosisStatus = "failed"
)

type Diagnosis struct {
	ID             uuid.UUID       `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID         uuid.UUID       `json:"user_id" gorm:"type:uuid;index;not null"`
	SpeciesLabel   string          `json:"species_label" gorm:"type:varchar(100)"`
	DiseaseLabel   string          `json:"disease_label" gorm:"type:varchar(100)"`
	Confidence     float64         `json:"confidence" gorm:"type:float8"`
	ImageURL       string          `json:"image_url" gorm:"type:varchar(512);not null"`
	ExplanationURL string          `json:"explanation_url" gorm:"type:varchar(512)"`
	Latitude       *float64        `json:"latitude" gorm:"type:float8"`
	Longitude      *float64        `json:"longitude" gorm:"type:float8"`
	Status         DiagnosisStatus `json:"status" gorm:"type:varchar(20);default:'pending'"`
	CreatedAt      time.Time       `json:"created_at" gorm:"index"`
}

type DiagnosisRepository interface {
	Create(ctx context.Context, diag *Diagnosis) error
	Update(ctx context.Context, diag *Diagnosis) error
	GetByID(ctx context.Context, id uuid.UUID) (*Diagnosis, error)
	GetByUserID(ctx context.Context, userID uuid.UUID, limit int, offset int) ([]Diagnosis, error)
}
