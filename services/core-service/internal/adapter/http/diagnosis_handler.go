package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/plant-disease-detection/core-service/internal/usecase"
)

type DiagnosisHandler struct {
	usecase usecase.DiagnosisUsecase
}

func NewDiagnosisHandler(u usecase.DiagnosisUsecase) *DiagnosisHandler {
	return &DiagnosisHandler{usecase: u}
}

func (h *DiagnosisHandler) Initiate(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized context"})
		return
	}
	userID := val.(uint)

	var req usecase.CreateDiagnosisRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	diag, err := h.usecase.InitiateDiagnosis(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, diag)
}

func (h *DiagnosisHandler) GetByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid diagnosis ID format"})
		return
	}

	diag, err := h.usecase.GetDiagnosis(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if diag == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "diagnosis not found"})
		return
	}

	// Verify resource ownership
	val, exists := c.Get("userID")
	if !exists || val.(uint) != diag.UserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: resource belongs to a different account"})
		return
	}

	c.JSON(http.StatusOK, diag)
}

func (h *DiagnosisHandler) GetHistory(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized context"})
		return
	}
	userID := val.(uint)

	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	diags, err := h.usecase.GetHistory(c.Request.Context(), userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, diags)
}
