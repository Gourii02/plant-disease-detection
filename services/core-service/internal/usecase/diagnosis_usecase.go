package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/plant-disease-detection/core-service/internal/domain"
	"github.com/plant-disease-detection/core-service/internal/messaging"
)

type CreateDiagnosisRequest struct {
	ImageURL  string   `json:"image_url" binding:"required"`
	Latitude  *float64 `json:"latitude"`
	Longitude *float64 `json:"longitude"`
}

type VLMResult struct {
	VLMEnabled       bool    `json:"vlm_enabled"`
	VLMVerified      bool    `json:"vlm_verified"`
	OpenSetDiagnosis *string `json:"open_set_diagnosis"`
	PathogenType     *string `json:"pathogen_type"`
	VLMNotes         *string `json:"vlm_notes"`
}

// AIInferenceResult mirrors the JSON shape returned by the Python /infer endpoint.
type AIInferenceResult struct {
	Status    string         `json:"status"`
	Model     string         `json:"model"`
	TopPred   AIPrediction   `json:"top_prediction"`
	All       []AIPrediction `json:"all_predictions"`
	VLMResult *VLMResult     `json:"vlm_result"`
}

type AIPrediction struct {
	Rank          int     `json:"rank"`
	RawLabel      string  `json:"raw_label"`
	Plant         string  `json:"plant"`
	Disease       string  `json:"disease"`
	IsHealthy     bool    `json:"is_healthy"`
	Confidence    float64 `json:"confidence"`
	ConfidenceRaw float64 `json:"confidence_raw"`
}

// UploadDiagnosisRequest is used when the image is uploaded directly (not by URL).
type UploadDiagnosisRequest struct {
	Filename string
	AIResult AIInferenceResult
}

// CompleteRequest is the payload from the Python Celery worker callback.
type CompleteRequest struct {
	DiagnosisID    uuid.UUID `json:"diagnosis_id"`
	UserID         uint      `json:"user_id"`
	SpeciesLabel   string    `json:"species"`
	DiseaseLabel   string    `json:"disease"`
	Confidence     float64   `json:"confidence"`
	ExplanationURL string    `json:"explanation_url"`
}

type DiagnosisUsecase interface {
	GetDiagnosis(ctx context.Context, id uuid.UUID) (*domain.Diagnosis, error)
	GetHistory(ctx context.Context, userID uint, limit, offset int) ([]domain.Diagnosis, error)
	InitiateDiagnosis(ctx context.Context, userID uint, req CreateDiagnosisRequest) (*domain.Diagnosis, error)
	DiagnoseFromUpload(ctx context.Context, userID uint, req UploadDiagnosisRequest) (*domain.Diagnosis, error)
	CompleteDiagnosis(ctx context.Context, req CompleteRequest) (*domain.Diagnosis, error)
}

type diagnosisUsecase struct {
	repo      domain.DiagnosisRepository
	publisher messaging.JobPublisher
}

func NewDiagnosisUsecase(repo domain.DiagnosisRepository, publisher messaging.JobPublisher) DiagnosisUsecase {
	return &diagnosisUsecase{repo: repo, publisher: publisher}
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

	// Publish an async job message to RabbitMQ → consumed by the Python Celery worker.
	// If RabbitMQ is unreachable, the NoOpPublisher silently logs and returns nil.
	if err := u.publisher.PublishDiagnosisJob(diag.ID.String(), userID, req.ImageURL); err != nil {
		// Non-fatal: record is already persisted as "pending".
		// The client can poll GET /diagnose/:id for status updates.
		fmt.Printf("warning: failed to publish diagnosis job %s: %v\n", diag.ID, err)
	}

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

// CompleteDiagnosis is called by the internal callback endpoint after the
// Celery worker finishes async inference. It updates the DB record and
// returns the updated Diagnosis for the handler to broadcast via WebSocket.
func (u *diagnosisUsecase) CompleteDiagnosis(ctx context.Context, req CompleteRequest) (*domain.Diagnosis, error) {
	diag, err := u.repo.GetByID(ctx, req.DiagnosisID)
	if err != nil {
		return nil, err
	}
	if diag == nil {
		return nil, fmt.Errorf("diagnosis %s not found", req.DiagnosisID)
	}

	diag.SpeciesLabel = req.SpeciesLabel
	diag.DiseaseLabel = req.DiseaseLabel
	diag.Confidence = req.Confidence
	diag.ExplanationURL = req.ExplanationURL
	diag.Status = domain.StatusCompleted

	if err := u.repo.Update(ctx, diag); err != nil {
		return nil, err
	}

	return diag, nil
}
