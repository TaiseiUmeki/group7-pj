package main

import (
	"fmt"
	"os"

	"github.com/gin-gonic/gin"
)

// 将来的に消す（現在は未使用のためimportを削除）

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.GET("/health", func(c *gin.Context) {
		c.Status(200)
	})

	addr := ":" + port
	fmt.Printf("backend started on %s\n", addr)
	if err := r.Run(addr); err != nil {
		panic(err)
	}
}
