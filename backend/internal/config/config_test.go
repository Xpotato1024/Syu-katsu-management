package config

import "testing"

func TestDBConnString(t *testing.T) {
	cfg := Config{
		DBHost:     "localhost",
		DBPort:     "5432",
		DBName:     "syukatsu",
		DBUser:     "user",
		DBPassword: "pass",
		DBSSLMode:  "disable",
	}

	got := cfg.DBConnString()
	want := "host=localhost port=5432 dbname=syukatsu user=user password=pass sslmode=disable"
	if got != want {
		t.Fatalf("unexpected conn string: got %q want %q", got, want)
	}
}

func TestLoadAuthDefaults(t *testing.T) {
	t.Setenv("AUTH_MODE", "")
	t.Setenv("AUTH_PROXY_USER_HEADER", "")
	t.Setenv("AUTH_PROXY_EMAIL_HEADER", "")
	t.Setenv("AUTH_DEV_USER_ID", "")
	t.Setenv("AUTH_DEV_USER_NAME", "")
	t.Setenv("AUTH_DEV_USER_EMAIL", "")

	cfg := Load()
	if cfg.AuthMode != "none" {
		t.Fatalf("unexpected auth mode: %s", cfg.AuthMode)
	}
	if cfg.AuthProxyUserHeader != "X-Forwarded-User" {
		t.Fatalf("unexpected user header: %s", cfg.AuthProxyUserHeader)
	}
	if cfg.AuthDevUserID != "local-dev" {
		t.Fatalf("unexpected dev user id: %s", cfg.AuthDevUserID)
	}
}
