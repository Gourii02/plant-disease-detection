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
		{DiseaseKey: "apple_scab", DisplayName: "Apple Scab", Description: "A fungal disease caused by Venturia inaequalis. Creates dark, scabby lesions on leaves and fruit.", PreventiveMeasures: []string{"Plant resistant apple varieties", "Rake and destroy fallen leaves in autumn", "Ensure good air circulation by pruning", "Avoid overhead irrigation"}, OrganicTreatments: []string{"Apply sulfur-based fungicide at bud break", "Use neem oil spray every 7–10 days", "Copper-based sprays before wet weather"}, ChemicalTreatments: []string{"Myclobutanil (Rally)", "Trifloxystrobin (Flint)", "Mancozeb at green tip stage"}, UpdatedAt: time.Now()},
		{DiseaseKey: "apple_black_rot", DisplayName: "Apple Black Rot", Description: "Caused by Botryosphaeria obtusa. Produces frog-eye leaf spots and mummified fruit.", PreventiveMeasures: []string{"Remove and destroy infected fruit and mummified apples", "Prune dead or infected wood", "Maintain tree vigor through fertilization"}, OrganicTreatments: []string{"Captan fungicide (OMRI listed)", "Copper hydroxide sprays", "Bacillus subtilis biofungicide"}, ChemicalTreatments: []string{"Thiophanate-methyl", "Ziram", "Captan + myclobutanil combination"}, UpdatedAt: time.Now()},
		{DiseaseKey: "cedar_apple_rust", DisplayName: "Cedar Apple Rust", Description: "A fungal disease caused by Gymnosporangium juniperi-virginianae requiring both apple and juniper hosts.", PreventiveMeasures: []string{"Remove nearby juniper/red cedar trees within 1km", "Plant rust-resistant apple varieties", "Apply fungicides starting at pink bud stage"}, OrganicTreatments: []string{"Sulfur-based sprays during bloom", "Neem oil applications", "Copper sulfate before bud break"}, ChemicalTreatments: []string{"Myclobutanil", "Propiconazole", "Tebuconazole"}, UpdatedAt: time.Now()},
		{DiseaseKey: "cherry_powdery_mildew", DisplayName: "Cherry Powdery Mildew", Description: "White powdery fungal growth on leaves caused by Podosphaera clandestina.", PreventiveMeasures: []string{"Avoid excessive nitrogen fertilization", "Prune for open canopy structure", "Remove and destroy infected shoots in winter"}, OrganicTreatments: []string{"Potassium bicarbonate sprays", "Neem oil every 7 days", "Dilute milk spray (40% milk, 60% water)"}, ChemicalTreatments: []string{"Myclobutanil", "Trifloxystrobin", "Sulfur-based fungicides"}, UpdatedAt: time.Now()},
		{DiseaseKey: "corn_gray_leaf_spot", DisplayName: "Corn Gray Leaf Spot", Description: "Caused by Cercospora zeae-maydis. Creates rectangular lesions that reduce photosynthesis.", PreventiveMeasures: []string{"Rotate crops — avoid continuous corn planting", "Plant resistant hybrids", "Till to bury crop residue"}, OrganicTreatments: []string{"Trichoderma-based biofungicides", "Neem oil sprays", "Compost tea applications"}, ChemicalTreatments: []string{"Azoxystrobin", "Pyraclostrobin", "Propiconazole"}, UpdatedAt: time.Now()},
		{DiseaseKey: "corn_common_rust", DisplayName: "Corn Common Rust", Description: "Caused by Puccinia sorghi. Produces cinnamon-brown pustules on both leaf surfaces.", PreventiveMeasures: []string{"Plant rust-resistant corn hybrids", "Early planting to avoid peak rust season", "Monitor fields weekly during growing season"}, OrganicTreatments: []string{"Sulfur dust applications", "Neem oil sprays", "Potassium silicate to strengthen cell walls"}, ChemicalTreatments: []string{"Trifloxystrobin + propiconazole", "Azoxystrobin", "Mancozeb"}, UpdatedAt: time.Now()},
		{DiseaseKey: "corn_northern_leaf_blight", DisplayName: "Corn Northern Leaf Blight", Description: "Caused by Exserohilum turcicum. Creates long, cigar-shaped gray-green to tan lesions.", PreventiveMeasures: []string{"Use resistant hybrids", "Crop rotation with non-host plants", "Deep tillage to bury infected residue"}, OrganicTreatments: []string{"Bacillus subtilis foliar sprays", "Compost tea", "Neem cake soil treatment"}, ChemicalTreatments: []string{"Azoxystrobin + propiconazole", "Tebuconazole", "Mancozeb"}, UpdatedAt: time.Now()},
		{DiseaseKey: "grape_black_rot", DisplayName: "Grape Black Rot", Description: "Caused by Guignardia bidwellii. Causes circular brown lesions on leaves and shrivels berries.", PreventiveMeasures: []string{"Remove mummified berries and infected canes", "Ensure good canopy ventilation", "Apply fungicides from bud break"}, OrganicTreatments: []string{"Copper hydroxide sprays", "Sulfur dust", "Bordeaux mixture"}, ChemicalTreatments: []string{"Mancozeb", "Myclobutanil", "Captan"}, UpdatedAt: time.Now()},
		{DiseaseKey: "grape_esca", DisplayName: "Grape Esca (Black Measles)", Description: "A complex wood disease causing tiger-stripe leaf patterns and vine death.", PreventiveMeasures: []string{"Protect pruning wounds immediately with wound sealants", "Avoid large pruning cuts", "Remove and burn infected wood"}, OrganicTreatments: []string{"Trichoderma viride wound treatments", "Garlic extract sprays", "Silicon-based foliar feeds"}, ChemicalTreatments: []string{"Thiophanate-methyl wound paste", "Flusilazole", "Tebuconazole"}, UpdatedAt: time.Now()},
		{DiseaseKey: "grape_leaf_spot", DisplayName: "Grape Leaf Spot (Isariopsis)", Description: "Caused by Pseudocercospora vitis. Creates angular brown spots on upper leaf surface.", PreventiveMeasures: []string{"Improve air circulation through canopy management", "Avoid leaf wetness with drip irrigation", "Remove infected leaves"}, OrganicTreatments: []string{"Copper-based sprays", "Neem oil", "Sulfur dust"}, ChemicalTreatments: []string{"Mancozeb", "Myclobutanil", "Ziram"}, UpdatedAt: time.Now()},
		{DiseaseKey: "citrus_greening", DisplayName: "Citrus Greening (HLB)", Description: "Caused by Candidatus Liberibacter asiaticus, spread by the Asian citrus psyllid. Has no cure.", PreventiveMeasures: []string{"Control Asian citrus psyllid with insecticides", "Remove and destroy infected trees immediately", "Use certified disease-free nursery stock"}, OrganicTreatments: []string{"Thermotherapy (heat treatment of nursery stock)", "Psyllid control using insecticidal soap", "Reflective mulches to deter psyllids"}, ChemicalTreatments: []string{"Imidacloprid for psyllid control", "Drenches with systemic insecticides", "Oxytetracycline antibiotic injections"}, UpdatedAt: time.Now()},
		{DiseaseKey: "peach_bacterial_spot", DisplayName: "Peach Bacterial Spot", Description: "Caused by Xanthomonas arboricola pv. pruni. Creates water-soaked spots on leaves and fruit.", PreventiveMeasures: []string{"Plant resistant peach varieties", "Avoid overhead irrigation", "Apply copper-based bactericides at leaf fall"}, OrganicTreatments: []string{"Copper hydroxide sprays", "Bordeaux mixture", "Bacillus subtilis biobactericide"}, ChemicalTreatments: []string{"Oxytetracycline", "Copper-based bactericides", "Ziram + copper combination"}, UpdatedAt: time.Now()},
		{DiseaseKey: "pepper_bacterial_spot", DisplayName: "Bell Pepper Bacterial Spot", Description: "Caused by Xanthomonas campestris pv. vesicatoria. Creates water-soaked lesions on leaves and fruit.", PreventiveMeasures: []string{"Use disease-free certified seed", "Avoid working in fields when plants are wet", "Rotate crops every 2–3 years"}, OrganicTreatments: []string{"Copper octanoate sprays", "Bacillus amyloliquefaciens biofungicide", "Compost tea foliar spray"}, ChemicalTreatments: []string{"Copper hydroxide", "Mancozeb + copper combination", "Acibenzolar-S-methyl"}, UpdatedAt: time.Now()},
		{DiseaseKey: "potato_early_blight", DisplayName: "Potato Early Blight", Description: "Caused by Alternaria solani. Produces dark brown spots with concentric rings (bullseye pattern).", PreventiveMeasures: []string{"Maintain plant vigor with adequate fertilization", "Use certified seed potatoes", "Avoid wetting foliage during irrigation"}, OrganicTreatments: []string{"Copper-based fungicides", "Neem oil sprays", "Compost tea applications"}, ChemicalTreatments: []string{"Chlorothalonil", "Mancozeb", "Azoxystrobin"}, UpdatedAt: time.Now()},
		{DiseaseKey: "potato_late_blight", DisplayName: "Potato Late Blight", Description: "Caused by Phytophthora infestans. Causes rapid collapse of foliage and tuber rot in wet conditions.", PreventiveMeasures: []string{"Plant certified blight-free seed potatoes", "Avoid excessive nitrogen", "Hill soil around plants to protect tubers"}, OrganicTreatments: []string{"Copper-based fungicides (early intervention)", "Biofungicides containing Bacillus subtilis"}, ChemicalTreatments: []string{"Mancozeb", "Metalaxyl + mancozeb", "Dimethomorph"}, UpdatedAt: time.Now()},
		{DiseaseKey: "squash_powdery_mildew", DisplayName: "Squash Powdery Mildew", Description: "Caused by Podosphaera xanthii. White powdery coating on leaves reduces photosynthesis.", PreventiveMeasures: []string{"Plant resistant varieties", "Ensure adequate plant spacing", "Avoid overhead watering"}, OrganicTreatments: []string{"Potassium bicarbonate sprays", "Neem oil every 7 days", "Dilute milk spray"}, ChemicalTreatments: []string{"Trifloxystrobin", "Myclobutanil", "Azoxystrobin"}, UpdatedAt: time.Now()},
		{DiseaseKey: "strawberry_leaf_scorch", DisplayName: "Strawberry Leaf Scorch", Description: "Caused by Diplocarpon earlianum. Creates irregular purple-to-brown spots.", PreventiveMeasures: []string{"Remove and destroy old foliage after harvest", "Avoid overhead irrigation", "Use disease-free transplants"}, OrganicTreatments: []string{"Copper fungicide sprays", "Neem oil", "Remove heavily infected leaves"}, ChemicalTreatments: []string{"Captan", "Myclobutanil", "Thiophanate-methyl"}, UpdatedAt: time.Now()},
		{DiseaseKey: "tomato_bacterial_spot", DisplayName: "Tomato Bacterial Spot", Description: "Caused by Xanthomonas vesicatoria. Water-soaked spots on leaves, stems, and fruit.", PreventiveMeasures: []string{"Use disease-free certified seed", "Avoid overhead watering", "Crop rotation every 2+ years"}, OrganicTreatments: []string{"Copper-based bactericides", "Bacillus subtilis sprays"}, ChemicalTreatments: []string{"Copper hydroxide", "Mancozeb + copper", "Acibenzolar-S-methyl"}, UpdatedAt: time.Now()},
		{DiseaseKey: "tomato_early_blight", DisplayName: "Tomato Early Blight", Description: "A common fungal disease caused by the pathogen Alternaria solani, producing dark concentric circles on older leaves first.", PreventiveMeasures: []string{"Rotate crops with non-solanaceous species every 3 years.", "Ensure appropriate spacing between plants to maximize airflow.", "Prune the lower leaves of tomato vines to prevent soil contact."}, OrganicTreatments: []string{"Apply copper-based organic fungicides at the first sign of symptoms.", "Mulch around the base of the tomato plants to stop soil spores from splashing up."}, ChemicalTreatments: []string{"Apply chlorothalonil foliar sprays according to standard guidelines.", "Use azoxystrobin or copper hydroxide compounds during persistent damp weather."}, UpdatedAt: time.Now()},
		{DiseaseKey: "tomato_late_blight", DisplayName: "Tomato Late Blight", Description: "Caused by Phytophthora infestans. Large, water-soaked lesions with white mold on undersides.", PreventiveMeasures: []string{"Stake plants for airflow", "Avoid wetting foliage", "Monitor closely during wet weather"}, OrganicTreatments: []string{"Copper hydroxide sprays", "Bacillus amyloliquefaciens"}, ChemicalTreatments: []string{"Mancozeb", "Metalaxyl + mancozeb", "Cymoxanil"}, UpdatedAt: time.Now()},
		{DiseaseKey: "tomato_leaf_mold", DisplayName: "Tomato Leaf Mold", Description: "Caused by Passalora fulva. Yellow spots on upper leaf surface with olive-green mold below.", PreventiveMeasures: []string{"Reduce humidity in greenhouses", "Ensure adequate ventilation", "Avoid wetting foliage"}, OrganicTreatments: []string{"Copper-based fungicides", "Bacillus subtilis", "Sulfur dust in greenhouses"}, ChemicalTreatments: []string{"Chlorothalonil", "Difenoconazole", "Azoxystrobin"}, UpdatedAt: time.Now()},
		{DiseaseKey: "tomato_septoria_leaf_spot", DisplayName: "Tomato Septoria Leaf Spot", Description: "Caused by Septoria lycopersici. Small circular spots with dark borders on lower leaves.", PreventiveMeasures: []string{"Mulch soil to prevent rain splash", "Remove infected lower leaves", "Avoid overhead watering"}, OrganicTreatments: []string{"Copper-based fungicides", "Bacillus subtilis sprays", "Neem oil"}, ChemicalTreatments: []string{"Chlorothalonil", "Mancozeb", "Myclobutanil"}, UpdatedAt: time.Now()},
		{DiseaseKey: "tomato_spider_mites", DisplayName: "Tomato Spider Mites", Description: "Tetranychus urticae causes stippled, bronzed leaves with fine webbing.", PreventiveMeasures: []string{"Maintain adequate soil moisture", "Avoid excessive nitrogen", "Encourage natural predators (lady beetles)"}, OrganicTreatments: []string{"Neem oil every 5–7 days", "Insecticidal soap sprays", "Diatomaceous earth"}, ChemicalTreatments: []string{"Abamectin", "Spiromesifen", "Bifenazate"}, UpdatedAt: time.Now()},
		{DiseaseKey: "tomato_target_spot", DisplayName: "Tomato Target Spot", Description: "Caused by Corynespora cassiicola. Concentric ring pattern lesions on leaves, stems, and fruit.", PreventiveMeasures: []string{"Ensure good plant spacing and air circulation", "Avoid overhead irrigation", "Remove crop debris after harvest"}, OrganicTreatments: []string{"Copper-based fungicides", "Bacillus subtilis", "Neem oil"}, ChemicalTreatments: []string{"Azoxystrobin", "Mancozeb", "Difenoconazole"}, UpdatedAt: time.Now()},
		{DiseaseKey: "tomato_yellow_leaf_curl_virus", DisplayName: "Tomato Yellow Leaf Curl Virus", Description: "A begomovirus spread by the silverleaf whitefly (Bemisia tabaci). Causes severe leaf curling.", PreventiveMeasures: []string{"Use reflective silver mulch to deter whiteflies", "Plant resistant tomato varieties", "Remove and destroy infected plants immediately"}, OrganicTreatments: []string{"Neem oil + insecticidal soap for whitefly control", "Yellow sticky traps", "Spinosad sprays"}, ChemicalTreatments: []string{"Imidacloprid soil drench", "Thiamethoxam", "Pymetrozine for whitefly control"}, UpdatedAt: time.Now()},
		{DiseaseKey: "tomato_mosaic_virus", DisplayName: "Tomato Mosaic Virus", Description: "ToMV is mechanically transmitted through touch, tools, and tobacco products.", PreventiveMeasures: []string{"Wash hands thoroughly before working with plants", "Disinfect tools with 1:9 bleach solution", "Remove infected plants immediately"}, OrganicTreatments: []string{"No chemical cure — focus on prevention and removal", "Milk spray may have antiviral properties"}, ChemicalTreatments: []string{"No effective chemical treatment", "Control aphid/whitefly vectors with appropriate insecticides"}, UpdatedAt: time.Now()},
		{DiseaseKey: "tomato_fusarium_wilt", DisplayName: "Tomato Fusarium / Verticillium Wilt", Description: "Soil-borne fungal vascular wilt (Fusarium oxysporum / Verticillium dahliae). Causes lower foliage yellowing, wilting, and brown vascular discoloration.", PreventiveMeasures: []string{"Plant resistant tomato varieties (look for 'F' and 'V' on seed packets)", "Practice 3–4 year crop rotation with non-solanaceous crops", "Solarize soil with clear plastic tarps during hot months", "Maintain soil pH around 6.5–7.0"}, OrganicTreatments: []string{"Soil drench with Trichoderma harzianum or Bacillus biofungicides", "Apply mycorrhizal fungi at transplanting to boost root immunity", "Incorporate compost tea and neem cake meal into soil"}, ChemicalTreatments: []string{"Soil drench with systemic fungicides (Thiophanate-methyl / Azoxystrobin)", "Soil fumigation before planting (professional use)", "Remove and destroy severely wilted plants to prevent soil buildup"}, UpdatedAt: time.Now()},
		{DiseaseKey: "cherry_leaf_spot", DisplayName: "Cherry Leaf Spot (Blumeriella jaapii)", Description: "Caused by Blumeriella jaapii. Creates dark reddish-purple spots on cherry tree leaves that turn brown, dry out, and drop off prematurely (shot-hole effect).", PreventiveMeasures: []string{"Rake and destroy fallen leaves in autumn to reduce overwintering spores", "Prune tree canopy for good air circulation and sunlight penetration", "Avoid overhead sprinkler irrigation"}, OrganicTreatments: []string{"Copper-based fungicides at leaf unfolding", "Sulfur spray applications every 7–10 days", "Neem oil sprays post-bloom"}, ChemicalTreatments: []string{"Myclobutanil (Rally)", "Captan", "Chlorothalonil applied at petal fall"}, UpdatedAt: time.Now()},
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
