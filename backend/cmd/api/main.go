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

	db, cleanup, err := buildDatabase(cfg)
	if err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}
	if cleanup != nil {
		defer cleanup()
	}

	repo, err := buildCompanyStore(cfg, db)
	if err != nil {
		log.Fatalf("failed to initialize company store: %v", err)
	}

	localUserStore, err := buildLocalUserStore(cfg, db)
	if err != nil {
		log.Fatalf("failed to initialize auth store: %v", err)
	}

	authProvider, err := auth.NewProvider(auth.Config{
		Mode:              cfg.AuthMode,
		ProxyUserHeader:   cfg.AuthProxyUserHeader,
		ProxyEmailHeader:  cfg.AuthProxyEmailHeader,
		DevUserID:         cfg.AuthDevUserID,
		DevUserName:       cfg.AuthDevUserName,
		DevUserEmail:      cfg.AuthDevUserEmail,
		LocalUserStore:    localUserStore,
		SessionSecret:     cfg.AuthSessionSecret,
		SessionCookieName: cfg.AuthSessionCookieName,
		SessionTTL:        time.Duration(cfg.AuthSessionTTLHours) * time.Hour,
		CookieSecure:      cfg.AuthCookieSecure,
		AllowRegistration: cfg.AuthAllowRegistration,
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

func buildDatabase(cfg config.Config) (*sql.DB, func(), error) {
	needsDB := strings.TrimSpace(cfg.StorageBackend) == "" || strings.TrimSpace(cfg.StorageBackend) == "postgres" || strings.TrimSpace(cfg.AuthMode) == auth.ModeLocal
	if !needsDB {
		return nil, nil, nil
	}
	db, err := openPostgresWithRetry(cfg.DBConnString())
	if err != nil {
		return nil, nil, err
	}
	return db, func() { _ = db.Close() }, nil
}

func buildCompanyStore(cfg config.Config, db *sql.DB) (company.Store, error) {
	switch strings.TrimSpace(cfg.StorageBackend) {
	case "", "postgres":
		if db == nil {
			return nil, errors.New("database is required for postgres storage backend")
		}
		pgRepo := company.NewPostgresRepository(db)
		if cfg.DBAutoMigrate {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			if err := pgRepo.AutoMigrate(ctx); err != nil {
				return nil, err
			}
		}
		return pgRepo, nil
	case "memory":
		return company.NewRepository(), nil
	default:
		return nil, fmt.Errorf("unsupported STORAGE_BACKEND: %s", cfg.StorageBackend)
	}
}

func buildLocalUserStore(cfg config.Config, db *sql.DB) (auth.LocalUserStore, error) {
	if strings.TrimSpace(cfg.AuthMode) != auth.ModeLocal {
		return nil, nil
	}

	if db != nil {
		store := auth.NewPostgresLocalUserStore(db)
		if cfg.DBAutoMigrate {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			if err := store.AutoMigrate(ctx); err != nil {
				return nil, err
			}
		}
		return store, nil
	}

	store := auth.NewInMemoryLocalUserStore()
	return store, nil
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
