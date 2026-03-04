package company

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"syu-katsu-management/backend/internal/auth"
)

type Handler struct {
	repo         Store
	authProvider *auth.Provider
}

func NewHandler(repo Store, authProvider *auth.Provider) *Handler {
	return &Handler{repo: repo, authProvider: authProvider}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/health", h.health)
	mux.HandleFunc("/me", h.me)
	mux.HandleFunc("/companies", h.companies)
	mux.HandleFunc("/companies/", h.companyByID)
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	user, ok := h.resolveUser(w, r)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *Handler) companies(w http.ResponseWriter, r *http.Request) {
	user, ok := h.resolveUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, h.repo.List(user.ID, ListFilter{
			Query:           strings.TrimSpace(r.URL.Query().Get("q")),
			SelectionStatus: strings.TrimSpace(r.URL.Query().Get("status")),
		}))
	case http.MethodPost:
		var input UpsertInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil || strings.TrimSpace(input.Name) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}

		created, err := h.repo.Create(user.ID, input)
		if err != nil {
			if errors.Is(err, ErrInvalidInput) {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create company"})
			return
		}
		writeJSON(w, http.StatusCreated, created)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *Handler) companyByID(w http.ResponseWriter, r *http.Request) {
	user, ok := h.resolveUser(w, r)
	if !ok {
		return
	}

	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/companies/"), "/")
	if path == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}
	parts := strings.Split(path, "/")
	companyID := parts[0]
	if companyID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}

	switch {
	case len(parts) == 1:
		h.handleCompanyResource(w, r, user.ID, companyID)
	case len(parts) == 2 && parts[1] == "steps":
		h.handleAddStep(w, r, user.ID, companyID)
	case len(parts) == 3 && parts[1] == "steps":
		h.handleUpdateStep(w, r, user.ID, companyID, parts[2])
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid path"})
	}
}

func (h *Handler) handleCompanyResource(w http.ResponseWriter, r *http.Request, userID, id string) {
	switch r.Method {
	case http.MethodGet:
		company, err := h.repo.GetByID(userID, id)
		if err == ErrNotFound {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, company)
	case http.MethodPut:
		var input UpsertInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil || strings.TrimSpace(input.Name) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}
		updated, err := h.repo.Update(userID, id, input)
		if errors.Is(err, ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		if errors.Is(err, ErrInvalidInput) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, updated)
	case http.MethodDelete:
		err := h.repo.Delete(userID, id)
		if err == ErrNotFound {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *Handler) handleAddStep(w http.ResponseWriter, r *http.Request, userID, companyID string) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var input SelectionStepInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	updated, err := h.repo.AddStep(userID, companyID, input)
	if errors.Is(err, ErrNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}
	if errors.Is(err, ErrInvalidInput) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to add step"})
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *Handler) handleUpdateStep(w http.ResponseWriter, r *http.Request, userID, companyID, stepID string) {
	if r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if strings.TrimSpace(stepID) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "step id is required"})
		return
	}

	var input SelectionStepUpdateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	updated, err := h.repo.UpdateStep(userID, companyID, stepID, input)
	if errors.Is(err, ErrNotFound) || errors.Is(err, ErrStepNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}
	if errors.Is(err, ErrInvalidInput) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update step"})
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *Handler) resolveUser(w http.ResponseWriter, r *http.Request) (auth.User, bool) {
	if h.authProvider == nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "auth provider is not configured"})
		return auth.User{}, false
	}

	user, err := h.authProvider.Resolve(r)
	if err != nil {
		if errors.Is(err, auth.ErrUnauthorized) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "authentication required"})
			return auth.User{}, false
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to resolve user"})
		return auth.User{}, false
	}
	return user, true
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
