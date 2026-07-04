package http

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/plant-disease-detection/core-service/internal/auth"
)

type RouterConfig struct {
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

	api := r.Group("/api/v1")
	{
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
			private.GET("/diagnose/:id", cfg.DiagnosisHandler.GetByID)
			private.GET("/history", cfg.DiagnosisHandler.GetHistory)
			
			// WebSocket upgrade endpoint
			private.GET("/ws", func(c *gin.Context) {
				val, _ := c.Get("userID")
				userID := val.(uuid.UUID)
				cfg.WsHub.ServeWs(c, userID)
			})
		}
	}

	return r
}
