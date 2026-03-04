package company

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCreateAndListCompanies(t *testing.T) {
	repo := NewRepository()
	h := NewHandler(repo)
	mux := http.NewServeMux()
	h.Register(mux)

	body, _ := json.Marshal(UpsertInput{Name: "OpenAI", SelectionStatus: "進行中"})
	createReq := httptest.NewRequest(http.MethodPost, "/companies", bytes.NewReader(body))
	createRec := httptest.NewRecorder()
	mux.ServeHTTP(createRec, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 got %d", createRec.Code)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/companies", nil)
	listRec := httptest.NewRecorder()
	mux.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", listRec.Code)
	}

	var companies []Company
	if err := json.Unmarshal(listRec.Body.Bytes(), &companies); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if len(companies) != 1 || companies[0].Name != "OpenAI" {
		t.Fatalf("unexpected companies response: %+v", companies)
	}
}

func TestListCompaniesWithFilters(t *testing.T) {
	repo := NewRepository()
	h := NewHandler(repo)
	mux := http.NewServeMux()
	h.Register(mux)

	mustCreateCompany(t, mux, UpsertInput{Name: "OpenAI", SelectionStatus: "進行中"})
	mustCreateCompany(t, mux, UpsertInput{Name: "SmartHR", SelectionStatus: "未着手"})
	mustCreateCompany(t, mux, UpsertInput{Name: "OpenWork", SelectionStatus: "進行中"})

	t.Run("filter by query", func(t *testing.T) {
		companies := mustListCompanies(t, mux, "/companies?q=open")
		if len(companies) != 2 {
			t.Fatalf("expected 2 companies got %d", len(companies))
		}
	})

	t.Run("filter by status", func(t *testing.T) {
		companies := mustListCompanies(t, mux, "/companies?status=未着手")
		if len(companies) != 1 || companies[0].Name != "SmartHR" {
			t.Fatalf("unexpected response: %+v", companies)
		}
	})

	t.Run("filter by query and status", func(t *testing.T) {
		companies := mustListCompanies(t, mux, "/companies?q=open&status=進行中")
		if len(companies) != 2 {
			t.Fatalf("expected 2 companies got %d", len(companies))
		}
	})
}

func mustCreateCompany(t *testing.T, mux *http.ServeMux, input UpsertInput) {
	t.Helper()

	body, _ := json.Marshal(input)
	req := httptest.NewRequest(http.MethodPost, "/companies", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 got %d", rec.Code)
	}
}

func mustListCompanies(t *testing.T, mux *http.ServeMux, path string) []Company {
	t.Helper()

	req := httptest.NewRequest(http.MethodGet, path, nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rec.Code)
	}

	var companies []Company
	if err := json.Unmarshal(rec.Body.Bytes(), &companies); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	return companies
}
