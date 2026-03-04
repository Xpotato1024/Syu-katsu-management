package company

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/health", h.health)
	mux.HandleFunc("/companies", h.companies)
	mux.HandleFunc("/companies/", h.companyByID)
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) companies(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, h.repo.List(ListFilter{
			Query:           strings.TrimSpace(r.URL.Query().Get("q")),
			SelectionStatus: strings.TrimSpace(r.URL.Query().Get("status")),
		}))
	case http.MethodPost:
		var input UpsertInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil || strings.TrimSpace(input.Name) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
			return
		}

		created, err := h.repo.Create(input)
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
		h.handleCompanyResource(w, r, companyID)
	case len(parts) == 2 && parts[1] == "steps":
		h.handleAddStep(w, r, companyID)
	case len(parts) == 3 && parts[1] == "steps":
		h.handleUpdateStep(w, r, companyID, parts[2])
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid path"})
	}
}

func (h *Handler) handleCompanyResource(w http.ResponseWriter, r *http.Request, id string) {
	switch r.Method {
	case http.MethodGet:
		company, err := h.repo.GetByID(id)
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
		updated, err := h.repo.Update(id, input)
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
		err := h.repo.Delete(id)
		if err == ErrNotFound {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *Handler) handleAddStep(w http.ResponseWriter, r *http.Request, companyID string) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var input SelectionStepInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	updated, err := h.repo.AddStep(companyID, input)
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

func (h *Handler) handleUpdateStep(w http.ResponseWriter, r *http.Request, companyID, stepID string) {
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

	updated, err := h.repo.UpdateStep(companyID, stepID, input)
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

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
