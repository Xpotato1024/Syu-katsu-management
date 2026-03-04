package main

import (
	"log"
	"net/http"
	"strings"

	"syu-katsu-management/backend/internal/auth"
	"syu-katsu-management/backend/internal/company"
	"syu-katsu-management/backend/internal/config"
)

func main() {
	cfg := config.Load()

	repo := company.NewRepository()
	authProvider, err := auth.NewProvider(auth.Config{
		Mode:             cfg.AuthMode,
		ProxyUserHeader:  cfg.AuthProxyUserHeader,
		ProxyEmailHeader: cfg.AuthProxyEmailHeader,
		DevUserID:        cfg.AuthDevUserID,
		DevUserName:      cfg.AuthDevUserName,
		DevUserEmail:     cfg.AuthDevUserEmail,
	})
	if err != nil {
		log.Fatalf("invalid auth configuration: %v", err)
	}

	handler := company.NewHandler(repo, authProvider)

	mux := http.NewServeMux()
	handler.Register(mux)

	server := &http.Server{
		Addr:    ":" + cfg.AppPort,
		Handler: withCORS(mux, cfg.CORSAllowedOrigins, cfg.CORSAllowedHeaders),
	}

	log.Printf("server starting on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func withCORS(next http.Handler, allowedOrigins, allowedHeaders string) http.Handler {
	origins := strings.Split(allowedOrigins, ",")
	allowed := map[string]struct{}{}
	for _, o := range origins {
		trimmed := strings.TrimSpace(o)
		if trimmed == "" {
			continue
		}
		allowed[trimmed] = struct{}{}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if _, ok := allowed[origin]; ok {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", allowedHeaders)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
