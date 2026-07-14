package config

import (
	"log"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	ServerPort   string `mapstructure:"SERVER_PORT"`
	DBHost       string `mapstructure:"DB_HOST"`
	DBPort       string `mapstructure:"DB_PORT"`
	DBUser       string `mapstructure:"DB_USER"`
	DBPassword   string `mapstructure:"DB_PASSWORD"`
	DBName       string `mapstructure:"DB_NAME"`
	DBSSLMode    string `mapstructure:"DB_SSLMODE"`
	RedisHost    string `mapstructure:"REDIS_HOST"`
	RedisPort    string `mapstructure:"REDIS_PORT"`
	RedisPass    string `mapstructure:"REDIS_PASSWORD"`
	JWTSecret    string `mapstructure:"JWT_SECRET"`
	JWTExpiry    int    `mapstructure:"JWT_EXPIRY_MINUTES"`
	AIServiceURL string `mapstructure:"AI_SERVICE_URL"`
	RabbitMQURL  string `mapstructure:"RABBITMQ_URL"`
}

func LoadConfig() (*Config, error) {
	viper.AddConfigPath(".")
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")

	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// Set defaults
	viper.SetDefault("SERVER_PORT", "8080")
	viper.SetDefault("DB_HOST", "localhost")
	viper.SetDefault("DB_PORT", "5432")
	viper.SetDefault("DB_USER", "postgres")
	viper.SetDefault("DB_PASSWORD", "postgres")
	viper.SetDefault("DB_NAME", "plant_disease_db")
	viper.SetDefault("DB_SSLMODE", "disable")
	viper.SetDefault("REDIS_HOST", "localhost")
	viper.SetDefault("REDIS_PORT", "6379")
	viper.SetDefault("REDIS_PASSWORD", "")
	viper.SetDefault("JWT_SECRET", "super_secret_signing_key_change_in_production")
	viper.SetDefault("JWT_EXPIRY_MINUTES", 1440)
	viper.SetDefault("AI_SERVICE_URL", "http://localhost:8000")
	viper.SetDefault("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, err
		}
		log.Println("No config.yaml found, relying on environment variables.")
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}

	return &config, nil
}
