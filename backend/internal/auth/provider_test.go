package auth

import (
	"errors"
	"net/http/httptest"
	"testing"
)

func TestProviderResolveNoneMode(t *testing.T) {
	p, err := NewProvider(Config{
		Mode:         ModeNone,
		DevUserID:    "dev-user",
		DevUserName:  "Dev User",
		DevUserEmail: "dev@example.com",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	req := httptest.NewRequest("GET", "/companies", nil)
	user, err := p.Resolve(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.ID != "dev-user" || user.Provider != ModeNone {
		t.Fatalf("unexpected user: %+v", user)
	}
}

func TestProviderResolveProxyMode(t *testing.T) {
	p, err := NewProvider(Config{
		Mode:             ModeProxyHeader,
		ProxyUserHeader:  "X-Auth-User",
		ProxyEmailHeader: "X-Auth-Email",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	req := httptest.NewRequest("GET", "/companies", nil)
	req.Header.Set("X-Auth-User", "oidc-user")
	req.Header.Set("X-Auth-Email", "user@example.com")
	req.Header.Set("X-Forwarded-Preferred-Username", "oidc display")

	user, err := p.Resolve(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.ID != "oidc-user" || user.Provider != ModeProxyHeader {
		t.Fatalf("unexpected user: %+v", user)
	}
}

func TestProviderResolveProxyModeUnauthorized(t *testing.T) {
	p, err := NewProvider(Config{Mode: ModeProxyHeader})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	req := httptest.NewRequest("GET", "/companies", nil)
	_, err = p.Resolve(req)
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("expected unauthorized, got %v", err)
	}
}

func TestProviderInvalidMode(t *testing.T) {
	_, err := NewProvider(Config{Mode: "unknown"})
	if !errors.Is(err, ErrInvalidMode) {
		t.Fatalf("expected invalid mode, got %v", err)
	}
}
