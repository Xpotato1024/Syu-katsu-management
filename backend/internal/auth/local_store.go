package auth

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"time"
)

var ErrUserNotFound = errors.New("user not found")

type localStoredUser struct {
	ID           string
	Name         string
	Email        string
	PasswordHash string
}

type LocalUserStore interface {
	CreateUser(ctx context.Context, user localStoredUser) (User, error)
	FindUserByID(ctx context.Context, id string) (localStoredUser, error)
	AutoMigrate(ctx context.Context) error
}

type InMemoryLocalUserStore struct {
	mu    sync.RWMutex
	users map[string]localStoredUser
}

func NewInMemoryLocalUserStore() *InMemoryLocalUserStore {
	return &InMemoryLocalUserStore{users: map[string]localStoredUser{}}
}

func (s *InMemoryLocalUserStore) AutoMigrate(_ context.Context) error {
	return nil
}

func (s *InMemoryLocalUserStore) CreateUser(_ context.Context, user localStoredUser) (User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.users[user.ID]; ok {
		return User{}, ErrUserAlreadyExists
	}
	s.users[user.ID] = user
	return User{
		ID:       user.ID,
		Name:     user.Name,
		Email:    user.Email,
		Provider: ModeLocal,
	}, nil
}

func (s *InMemoryLocalUserStore) FindUserByID(_ context.Context, id string) (localStoredUser, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	user, ok := s.users[id]
	if !ok {
		return localStoredUser{}, ErrUserNotFound
	}
	return user, nil
}

type PostgresLocalUserStore struct {
	db *sql.DB
}

func NewPostgresLocalUserStore(db *sql.DB) *PostgresLocalUserStore {
	return &PostgresLocalUserStore{db: db}
}

func (s *PostgresLocalUserStore) AutoMigrate(ctx context.Context) error {
	_, err := s.db.ExecContext(
		ctx,
		`CREATE TABLE IF NOT EXISTS local_users (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL DEFAULT '',
			email TEXT NOT NULL DEFAULT '',
			password_hash TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
	)
	return err
}

func (s *PostgresLocalUserStore) CreateUser(ctx context.Context, user localStoredUser) (User, error) {
	_, err := s.FindUserByID(ctx, user.ID)
	if err == nil {
		return User{}, ErrUserAlreadyExists
	}
	if err != nil && !errors.Is(err, ErrUserNotFound) {
		return User{}, err
	}

	now := time.Now().UTC()
	_, err = s.db.ExecContext(
		ctx,
		`INSERT INTO local_users (id, name, email, password_hash, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		user.ID,
		user.Name,
		user.Email,
		user.PasswordHash,
		now,
		now,
	)
	if err != nil {
		return User{}, err
	}
	return User{
		ID:       user.ID,
		Name:     user.Name,
		Email:    user.Email,
		Provider: ModeLocal,
	}, nil
}

func (s *PostgresLocalUserStore) FindUserByID(ctx context.Context, id string) (localStoredUser, error) {
	var user localStoredUser
	err := s.db.QueryRowContext(
		ctx,
		`SELECT id, name, email, password_hash FROM local_users WHERE id = $1`,
		id,
	).Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return localStoredUser{}, ErrUserNotFound
		}
		return localStoredUser{}, err
	}
	return user, nil
}
