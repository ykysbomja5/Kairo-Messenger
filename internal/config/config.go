package config

import (
	"os"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	UploadDir   string
	UploadURL   string
}

func Load() *Config {
	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:QWERTY12345@127.0.0.1:55432/messenger?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "asdlkfqeroptiuialsdjhgasdfasdf"),
		UploadDir:   getEnv("UPLOAD_DIR", "./uploads"),
		UploadURL:   getEnv("UPLOAD_URL", "/uploads"),
	}
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
