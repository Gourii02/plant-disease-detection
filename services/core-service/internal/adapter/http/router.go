package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/plant-disease-detection/core-service/internal/auth"
	"gorm.io/gorm"
)

type RouterConfig struct {
	DB               *gorm.DB
	AuthHandler      *AuthHandler
	TreatmentHandler *TreatmentHandler
	DiagnosisHandler *DiagnosisHandler
	JWTService       auth.JWTService
	WsHub            *WsHub
}

func SetupRouter(cfg RouterConfig) *gin.Engine {
	r := gin.Default()

	// Global Middlewares
	r.Use(gin.Recovery())

	// Simple CORS Middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	api := r.Group("/api/v1")
	{
		// Health Check
		api.GET("/health", func(c *gin.Context) {
			// Ping the database
			dbStatus := "ok"
			dbMessage := "connected"
			httpStatus := http.StatusOK

			sqlDB, err := cfg.DB.DB()
			if err != nil || sqlDB.Ping() != nil {
				dbStatus = "error"
				dbMessage = "unreachable"
				httpStatus = http.StatusServiceUnavailable
			}

			overallStatus := "ok"
			if dbStatus != "ok" {
				overallStatus = "degraded"
			}

			c.JSON(httpStatus, gin.H{
				"status":  overallStatus,
				"service": "core-service",
				"version": "1.0.0",
				"checks": gin.H{
					"database": gin.H{
						"status":  dbStatus,
						"message": dbMessage,
					},
				},
			})
		})

		// Public Auth Routes
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/signup", cfg.AuthHandler.Register)
			authGroup.POST("/login", cfg.AuthHandler.Login)
		}

		// Public Treatments Routes
		treatmentsGroup := api.Group("/treatments")
		{
			treatmentsGroup.GET("", cfg.TreatmentHandler.ListTreatments)
			treatmentsGroup.GET("/:key", cfg.TreatmentHandler.GetTreatment)
		}

		// Private Routes (Protected by JWT)
		private := api.Group("")
		private.Use(AuthMiddleware(cfg.JWTService))
		{
			private.POST("/diagnose", cfg.DiagnosisHandler.Initiate)
			private.POST("/diagnose/upload", cfg.DiagnosisHandler.UploadAndDiagnose)
			private.GET("/diagnose/:id", cfg.DiagnosisHandler.GetByID)
			private.GET("/history", cfg.DiagnosisHandler.GetHistory)
			
			// WebSocket upgrade endpoint
			private.GET("/ws", func(c *gin.Context) {
				val, _ := c.Get("userID")
				userID := val.(uint)
				cfg.WsHub.ServeWs(c, userID)
			})
		}
	}

	return r
}
