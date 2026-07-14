package main

import (
	"log"

	"github.com/plant-disease-detection/core-service/internal/adapter/db"
	httpAdapter "github.com/plant-disease-detection/core-service/internal/adapter/http"
	"github.com/plant-disease-detection/core-service/internal/auth"
	"github.com/plant-disease-detection/core-service/internal/config"
	"github.com/plant-disease-detection/core-service/internal/messaging"
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

	// 4. Initialize JWT Service
	jwtService := auth.NewJWTService(cfg)

	// 5. Initialize AMQP Publisher (falls back to NoOp if RabbitMQ is unreachable)
	publisher := messaging.NewAmqpPublisher(cfg.RabbitMQURL)
	defer publisher.Close()

	// 6. Initialize Usecases
	authUsecase := usecase.NewAuthUsecase(userRepo, jwtService)
	diagUsecase := usecase.NewDiagnosisUsecase(diagRepo, publisher)
	treatUsecase := usecase.NewTreatmentUsecase(treatRepo)

	// 7. Initialize and run WebSocket Hub
	wsHub := httpAdapter.NewWsHub()
	go wsHub.Run()

	// 8. Setup REST Handlers
	authHandler := httpAdapter.NewAuthHandler(authUsecase)
	diagHandler := httpAdapter.NewDiagnosisHandler(diagUsecase, cfg.AIServiceURL)
	treatHandler := httpAdapter.NewTreatmentHandler(treatUsecase)
	internalHandler := httpAdapter.NewInternalHandler(diagUsecase, wsHub)

	// 9. Setup Router & Start Server
	router := httpAdapter.SetupRouter(httpAdapter.RouterConfig{
		DB:               gormDB,
		AuthHandler:      authHandler,
		TreatmentHandler: treatHandler,
		DiagnosisHandler: diagHandler,
		InternalHandler:  internalHandler,
		JWTService:       jwtService,
		WsHub:            wsHub,
		AIServiceURL:     cfg.AIServiceURL,
	})

	log.Printf("Core service is running on port %s...", cfg.ServerPort)
	if err := router.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("HTTP Server failed to start: %v", err)
	}
}
