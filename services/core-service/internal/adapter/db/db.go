package db

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/plant-disease-detection/core-service/internal/config"
	"github.com/plant-disease-detection/core-service/internal/domain"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func ConnectDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=UTC",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort, cfg.DBSSLMode)

	var db *gorm.DB
	var err error

	// Retry database connection for up to 5 times (useful in docker-compose launch orders)
	for i := 1; i <= 5; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			break
		}
		log.Printf("Failed to connect to database (attempt %d/5): %v. Retrying in 3 seconds...", i, err)
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}

	// Retrieve low-level SQL DB connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("Database connection successfully established.")

	// Run auto migrations
	if err := db.AutoMigrate(&domain.User{}, &domain.Diagnosis{}, &domain.Treatment{}); err != nil {
		return nil, fmt.Errorf("failed to run database auto-migrations: %w", err)
	}
	log.Println("Database schema migrations executed successfully.")

	// Seed database with mock/default values
	SeedTreatments(db)

	return db, nil
}

func SeedTreatments(db *gorm.DB) {
	treatments := []domain.Treatment{
		{
			DiseaseKey:  "tomato_early_blight",
			DisplayName: "Tomato Early Blight",
			Description: "A common fungal disease caused by the pathogen Alternaria solani, producing dark concentric circles on older leaves first.",
			PreventiveMeasures: []string{
				"Rotate crops with non-solanaceous species (like corn or beans) every 3 years.",
				"Ensure appropriate spacing between plants to maximize airflow and keep leaves dry.",
				"Prune the lower leaves of tomato vines to prevent soil contact.",
			},
			OrganicTreatments: []string{
				"Apply copper-based organic fungicides at the first sign of symptoms.",
				"Mulch around the base of the tomato plants to stop soil spores from splashing up.",
			},
			ChemicalTreatments: []string{
				"Apply chlorothalonil foliar sprays according to standard guidelines.",
				"Use azoxystrobin or copper hydroxide compounds during persistent damp weather.",
			},
			UpdatedAt: time.Now(),
		},
		{
			DiseaseKey:  "potato_late_blight",
			DisplayName: "Potato Late Blight",
			Description: "A highly destructive disease caused by the oomycete Phytophthora infestans. Spreads rapidly in cool, wet weather, rotting leaves and tubers.",
			PreventiveMeasures: []string{
				"Plant only certified disease-free seed tubers.",
				"Destroy volunteer potato plants and nightshade weeds near the field.",
				"Avoid overhead sprinkler irrigation to keep leaves dry.",
			},
			OrganicTreatments: []string{
				"Apply preventive copper sprays regularly during humid seasons.",
				"Immediately destroy and bury infected plants to avoid spore clouds.",
			},
			ChemicalTreatments: []string{
				"Spray systemic fungicides containing metalaxyl-M or mancozeb.",
				"Rotate chemical modes of action to prevent the pathogen from building resistance.",
			},
			UpdatedAt: time.Now(),
		},
	}

	for _, t := range treatments {
		var count int64
		db.Model(&domain.Treatment{}).Where("disease_key = ?", t.DiseaseKey).Count(&count)
		if count == 0 {
			if err := db.Create(&t).Error; err != nil {
				log.Printf("Failed to seed treatment for %s: %v", t.DiseaseKey, err)
			} else {
				log.Printf("Successfully seeded treatment: %s", t.DisplayName)
			}
		}
	}
}

// Helper context getter
func GetGormDBWithContext(ctx context.Context, db *gorm.DB) *gorm.DB {
	return db.WithContext(ctx)
}
