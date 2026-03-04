package auth

import (
	"errors"
	"net/http"
	"strings"
)

const (
	ModeNone        = "none"
	ModeProxyHeader = "proxy_header"
)

var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrInvalidMode  = errors.New("invalid auth mode")
)

type Config struct {
	Mode             string
	ProxyUserHeader  string
	ProxyEmailHeader string
	DevUserID        string
	DevUserName      string
	DevUserEmail     string
}

type User struct {
	ID       string `json:"id"`
	Name     string `json:"name,omitempty"`
	Email    string `json:"email,omitempty"`
	Provider string `json:"provider"`
}

type Provider struct {
	mode             string
	proxyUserHeader  string
	proxyEmailHeader string
	devUserID        string
	devUserName      string
	devUserEmail     string
}

func NewProvider(cfg Config) (*Provider, error) {
	mode := strings.TrimSpace(cfg.Mode)
	if mode == "" {
		mode = ModeNone
	}
	if mode != ModeNone && mode != ModeProxyHeader {
		return nil, ErrInvalidMode
	}

	proxyUserHeader := strings.TrimSpace(cfg.ProxyUserHeader)
	if proxyUserHeader == "" {
		proxyUserHeader = "X-Forwarded-User"
	}
	proxyEmailHeader := strings.TrimSpace(cfg.ProxyEmailHeader)
	if proxyEmailHeader == "" {
		proxyEmailHeader = "X-Forwarded-Email"
	}

	devUserID := strings.TrimSpace(cfg.DevUserID)
	if devUserID == "" {
		devUserID = "local-dev"
	}
	devUserName := strings.TrimSpace(cfg.DevUserName)
	if devUserName == "" {
		devUserName = devUserID
	}

	return &Provider{
		mode:             mode,
		proxyUserHeader:  proxyUserHeader,
		proxyEmailHeader: proxyEmailHeader,
		devUserID:        devUserID,
		devUserName:      devUserName,
		devUserEmail:     strings.TrimSpace(cfg.DevUserEmail),
	}, nil
}

func (p *Provider) Resolve(r *http.Request) (User, error) {
	switch p.mode {
	case ModeNone:
		return User{
			ID:       p.devUserID,
			Name:     p.devUserName,
			Email:    p.devUserEmail,
			Provider: ModeNone,
		}, nil
	case ModeProxyHeader:
		id := cleanHeaderValue(r.Header.Get(p.proxyUserHeader))
		if id == "" {
			return User{}, ErrUnauthorized
		}

		name := cleanHeaderValue(r.Header.Get("X-Forwarded-Preferred-Username"))
		if name == "" {
			name = id
		}

		return User{
			ID:       id,
			Name:     name,
			Email:    cleanHeaderValue(r.Header.Get(p.proxyEmailHeader)),
			Provider: ModeProxyHeader,
		}, nil
	default:
		return User{}, ErrInvalidMode
	}
}

func cleanHeaderValue(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	parts := strings.Split(trimmed, ",")
	return strings.TrimSpace(parts[0])
}
