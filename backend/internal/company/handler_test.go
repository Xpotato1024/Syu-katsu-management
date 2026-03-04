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
