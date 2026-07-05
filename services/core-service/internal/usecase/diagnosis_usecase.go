package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/plant-disease-detection/core-service/internal/domain"
)

type CreateDiagnosisRequest struct {
	ImageURL  string   `json:"image_url" binding:"required"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
}

// AIInferenceResult mirrors the JSON shape returned by the Python /infer endpoint.
type AIInferenceResult struct {
	Status  string              `json:"status"`
	Model   string              `json:"model"`
	TopPred AIPrediction        `json:"top_prediction"`
	All     []AIPrediction      `json:"all_predictions"`
}

type AIPrediction struct {
	Rank           int     `json:"rank"`
	RawLabel       string  `json:"raw_label"`
	Plant          string  `json:"plant"`
	Disease        string  `json:"disease"`
	IsHealthy      bool    `json:"is_healthy"`
	Confidence     float64 `json:"confidence"`
	ConfidenceRaw  float64 `json:"confidence_raw"`
}

// UploadDiagnosisRequest is used when the image is uploaded directly (not by URL).
type UploadDiagnosisRequest struct {
	Filename string
	AIResult AIInferenceResult
}

type DiagnosisUsecase interface {
	GetDiagnosis(ctx context.Context, id uuid.UUID) (*domain.Diagnosis, error)
	GetHistory(ctx context.Context, userID uint, limit, offset int) ([]domain.Diagnosis, error)
	InitiateDiagnosis(ctx context.Context, userID uint, req CreateDiagnosisRequest) (*domain.Diagnosis, error)
	DiagnoseFromUpload(ctx context.Context, userID uint, req UploadDiagnosisRequest) (*domain.Diagnosis, error)
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

func (u *diagnosisUsecase) GetHistory(ctx context.Context, userID uint, limit, offset int) ([]domain.Diagnosis, error) {
	if limit <= 0 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}
	return u.repo.GetByUserID(ctx, userID, limit, offset)
}

func (u *diagnosisUsecase) InitiateDiagnosis(ctx context.Context, userID uint, req CreateDiagnosisRequest) (*domain.Diagnosis, error) {
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

// DiagnoseFromUpload creates and persists a completed Diagnosis record
// from a direct image upload + an AI inference result.
func (u *diagnosisUsecase) DiagnoseFromUpload(ctx context.Context, userID uint, req UploadDiagnosisRequest) (*domain.Diagnosis, error) {
	top := req.AIResult.TopPred

	diag := &domain.Diagnosis{
		ID:           uuid.New(),
		UserID:       userID,
		SpeciesLabel: top.Plant,
		DiseaseLabel: top.Disease,
		Confidence:   top.ConfidenceRaw,
		ImageURL:     fmt.Sprintf("upload://%s", req.Filename),
		Status:       domain.StatusCompleted,
		CreatedAt:    time.Now(),
	}

	if err := u.repo.Create(ctx, diag); err != nil {
		return nil, err
	}

	return diag, nil
}
