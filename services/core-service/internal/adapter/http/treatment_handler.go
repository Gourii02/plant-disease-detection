package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/plant-disease-detection/core-service/internal/usecase"
)

type TreatmentHandler struct {
	usecase usecase.TreatmentUsecase
}

func NewTreatmentHandler(u usecase.TreatmentUsecase) *TreatmentHandler {
	return &TreatmentHandler{usecase: u}
}

func (h *TreatmentHandler) GetTreatment(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "treatment key is required"})
		return
	}

	t, err := h.usecase.GetTreatment(c.Request.Context(), key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if t == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "treatment not found"})
		return
	}

	c.JSON(http.StatusOK, t)
}

func (h *TreatmentHandler) ListTreatments(c *gin.Context) {
	list, err := h.usecase.ListTreatments(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, list)
}
