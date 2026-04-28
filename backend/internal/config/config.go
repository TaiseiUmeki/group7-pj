package config

import (
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
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = "dev-jwt-secret"
	}

	return cfg, nil
}
