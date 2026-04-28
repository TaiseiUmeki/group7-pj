package middleware

import (
	"log"
	"net/http"
	"time"
)

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

// ここにその他のミドルウェアを追加します
// 例: CORSMiddleware, AuthenticationMiddleware等
