package middleware

import (
	"log"
	"net/http"
	"time"
)

// CORSMiddleware はCORSヘッダーを付与し、preflight を処理します
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// LoggingMiddleware はHTTPリクエストのログを記録します
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startTime := time.Now()
		log.Printf("%s %s %s", r.Method, r.RequestURI, r.RemoteAddr)

		next.ServeHTTP(w, r)

		duration := time.Since(startTime)
		log.Printf("Completed in %v", duration)
	})
}
