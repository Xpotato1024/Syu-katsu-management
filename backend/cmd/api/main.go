package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"syu-katsu-management/backend/internal/auth"
	"syu-katsu-management/backend/internal/company"
	"syu-katsu-management/backend/internal/config"
)

func main() {
	cfg := config.Load()

	repo, cleanup, err := buildStore(cfg)
	if err != nil {
		log.Fatalf("failed to initialize store: %v", err)
	}
	if cleanup != nil {
		defer cleanup()
	}

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

func buildStore(cfg config.Config) (company.Store, func(), error) {
	switch strings.TrimSpace(cfg.StorageBackend) {
	case "", "postgres":
		db, err := openPostgresWithRetry(cfg.DBConnString())
		if err != nil {
			return nil, nil, err
		}
		pgRepo := company.NewPostgresRepository(db)
		if cfg.DBAutoMigrate {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			if err := pgRepo.AutoMigrate(ctx); err != nil {
				_ = db.Close()
				return nil, nil, err
			}
		}
		return pgRepo, func() { _ = db.Close() }, nil
	case "memory":
		return company.NewRepository(), nil, nil
	default:
		return nil, nil, fmt.Errorf("unsupported STORAGE_BACKEND: %s", cfg.StorageBackend)
	}
}

func openPostgresWithRetry(connString string) (*sql.DB, error) {
	var lastErr error
	for i := 0; i < 30; i++ {
		db, err := sql.Open("postgres", connString)
		if err != nil {
			lastErr = err
			time.Sleep(1 * time.Second)
			continue
		}

		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		err = db.PingContext(ctx)
		cancel()
		if err == nil {
			return db, nil
		}
		lastErr = err
		_ = db.Close()
		time.Sleep(1 * time.Second)
	}
	if lastErr == nil {
		lastErr = errors.New("failed to connect database")
	}
	return nil, lastErr
}
