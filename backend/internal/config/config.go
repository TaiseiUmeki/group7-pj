package config

import (
	"fmt"
	"os"
)

// Config は設定情報を保持します
type Config struct {
	Port     string
	Env      string
	DBDriver string
	DBURL    string
	JWTSecret string
}

// Load は環境変数から設定を読み込みます
func Load() (*Config, error) {
	cfg := &Config{
		Port:     os.Getenv("PORT"),
		Env:      os.Getenv("ENV"),
		DBDriver: os.Getenv("DB_DRIVER"),
		DBURL:    os.Getenv("DB_URL"),
		JWTSecret: os.Getenv("JWT_SECRET"),
	}

	// デフォルト値を設定
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.Env == "" {
		cfg.Env = "development"
	}
	if cfg.DBDriver == "" {
		cfg.DBDriver = "mysql"
	}
	if cfg.DBURL == "" && cfg.DBDriver == "mysql" {
		cfg.DBURL = defaultMySQLURL()
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = "dev-jwt-secret"
	}

	return cfg, nil
}

func defaultMySQLURL() string {
	user := getEnv("DB_USER", "app_user")
	password := getEnv("DB_PASSWORD", "app_pass")
	host := getEnv("DB_HOST", "db")
	port := getEnv("DB_PORT", "3306")
	database := getEnv("DB_DATABASE", "app_db")

	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", user, password, host, port, database)
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
