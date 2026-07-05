package http

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/plant-disease-detection/core-service/internal/usecase"
)

const aiServiceURL = "http://localhost:8000"

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

// UploadAndDiagnose accepts a multipart image file, forwards it to the Python
// AI service /infer endpoint, saves the diagnosis result to the database,
// and returns the full prediction payload to the client.
func (h *DiagnosisHandler) UploadAndDiagnose(c *gin.Context) {
	val, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized context"})
		return
	}
	userID := val.(uint)

	// Parse image from multipart form (field name: "image")
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "image file is required (field name: image)"})
		return
	}
	defer file.Close()

	imageBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read uploaded file"})
		return
	}

	// Build multipart request to forward to Python AI service
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create multipart request"})
		return
	}
	if _, err = part.Write(imageBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write image to multipart"})
		return
	}
	writer.Close()

	// Call Python AI service /infer
	req, _ := http.NewRequestWithContext(c.Request.Context(), http.MethodPost,
		fmt.Sprintf("%s/infer", aiServiceURL), &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI service is unavailable: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		var aiErr map[string]interface{}
		_ = json.Unmarshal(respBody, &aiErr)
		c.JSON(resp.StatusCode, gin.H{
			"error":  "AI inference failed",
			"detail": aiErr,
		})
		return
	}

	// Decode AI response
	var aiResult usecase.AIInferenceResult
	if err := json.Unmarshal(respBody, &aiResult); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse AI service response"})
		return
	}

	// Persist to database via usecase
	diag, err := h.usecase.DiagnoseFromUpload(c.Request.Context(), userID, usecase.UploadDiagnosisRequest{
		Filename: header.Filename,
		AIResult: aiResult,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"diagnosis": diag,
		"ai_result": aiResult,
	})
}
