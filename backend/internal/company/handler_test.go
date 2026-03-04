package company

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"syu-katsu-management/backend/internal/auth"
)

func TestCreateAndListCompanies(t *testing.T) {
	repo := NewRepository()
	authProvider, _ := auth.NewProvider(auth.Config{Mode: auth.ModeNone, DevUserID: "test-user"})
	h := NewHandler(repo, authProvider)
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
	if companies[0].SelectionStatus != "選考中" {
		t.Fatalf("unexpected selection status: %s", companies[0].SelectionStatus)
	}
}

func TestListCompaniesWithFilters(t *testing.T) {
	repo := NewRepository()
	authProvider, _ := auth.NewProvider(auth.Config{Mode: auth.ModeNone, DevUserID: "test-user"})
	h := NewHandler(repo, authProvider)
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

func TestCreateCompanyWithSelectionSteps(t *testing.T) {
	repo := NewRepository()
	authProvider, _ := auth.NewProvider(auth.Config{Mode: auth.ModeNone, DevUserID: "test-user"})
	h := NewHandler(repo, authProvider)
	mux := http.NewServeMux()
	h.Register(mux)

	created := mustCreateCompanyAndReturn(t, mux, UpsertInput{
		Name:            "Example Corp",
		SelectionStatus: "進行中",
		SelectionSteps: []SelectionStepInput{
			{Kind: "エントリー", Status: "通過"},
			{Kind: "ES"},
			{Kind: "Webテスト", Status: "予定"},
		},
	})

	if created.SelectionFlow != "エントリー -> ES -> Webテスト" {
		t.Fatalf("unexpected selection flow: %s", created.SelectionFlow)
	}
	if len(created.SelectionSteps) != 3 {
		t.Fatalf("expected 3 steps got %d", len(created.SelectionSteps))
	}
	if created.SelectionSteps[0].ID == "" {
		t.Fatalf("step id should not be empty")
	}
}

func TestAddAndUpdateSelectionStepSchedule(t *testing.T) {
	repo := NewRepository()
	authProvider, _ := auth.NewProvider(auth.Config{Mode: auth.ModeNone, DevUserID: "test-user"})
	h := NewHandler(repo, authProvider)
	mux := http.NewServeMux()
	h.Register(mux)

	created := mustCreateCompanyAndReturn(t, mux, UpsertInput{Name: "OpenAI"})

	addBody, _ := json.Marshal(SelectionStepInput{
		Kind:  "面接",
		Title: "一次面接",
	})
	addReq := httptest.NewRequest(http.MethodPost, "/companies/"+created.ID+"/steps", bytes.NewReader(addBody))
	addRec := httptest.NewRecorder()
	mux.ServeHTTP(addRec, addReq)
	if addRec.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", addRec.Code)
	}

	var afterAdd Company
	if err := json.Unmarshal(addRec.Body.Bytes(), &afterAdd); err != nil {
		t.Fatalf("failed to decode add response: %v", err)
	}
	if len(afterAdd.SelectionSteps) != 1 {
		t.Fatalf("expected 1 step got %d", len(afterAdd.SelectionSteps))
	}

	stepID := afterAdd.SelectionSteps[0].ID
	updateBody, _ := json.Marshal(SelectionStepUpdateInput{
		Status:      ptr("予定"),
		ScheduledAt: ptr("2026-03-20"),
	})
	updateReq := httptest.NewRequest(http.MethodPut, "/companies/"+created.ID+"/steps/"+stepID, bytes.NewReader(updateBody))
	updateRec := httptest.NewRecorder()
	mux.ServeHTTP(updateRec, updateReq)
	if updateRec.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", updateRec.Code)
	}

	var afterUpdate Company
	if err := json.Unmarshal(updateRec.Body.Bytes(), &afterUpdate); err != nil {
		t.Fatalf("failed to decode update response: %v", err)
	}
	step := afterUpdate.SelectionSteps[0]
	if step.Status != "予定" {
		t.Fatalf("unexpected step status: %s", step.Status)
	}
	if step.ScheduledAt == nil {
		t.Fatalf("scheduledAt should not be nil")
	}
	if step.ScheduledAt.Format("2006-01-02") != "2026-03-20" {
		t.Fatalf("unexpected scheduledAt: %s", step.ScheduledAt.Format(time.RFC3339))
	}
}

func TestMeEndpointWithProxyHeaderMode(t *testing.T) {
	repo := NewRepository()
	authProvider, _ := auth.NewProvider(auth.Config{
		Mode:             auth.ModeProxyHeader,
		ProxyUserHeader:  "X-Test-User",
		ProxyEmailHeader: "X-Test-Email",
	})
	h := NewHandler(repo, authProvider)
	mux := http.NewServeMux()
	h.Register(mux)

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.Header.Set("X-Test-User", "authelia-sub")
	req.Header.Set("X-Test-Email", "authelia@example.com")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rec.Code)
	}

	var user map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &user); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if user["id"] != "authelia-sub" {
		t.Fatalf("unexpected user payload: %+v", user)
	}
}

func TestCompaniesAreScopedByUserHeader(t *testing.T) {
	repo := NewRepository()
	authProvider, _ := auth.NewProvider(auth.Config{
		Mode:            auth.ModeProxyHeader,
		ProxyUserHeader: "X-Test-User",
	})
	h := NewHandler(repo, authProvider)
	mux := http.NewServeMux()
	h.Register(mux)

	createForUser(t, mux, "alice", UpsertInput{Name: "Alice Corp"})
	createForUser(t, mux, "bob", UpsertInput{Name: "Bob Corp"})

	aliceCompanies := mustListCompaniesForUser(t, mux, "alice", "/companies")
	if len(aliceCompanies) != 1 || aliceCompanies[0].Name != "Alice Corp" {
		t.Fatalf("unexpected alice companies: %+v", aliceCompanies)
	}

	bobCompanies := mustListCompaniesForUser(t, mux, "bob", "/companies")
	if len(bobCompanies) != 1 || bobCompanies[0].Name != "Bob Corp" {
		t.Fatalf("unexpected bob companies: %+v", bobCompanies)
	}
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

func mustCreateCompanyAndReturn(t *testing.T, mux *http.ServeMux, input UpsertInput) Company {
	t.Helper()

	body, _ := json.Marshal(input)
	req := httptest.NewRequest(http.MethodPost, "/companies", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 got %d", rec.Code)
	}

	var company Company
	if err := json.Unmarshal(rec.Body.Bytes(), &company); err != nil {
		t.Fatalf("failed to decode create response: %v", err)
	}
	return company
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

func ptr(v string) *string {
	return &v
}

func createForUser(t *testing.T, mux *http.ServeMux, userID string, input UpsertInput) {
	t.Helper()

	body, _ := json.Marshal(input)
	req := httptest.NewRequest(http.MethodPost, "/companies", bytes.NewReader(body))
	req.Header.Set("X-Test-User", userID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 got %d", rec.Code)
	}
}

func mustListCompaniesForUser(t *testing.T, mux *http.ServeMux, userID, path string) []Company {
	t.Helper()

	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("X-Test-User", userID)
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
