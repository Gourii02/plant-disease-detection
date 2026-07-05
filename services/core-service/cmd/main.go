package main

import (
	"log"

	"github.com/plant-disease-detection/core-service/internal/adapter/db"
	"github.com/plant-disease-detection/core-service/internal/adapter/http"
	"github.com/plant-disease-detection/core-service/internal/auth"
	"github.com/plant-disease-detection/core-service/internal/config"
	"github.com/plant-disease-detection/core-service/internal/usecase"
)

func main() {
	log.Println("Starting Core Business Service...")

	// 1. Load Configurations
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Critical error: unable to load configuration schemas: %v", err)
	}

	// 2. Establish Database connection pools and run migrations/seeds
	gormDB, err := db.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("Critical database connection error: %v", err)
	}

	// 3. Initialize Repositories
	userRepo := db.NewUserRepository(gormDB)
	diagRepo := db.NewDiagnosisRepository(gormDB)
	treatRepo := db.NewTreatmentRepository(gormDB)

	// 4. Initialize JWT Services
	jwtService := auth.NewJWTService(cfg)

	// 5. Initialize Usecases
	authUsecase := usecase.NewAuthUsecase(userRepo, jwtService)
	diagUsecase := usecase.NewDiagnosisUsecase(diagRepo)
	treatUsecase := usecase.NewTreatmentUsecase(treatRepo)

	// 6. Setup REST Handlers
	authHandler := http.NewAuthHandler(authUsecase)
	diagHandler := http.NewDiagnosisHandler(diagUsecase)
	treatHandler := http.NewTreatmentHandler(treatUsecase)

	// Initialize and run WebSocket Hub
	wsHub := http.NewWsHub()
	go wsHub.Run()

	// 7. Setup Router & Start Server
	router := http.SetupRouter(http.RouterConfig{
		DB:               gormDB,
		AuthHandler:      authHandler,
		TreatmentHandler: treatHandler,
		DiagnosisHandler: diagHandler,
		JWTService:       jwtService,
		WsHub:            wsHub,
	})

	log.Printf("Core service is running on port %s...", cfg.ServerPort)
	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("HTTP Server failed to start: %v", err)
	}
}
