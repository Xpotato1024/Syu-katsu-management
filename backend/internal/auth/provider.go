package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const (
	ModeNone        = "none"
	ModeProxyHeader = "proxy_header"
	ModeLocal       = "local"
)

var (
	ErrUnauthorized         = errors.New("unauthorized")
	ErrInvalidMode          = errors.New("invalid auth mode")
	ErrLocalDisabled        = errors.New("local auth is disabled")
	ErrUserAlreadyExists    = errors.New("user already exists")
	ErrInvalidCredentials   = errors.New("invalid credentials")
	ErrRegistrationDisabled = errors.New("registration is disabled")
)

type Config struct {
	Mode              string
	ProxyUserHeader   string
	ProxyEmailHeader  string
	DevUserID         string
	DevUserName       string
	DevUserEmail      string
	LocalUserStore    LocalUserStore
	SessionSecret     string
	SessionCookieName string
	SessionTTL        time.Duration
	CookieSecure      bool
	AllowRegistration bool
}

type User struct {
	ID       string `json:"id"`
	Name     string `json:"name,omitempty"`
	Email    string `json:"email,omitempty"`
	Provider string `json:"provider"`
}

type Provider struct {
	mode              string
	proxyUserHeader   string
	proxyEmailHeader  string
	devUserID         string
	devUserName       string
	devUserEmail      string
	localUserStore    LocalUserStore
	sessionSecret     []byte
	sessionCookieName string
	sessionTTL        time.Duration
	cookieSecure      bool
	allowRegistration bool
}

func NewProvider(cfg Config) (*Provider, error) {
	mode := strings.TrimSpace(cfg.Mode)
	if mode == "" {
		mode = ModeNone
	}
	if mode != ModeNone && mode != ModeProxyHeader && mode != ModeLocal {
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

	cookieName := strings.TrimSpace(cfg.SessionCookieName)
	if cookieName == "" {
		cookieName = "skm_session"
	}
	ttl := cfg.SessionTTL
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}

	var secret []byte
	if mode == ModeLocal {
		if cfg.LocalUserStore == nil {
			return nil, ErrLocalDisabled
		}
		if strings.TrimSpace(cfg.SessionSecret) == "" {
			return nil, errors.New("session secret is required for local auth")
		}
		secret = []byte(cfg.SessionSecret)
	}

	return &Provider{
		mode:              mode,
		proxyUserHeader:   proxyUserHeader,
		proxyEmailHeader:  proxyEmailHeader,
		devUserID:         devUserID,
		devUserName:       devUserName,
		devUserEmail:      strings.TrimSpace(cfg.DevUserEmail),
		localUserStore:    cfg.LocalUserStore,
		sessionSecret:     secret,
		sessionCookieName: cookieName,
		sessionTTL:        ttl,
		cookieSecure:      cfg.CookieSecure,
		allowRegistration: cfg.AllowRegistration,
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
	case ModeLocal:
		sessionToken, err := p.readSessionToken(r)
		if err != nil {
			return User{}, ErrUnauthorized
		}
		userID, err := p.verifySessionToken(sessionToken)
		if err != nil {
			return User{}, ErrUnauthorized
		}
		localUser, err := p.localUserStore.FindUserByID(r.Context(), userID)
		if err != nil {
			return User{}, ErrUnauthorized
		}
		return User{
			ID:       localUser.ID,
			Name:     localUser.Name,
			Email:    localUser.Email,
			Provider: ModeLocal,
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

func (p *Provider) Mode() string {
	return p.mode
}

func (p *Provider) AllowRegistration() bool {
	return p.allowRegistration
}

func (p *Provider) Register(ctx context.Context, id, password, name, email string) (User, string, error) {
	if p.mode != ModeLocal {
		return User{}, "", ErrLocalDisabled
	}
	if !p.allowRegistration {
		return User{}, "", ErrRegistrationDisabled
	}

	normalizedID := strings.TrimSpace(id)
	if normalizedID == "" || strings.TrimSpace(password) == "" {
		return User{}, "", ErrInvalidCredentials
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, "", err
	}
	user, err := p.localUserStore.CreateUser(ctx, localStoredUser{
		ID:           normalizedID,
		Name:         strings.TrimSpace(name),
		Email:        strings.TrimSpace(email),
		PasswordHash: string(passwordHash),
	})
	if err != nil {
		return User{}, "", err
	}
	token, err := p.generateSessionToken(user.ID)
	if err != nil {
		return User{}, "", err
	}
	return user, token, nil
}

func (p *Provider) Login(ctx context.Context, id, password string) (User, string, error) {
	if p.mode != ModeLocal {
		return User{}, "", ErrLocalDisabled
	}
	normalizedID := strings.TrimSpace(id)
	if normalizedID == "" || strings.TrimSpace(password) == "" {
		return User{}, "", ErrInvalidCredentials
	}
	stored, err := p.localUserStore.FindUserByID(ctx, normalizedID)
	if err != nil {
		return User{}, "", ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(stored.PasswordHash), []byte(password)); err != nil {
		return User{}, "", ErrInvalidCredentials
	}

	token, err := p.generateSessionToken(stored.ID)
	if err != nil {
		return User{}, "", err
	}
	return User{
		ID:       stored.ID,
		Name:     stored.Name,
		Email:    stored.Email,
		Provider: ModeLocal,
	}, token, nil
}

func (p *Provider) SessionCookie(token string) *http.Cookie {
	return &http.Cookie{
		Name:     p.sessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   p.cookieSecure,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(p.sessionTTL),
	}
}

func (p *Provider) ClearSessionCookie() *http.Cookie {
	return &http.Cookie{
		Name:     p.sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   p.cookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	}
}

func (p *Provider) readSessionToken(r *http.Request) (string, error) {
	cookie, err := r.Cookie(p.sessionCookieName)
	if err == nil && strings.TrimSpace(cookie.Value) != "" {
		return cookie.Value, nil
	}
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if authHeader == "" {
		return "", ErrUnauthorized
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(authHeader, prefix) {
		return "", ErrUnauthorized
	}
	token := strings.TrimSpace(strings.TrimPrefix(authHeader, prefix))
	if token == "" {
		return "", ErrUnauthorized
	}
	return token, nil
}

func (p *Provider) generateSessionToken(userID string) (string, error) {
	expiry := time.Now().Add(p.sessionTTL).Unix()
	payload := fmt.Sprintf("%s|%d", userID, expiry)
	mac := hmac.New(sha256.New, p.sessionSecret)
	_, err := mac.Write([]byte(payload))
	if err != nil {
		return "", err
	}
	signature := hex.EncodeToString(mac.Sum(nil))
	tokenRaw := fmt.Sprintf("%s|%s", payload, signature)
	return base64.RawURLEncoding.EncodeToString([]byte(tokenRaw)), nil
}

func (p *Provider) verifySessionToken(token string) (string, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return "", err
	}
	parts := strings.Split(string(decoded), "|")
	if len(parts) != 3 {
		return "", ErrUnauthorized
	}
	userID := strings.TrimSpace(parts[0])
	expiryRaw := strings.TrimSpace(parts[1])
	signature := strings.TrimSpace(parts[2])
	if userID == "" || expiryRaw == "" || signature == "" {
		return "", ErrUnauthorized
	}
	var expiry int64
	if _, err := fmt.Sscanf(expiryRaw, "%d", &expiry); err != nil {
		return "", ErrUnauthorized
	}
	if time.Now().Unix() > expiry {
		return "", ErrUnauthorized
	}
	payload := fmt.Sprintf("%s|%d", userID, expiry)
	mac := hmac.New(sha256.New, p.sessionSecret)
	_, err = mac.Write([]byte(payload))
	if err != nil {
		return "", err
	}
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(signature)) {
		return "", ErrUnauthorized
	}
	return userID, nil
}
