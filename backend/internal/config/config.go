package config

import (
	"fmt"
	"os"
)

type Config struct {
	AppPort               string
	StorageBackend        string
	DBAutoMigrate         bool
	DBHost                string
	DBPort                string
	DBName                string
	DBUser                string
	DBPassword            string
	DBSSLMode             string
	CORSAllowedOrigins    string
	CORSAllowedHeaders    string
	AuthMode              string
	AuthProxyUserHeader   string
	AuthProxyEmailHeader  string
	AuthDevUserID         string
	AuthDevUserName       string
	AuthDevUserEmail      string
	AuthSessionSecret     string
	AuthSessionCookieName string
	AuthSessionTTLHours   int
	AuthCookieSecure      bool
	AuthAllowRegistration bool
}

func Load() Config {
	return Config{
		AppPort:               getenv("APP_PORT", "8080"),
		StorageBackend:        getenv("STORAGE_BACKEND", "postgres"),
		DBAutoMigrate:         getenvBool("DB_AUTO_MIGRATE", true),
		DBHost:                getenv("DB_HOST", "db"),
		DBPort:                getenv("DB_PORT", "5432"),
		DBName:                getenv("DB_NAME", "syukatsu"),
		DBUser:                getenv("DB_USER", "syukatsu_user"),
		DBPassword:            getenv("DB_PASSWORD", "syukatsu_password"),
		DBSSLMode:             getenv("DB_SSLMODE", "disable"),
		CORSAllowedOrigins:    getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173"),
		CORSAllowedHeaders:    getenv("CORS_ALLOWED_HEADERS", "Content-Type,Accept,Authorization,X-Forwarded-User,X-Forwarded-Email"),
		AuthMode:              getenv("AUTH_MODE", "none"),
		AuthProxyUserHeader:   getenv("AUTH_PROXY_USER_HEADER", "X-Forwarded-User"),
		AuthProxyEmailHeader:  getenv("AUTH_PROXY_EMAIL_HEADER", "X-Forwarded-Email"),
		AuthDevUserID:         getenv("AUTH_DEV_USER_ID", "local-dev"),
		AuthDevUserName:       getenv("AUTH_DEV_USER_NAME", "Local Developer"),
		AuthDevUserEmail:      getenv("AUTH_DEV_USER_EMAIL", "local@example.com"),
		AuthSessionSecret:     getenv("AUTH_SESSION_SECRET", "dev-insecure-session-secret"),
		AuthSessionCookieName: getenv("AUTH_SESSION_COOKIE_NAME", "skm_session"),
		AuthSessionTTLHours:   getenvInt("AUTH_SESSION_TTL_HOURS", 24),
		AuthCookieSecure:      getenvBool("AUTH_COOKIE_SECURE", false),
		AuthAllowRegistration: getenvBool("AUTH_ALLOW_REGISTRATION", true),
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

func getenvBool(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	switch value {
	case "1", "true", "TRUE", "yes", "YES", "on", "ON":
		return true
	case "0", "false", "FALSE", "no", "NO", "off", "OFF":
		return false
	default:
		return fallback
	}
}

func getenvInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	var out int
	if _, err := fmt.Sscanf(value, "%d", &out); err != nil {
		return fallback
	}
	return out
}
