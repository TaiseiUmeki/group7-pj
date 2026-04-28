package main

import (
	"fmt"
	"log"
	"net/http"

	"backend/internal/api"
	"backend/internal/config"
)

func main() {
	// 設定を読み込む
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// ハンドラーとミドルウェアを設定
	router := api.NewRouter()

	addr := fmt.Sprintf(":%s", cfg.Port)
	fmt.Printf("backend started on %s\n", addr)

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
