package company

import (
	"errors"
	"sort"
	"strings"
	"sync"
	"time"
)

var ErrNotFound = errors.New("company not found")

type Repository struct {
	mu    sync.RWMutex
	items map[string]Company
}

type ListFilter struct {
	Query           string
	SelectionStatus string
}

func NewRepository() *Repository {
	return &Repository{items: map[string]Company{}}
}

func (r *Repository) List(filter ListFilter) []Company {
	r.mu.RLock()
	defer r.mu.RUnlock()

	companies := make([]Company, 0, len(r.items))
	query := strings.ToLower(strings.TrimSpace(filter.Query))
	status := strings.TrimSpace(filter.SelectionStatus)

	for _, c := range r.items {
		if query != "" && !strings.Contains(strings.ToLower(c.Name), query) {
			continue
		}
		if status != "" && c.SelectionStatus != status {
			continue
		}
		companies = append(companies, c)
	}
	sort.Slice(companies, func(i, j int) bool {
		return companies[i].UpdatedAt.After(companies[j].UpdatedAt)
	})
	return companies
}

func (r *Repository) GetByID(id string) (Company, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	c, ok := r.items[id]
	if !ok {
		return Company{}, ErrNotFound
	}
	return c, nil
}

func (r *Repository) Create(c Company) Company {
	now := time.Now().UTC()
	c.CreatedAt = now
	c.UpdatedAt = now

	r.mu.Lock()
	defer r.mu.Unlock()
	r.items[c.ID] = c
	return c
}

func (r *Repository) Update(id string, input UpsertInput) (Company, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.items[id]
	if !ok {
		return Company{}, ErrNotFound
	}

	existing.Name = input.Name
	existing.MypageLink = input.MypageLink
	existing.MypageID = input.MypageID
	existing.SelectionFlow = input.SelectionFlow
	existing.SelectionStatus = input.SelectionStatus
	existing.ESContent = input.ESContent
	existing.ResearchContent = input.ResearchContent
	existing.UpdatedAt = time.Now().UTC()

	r.items[id] = existing
	return existing, nil
}

func (r *Repository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.items[id]; !ok {
		return ErrNotFound
	}
	delete(r.items, id)
	return nil
}
