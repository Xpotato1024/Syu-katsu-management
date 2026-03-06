package company

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	DefaultCompanyStatus = "未着手"
)

var (
	ErrNotFound     = errors.New("company not found")
	ErrStepNotFound = errors.New("selection step not found")
	ErrInvalidInput = errors.New("invalid input")
)

type Repository struct {
	mu          sync.RWMutex
	itemsByUser map[string]map[string]Company
}

type ListFilter struct {
	Query           string
	SelectionStatus string
}

func NewRepository() *Repository {
	return &Repository{itemsByUser: map[string]map[string]Company{}}
}

func (r *Repository) List(userID string, filter ListFilter) []Company {
	r.mu.RLock()
	defer r.mu.RUnlock()

	userItems := r.itemsByUser[userID]
	companies := make([]Company, 0, len(userItems))
	query := strings.ToLower(strings.TrimSpace(filter.Query))
	status := normalizeCompanyStatusFilter(filter.SelectionStatus)

	for _, c := range userItems {
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

func (r *Repository) GetByID(userID, id string) (Company, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	c, ok := r.itemsByUser[userID][id]
	if !ok {
		return Company{}, ErrNotFound
	}
	return c, nil
}

func (r *Repository) Create(userID string, input UpsertInput) (Company, error) {
	if strings.TrimSpace(userID) == "" {
		return Company{}, invalidInput("user id is required")
	}

	selectionStatus, err := normalizeCompanyStatus(input.SelectionStatus)
	if err != nil {
		return Company{}, err
	}
	steps, err := buildSelectionSteps(input.SelectionSteps)
	if err != nil {
		return Company{}, err
	}

	selectionFlow := strings.TrimSpace(input.SelectionFlow)
	if len(steps) > 0 {
		selectionFlow = composeSelectionFlow(steps)
	}

	now := time.Now().UTC()
	c := Company{
		ID:              newEntityID(),
		Name:            strings.TrimSpace(input.Name),
		MypageLink:      strings.TrimSpace(input.MypageLink),
		MypageID:        strings.TrimSpace(input.MypageID),
		SelectionFlow:   selectionFlow,
		SelectionStatus: selectionStatus,
		SelectionSteps:  steps,
		ESContent:       input.ESContent,
		ResearchContent: input.ResearchContent,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	r.ensureUserStore(userID)[c.ID] = c
	return c, nil
}

func (r *Repository) Update(userID, id string, input UpsertInput) (Company, error) {
	if strings.TrimSpace(userID) == "" {
		return Company{}, invalidInput("user id is required")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	userItems := r.ensureUserStore(userID)
	existing, ok := userItems[id]
	if !ok {
		return Company{}, ErrNotFound
	}

	status := existing.SelectionStatus
	var err error
	if strings.TrimSpace(input.SelectionStatus) != "" {
		status, err = normalizeCompanyStatus(input.SelectionStatus)
		if err != nil {
			return Company{}, err
		}
	} else if status == "" {
		status = DefaultCompanyStatus
	}

	existing.Name = strings.TrimSpace(input.Name)
	existing.MypageLink = strings.TrimSpace(input.MypageLink)
	existing.MypageID = strings.TrimSpace(input.MypageID)
	existing.SelectionStatus = status
	existing.ESContent = input.ESContent
	existing.ResearchContent = input.ResearchContent

	selectionFlow := strings.TrimSpace(input.SelectionFlow)
	if input.SelectionSteps != nil {
		steps, err := buildSelectionSteps(input.SelectionSteps)
		if err != nil {
			return Company{}, err
		}
		existing.SelectionSteps = steps
		existing.SelectionFlow = composeSelectionFlow(steps)
	} else if selectionFlow != "" || len(existing.SelectionSteps) == 0 {
		existing.SelectionFlow = selectionFlow
	}

	if len(existing.SelectionSteps) > 0 {
		existing.SelectionFlow = composeSelectionFlow(existing.SelectionSteps)
	}

	existing.UpdatedAt = time.Now().UTC()

	userItems[id] = existing
	return existing, nil
}

func (r *Repository) AddStep(userID, companyID string, input SelectionStepInput) (Company, error) {
	if strings.TrimSpace(userID) == "" {
		return Company{}, invalidInput("user id is required")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	userItems := r.ensureUserStore(userID)
	existing, ok := userItems[companyID]
	if !ok {
		return Company{}, ErrNotFound
	}

	step, err := buildSelectionStep(input)
	if err != nil {
		return Company{}, err
	}

	existing.SelectionSteps = append(existing.SelectionSteps, step)
	existing.SelectionFlow = composeSelectionFlow(existing.SelectionSteps)
	existing.UpdatedAt = time.Now().UTC()

	userItems[companyID] = existing
	return existing, nil
}

func (r *Repository) UpdateStep(userID, companyID, stepID string, input SelectionStepUpdateInput) (Company, error) {
	if strings.TrimSpace(userID) == "" {
		return Company{}, invalidInput("user id is required")
	}

	if input.Status == nil && input.ScheduledAt == nil && input.Note == nil {
		return Company{}, fmt.Errorf("%w: status or scheduledAt or note is required", ErrInvalidInput)
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	userItems := r.ensureUserStore(userID)
	existing, ok := userItems[companyID]
	if !ok {
		return Company{}, ErrNotFound
	}

	index := -1
	for i, step := range existing.SelectionSteps {
		if step.ID == stepID {
			index = i
			break
		}
	}
	if index == -1 {
		return Company{}, ErrStepNotFound
	}

	step := existing.SelectionSteps[index]
	if input.Status != nil {
		normalizedStatus, err := normalizeSelectionStepStatus(*input.Status)
		if err != nil {
			return Company{}, err
		}
		step.Status = normalizedStatus
	}
	if input.ScheduledAt != nil {
		scheduledAt, err := parseScheduledAt(*input.ScheduledAt)
		if err != nil {
			return Company{}, err
		}
		step.ScheduledAt = scheduledAt
	}
	if input.Note != nil {
		step.Note = strings.TrimSpace(*input.Note)
	}

	existing.SelectionSteps[index] = step
	existing.SelectionFlow = composeSelectionFlow(existing.SelectionSteps)
	existing.UpdatedAt = time.Now().UTC()

	userItems[companyID] = existing
	return existing, nil
}

func (r *Repository) DeleteStep(userID, companyID, stepID string) (Company, error) {
	if strings.TrimSpace(userID) == "" {
		return Company{}, invalidInput("user id is required")
	}
	if strings.TrimSpace(stepID) == "" {
		return Company{}, invalidInput("step id is required")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	userItems := r.ensureUserStore(userID)
	existing, ok := userItems[companyID]
	if !ok {
		return Company{}, ErrNotFound
	}

	index := -1
	for i, step := range existing.SelectionSteps {
		if step.ID == stepID {
			index = i
			break
		}
	}
	if index == -1 {
		return Company{}, ErrStepNotFound
	}

	existing.SelectionSteps = append(existing.SelectionSteps[:index], existing.SelectionSteps[index+1:]...)
	existing.SelectionFlow = composeSelectionFlow(existing.SelectionSteps)
	existing.UpdatedAt = time.Now().UTC()

	userItems[companyID] = existing
	return existing, nil
}

func (r *Repository) Delete(userID, id string) error {
	if strings.TrimSpace(userID) == "" {
		return invalidInput("user id is required")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	userItems := r.ensureUserStore(userID)
	if _, ok := userItems[id]; !ok {
		return ErrNotFound
	}
	delete(userItems, id)
	return nil
}

func (r *Repository) ensureUserStore(userID string) map[string]Company {
	store, ok := r.itemsByUser[userID]
	if !ok {
		store = map[string]Company{}
		r.itemsByUser[userID] = store
	}
	return store
}

func newEntityID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return time.Now().UTC().Format("20060102150405000")
	}
	return hex.EncodeToString(b)
}

func invalidInput(message string) error {
	return fmt.Errorf("%w: %s", ErrInvalidInput, message)
}

func normalizeCompanyStatus(raw string) (string, error) {
	candidate := strings.TrimSpace(raw)
	if candidate == "" {
		return DefaultCompanyStatus, nil
	}

	aliases := map[string]string{
		"進行中": "選考中",
		"不合格": "お見送り",
		"完了":  "内定",
	}
	if normalized, ok := aliases[candidate]; ok {
		candidate = normalized
	}

	allowed := map[string]struct{}{
		"未着手":  {},
		"選考中":  {},
		"内定":   {},
		"お見送り": {},
		"辞退":   {},
	}
	if _, ok := allowed[candidate]; !ok {
		return "", invalidInput("selectionStatus is invalid")
	}
	return candidate, nil
}

func normalizeCompanyStatusFilter(raw string) string {
	candidate := strings.TrimSpace(raw)
	if candidate == "" {
		return ""
	}
	normalized, err := normalizeCompanyStatus(candidate)
	if err != nil {
		return candidate
	}
	return normalized
}

func normalizeSelectionStepKind(raw string) (string, error) {
	candidate := strings.TrimSpace(raw)
	if candidate == "" {
		return "", invalidInput("selection step kind is required")
	}
	allowed := map[string]struct{}{
		"エントリー":  {},
		"ES":     {},
		"Webテスト": {},
		"GD":     {},
		"面接":     {},
		"面談":     {},
		"説明会":    {},
		"その他":    {},
	}
	if _, ok := allowed[candidate]; !ok {
		return "", invalidInput("selection step kind is invalid")
	}
	return candidate, nil
}

func normalizeSelectionStepStatus(raw string) (string, error) {
	candidate := strings.TrimSpace(raw)
	if candidate == "" {
		return "未着手", nil
	}
	aliases := map[string]string{
		"予定確定": "予定",
		"受験済み": "実施済",
	}
	if normalized, ok := aliases[candidate]; ok {
		candidate = normalized
	}
	allowed := map[string]struct{}{
		"未着手": {},
		"予定":  {},
		"実施済": {},
		"通過":  {},
		"不通過": {},
		"辞退":  {},
	}
	if _, ok := allowed[candidate]; !ok {
		return "", invalidInput("selection step status is invalid")
	}
	return candidate, nil
}

func parseScheduledAt(raw string) (*time.Time, error) {
	candidate := strings.TrimSpace(raw)
	if candidate == "" {
		return nil, nil
	}

	layouts := []string{
		time.RFC3339,
		"2006-01-02",
		"2006-01-02T15:04",
	}
	for _, layout := range layouts {
		t, err := time.Parse(layout, candidate)
		if err == nil {
			utc := t.UTC()
			return &utc, nil
		}
	}
	return nil, invalidInput("scheduledAt must be RFC3339, YYYY-MM-DD, or YYYY-MM-DDTHH:MM")
}

func buildSelectionSteps(inputs []SelectionStepInput) ([]SelectionStep, error) {
	if len(inputs) == 0 {
		return []SelectionStep{}, nil
	}

	steps := make([]SelectionStep, 0, len(inputs))
	for _, input := range inputs {
		step, err := buildSelectionStep(input)
		if err != nil {
			return nil, err
		}
		steps = append(steps, step)
	}
	return steps, nil
}

func buildSelectionStep(input SelectionStepInput) (SelectionStep, error) {
	kind, err := normalizeSelectionStepKind(input.Kind)
	if err != nil {
		return SelectionStep{}, err
	}
	status, err := normalizeSelectionStepStatus(input.Status)
	if err != nil {
		return SelectionStep{}, err
	}
	scheduledAt, err := parseScheduledAt(input.ScheduledAt)
	if err != nil {
		return SelectionStep{}, err
	}

	title := strings.TrimSpace(input.Title)
	if title == "" {
		title = kind
	}

	return SelectionStep{
		ID:          newEntityID(),
		Kind:        kind,
		Title:       title,
		Status:      status,
		ScheduledAt: scheduledAt,
		Note:        strings.TrimSpace(input.Note),
	}, nil
}

func composeSelectionFlow(steps []SelectionStep) string {
	if len(steps) == 0 {
		return ""
	}

	labels := make([]string, 0, len(steps))
	for _, step := range steps {
		label := strings.TrimSpace(step.Title)
		if label == "" {
			label = step.Kind
		}
		labels = append(labels, label)
	}
	return strings.Join(labels, " -> ")
}
