package config

import (
	"fmt"
	"os"
)

type Config struct {
	AppPort            string
	DBHost             string
	DBPort             string
	DBName             string
	DBUser             string
	DBPassword         string
	DBSSLMode          string
	CORSAllowedOrigins string
}

func Load() Config {
	return Config{
		AppPort:            getenv("APP_PORT", "8080"),
		DBHost:             getenv("DB_HOST", "db"),
		DBPort:             getenv("DB_PORT", "5432"),
		DBName:             getenv("DB_NAME", "syukatsu"),
		DBUser:             getenv("DB_USER", "syukatsu_user"),
		DBPassword:         getenv("DB_PASSWORD", "syukatsu_password"),
		DBSSLMode:          getenv("DB_SSLMODE", "disable"),
		CORSAllowedOrigins: getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173"),
	}
}

func (c Config) DBConnString() string {
	return fmt.Sprintf("host=%s port=%s dbname=%s user=%s password=%s sslmode=%s", c.DBHost, c.DBPort, c.DBName, c.DBUser, c.DBPassword, c.DBSSLMode)
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
