package http

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/plant-disease-detection/core-service/internal/usecase"
)

// InternalHandler handles service-to-service callbacks.
// These routes are NOT JWT-protected — they must be isolated to the internal
// Docker network and never exposed via the API gateway.
type InternalHandler struct {
	diagUsecase usecase.DiagnosisUsecase
	wsHub       *WsHub
}

func NewInternalHandler(diagUsecase usecase.DiagnosisUsecase, wsHub *WsHub) *InternalHandler {
	return &InternalHandler{diagUsecase: diagUsecase, wsHub: wsHub}
}

// CompleteDiagnosis is called by the Python Celery worker after async inference finishes.
// It updates the Diagnosis record in the DB and pushes a real-time WebSocket
// notification to the user who initiated the job.
func (h *InternalHandler) CompleteDiagnosis(c *gin.Context) {
	var req usecase.CompleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid callback payload: " + err.Error()})
		return
	}

	diag, err := h.diagUsecase.CompleteDiagnosis(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete diagnosis: " + err.Error()})
		return
	}

	// Build the WebSocket notification payload and broadcast to the user
	wsPayload, err := json.Marshal(gin.H{
		"event":     "diagnosis_complete",
		"diagnosis": diag,
	})
	if err == nil {
		h.wsHub.BroadcastToUser(diag.UserID, wsPayload)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "diagnosis completed and notification sent",
		"diagnosis": diag,
	})
}
