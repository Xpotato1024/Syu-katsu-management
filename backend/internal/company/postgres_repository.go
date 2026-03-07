package company

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const queryTimeout = 5 * time.Second

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) AutoMigrate(ctx context.Context) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS companies (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			name TEXT NOT NULL,
			mypage_link TEXT NOT NULL DEFAULT '',
			mypage_id TEXT NOT NULL DEFAULT '',
			interest_level TEXT NOT NULL DEFAULT '未設定',
			selection_flow TEXT NOT NULL DEFAULT '',
			selection_status TEXT NOT NULL DEFAULT '',
			es_content TEXT NOT NULL DEFAULT '',
			research_content TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE INDEX IF NOT EXISTS idx_companies_user_updated ON companies (user_id, updated_at DESC);`,
		`CREATE TABLE IF NOT EXISTS selection_steps (
			id TEXT PRIMARY KEY,
			company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
			kind TEXT NOT NULL,
			title TEXT NOT NULL,
			status TEXT NOT NULL,
			scheduled_at TIMESTAMPTZ NULL,
			duration_minutes INTEGER NOT NULL DEFAULT 0,
			note TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,
		`CREATE INDEX IF NOT EXISTS idx_selection_steps_company_created ON selection_steps (company_id, created_at ASC);`,
		`ALTER TABLE companies ADD COLUMN IF NOT EXISTS interest_level TEXT NOT NULL DEFAULT '未設定';`,
		`ALTER TABLE selection_steps ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 0;`,
		`ALTER TABLE selection_steps ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';`,
	}

	for _, stmt := range statements {
		if _, err := r.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

func (r *PostgresRepository) List(userID string, filter ListFilter) []Company {
	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	query := `SELECT id, name, mypage_link, mypage_id, interest_level, selection_flow, selection_status, es_content, research_content, created_at, updated_at
		FROM companies WHERE user_id = $1`
	args := []any{userID}
	argIndex := 2

	search := strings.TrimSpace(filter.Query)
	if search != "" {
		query += fmt.Sprintf(" AND LOWER(name) LIKE LOWER($%d)", argIndex)
		args = append(args, "%"+search+"%")
		argIndex++
	}

	status := normalizeCompanyStatusFilter(filter.SelectionStatus)
	if status != "" {
		query += fmt.Sprintf(" AND selection_status = $%d", argIndex)
		args = append(args, status)
		argIndex++
	}

	query += " ORDER BY updated_at DESC"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return []Company{}
	}
	defer rows.Close()

	companies := []Company{}
	for rows.Next() {
		var company Company
		if err := rows.Scan(
			&company.ID,
			&company.Name,
			&company.MypageLink,
			&company.MypageID,
			&company.InterestLevel,
			&company.SelectionFlow,
			&company.SelectionStatus,
			&company.ESContent,
			&company.ResearchContent,
			&company.CreatedAt,
			&company.UpdatedAt,
		); err != nil {
			continue
		}
		steps, err := r.listSteps(ctx, company.ID)
		if err != nil {
			continue
		}
		company.SelectionSteps = steps
		companies = append(companies, company)
	}
	return companies
}

func (r *PostgresRepository) GetByID(userID, id string) (Company, error) {
	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	var company Company
	err := r.db.QueryRowContext(
		ctx,
		`SELECT id, name, mypage_link, mypage_id, interest_level, selection_flow, selection_status, es_content, research_content, created_at, updated_at
		FROM companies WHERE user_id = $1 AND id = $2`,
		userID,
		id,
	).Scan(
		&company.ID,
		&company.Name,
		&company.MypageLink,
		&company.MypageID,
		&company.InterestLevel,
		&company.SelectionFlow,
		&company.SelectionStatus,
		&company.ESContent,
		&company.ResearchContent,
		&company.CreatedAt,
		&company.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Company{}, ErrNotFound
		}
		return Company{}, err
	}

	steps, err := r.listSteps(ctx, company.ID)
	if err != nil {
		return Company{}, err
	}
	company.SelectionSteps = steps
	return company, nil
}

func (r *PostgresRepository) Create(userID string, input UpsertInput) (Company, error) {
	if strings.TrimSpace(userID) == "" {
		return Company{}, invalidInput("user id is required")
	}

	selectionStatus, err := normalizeCompanyStatus(input.SelectionStatus)
	if err != nil {
		return Company{}, err
	}
	interestLevel, err := normalizeInterestLevel(input.InterestLevel)
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
	company := Company{
		ID:              newEntityID(),
		Name:            strings.TrimSpace(input.Name),
		MypageLink:      strings.TrimSpace(input.MypageLink),
		MypageID:        strings.TrimSpace(input.MypageID),
		InterestLevel:   interestLevel,
		SelectionFlow:   selectionFlow,
		SelectionStatus: selectionStatus,
		SelectionSteps:  steps,
		ESContent:       input.ESContent,
		ResearchContent: input.ResearchContent,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Company{}, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO companies (id, user_id, name, mypage_link, mypage_id, interest_level, selection_flow, selection_status, es_content, research_content, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		company.ID,
		userID,
		company.Name,
		company.MypageLink,
		company.MypageID,
		company.InterestLevel,
		company.SelectionFlow,
		company.SelectionStatus,
		company.ESContent,
		company.ResearchContent,
		company.CreatedAt,
		company.UpdatedAt,
	); err != nil {
		return Company{}, err
	}

	if err := insertSteps(ctx, tx, company.ID, company.SelectionSteps); err != nil {
		return Company{}, err
	}

	if err := tx.Commit(); err != nil {
		return Company{}, err
	}
	return company, nil
}

func (r *PostgresRepository) Update(userID, id string, input UpsertInput) (Company, error) {
	if strings.TrimSpace(userID) == "" {
		return Company{}, invalidInput("user id is required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Company{}, err
	}
	defer tx.Rollback()

	existing, err := getCompanyForUpdate(ctx, tx, userID, id)
	if err != nil {
		return Company{}, err
	}

	status := existing.SelectionStatus
	if strings.TrimSpace(input.SelectionStatus) != "" {
		status, err = normalizeCompanyStatus(input.SelectionStatus)
		if err != nil {
			return Company{}, err
		}
	} else if status == "" {
		status = DefaultCompanyStatus
	}

	interestLevel := existing.InterestLevel
	if strings.TrimSpace(input.InterestLevel) != "" {
		interestLevel, err = normalizeInterestLevel(input.InterestLevel)
		if err != nil {
			return Company{}, err
		}
	} else if interestLevel == "" {
		interestLevel = DefaultInterestLevel
	}

	existing.Name = strings.TrimSpace(input.Name)
	existing.MypageLink = strings.TrimSpace(input.MypageLink)
	existing.MypageID = strings.TrimSpace(input.MypageID)
	existing.InterestLevel = interestLevel
	existing.SelectionStatus = status
	existing.ESContent = input.ESContent
	existing.ResearchContent = input.ResearchContent
	existing.UpdatedAt = time.Now().UTC()

	if input.SelectionSteps != nil {
		steps, err := buildSelectionSteps(input.SelectionSteps)
		if err != nil {
			return Company{}, err
		}
		existing.SelectionSteps = steps
	} else {
		existing.SelectionSteps, err = listStepsTx(ctx, tx, existing.ID)
		if err != nil {
			return Company{}, err
		}
	}

	selectionFlow := strings.TrimSpace(input.SelectionFlow)
	if len(existing.SelectionSteps) > 0 {
		selectionFlow = composeSelectionFlow(existing.SelectionSteps)
	}
	existing.SelectionFlow = selectionFlow

	if _, err := tx.ExecContext(
		ctx,
		`UPDATE companies SET name=$1, mypage_link=$2, mypage_id=$3, interest_level=$4, selection_flow=$5, selection_status=$6, es_content=$7, research_content=$8, updated_at=$9
		WHERE user_id = $10 AND id = $11`,
		existing.Name,
		existing.MypageLink,
		existing.MypageID,
		existing.InterestLevel,
		existing.SelectionFlow,
		existing.SelectionStatus,
		existing.ESContent,
		existing.ResearchContent,
		existing.UpdatedAt,
		userID,
		id,
	); err != nil {
		return Company{}, err
	}

	if input.SelectionSteps != nil {
		if _, err := tx.ExecContext(ctx, `DELETE FROM selection_steps WHERE company_id = $1`, existing.ID); err != nil {
			return Company{}, err
		}
		if err := insertSteps(ctx, tx, existing.ID, existing.SelectionSteps); err != nil {
			return Company{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return Company{}, err
	}
	return existing, nil
}

func (r *PostgresRepository) AddStep(userID, companyID string, input SelectionStepInput) (Company, error) {
	if strings.TrimSpace(userID) == "" {
		return Company{}, invalidInput("user id is required")
	}

	step, err := buildSelectionStep(input)
	if err != nil {
		return Company{}, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Company{}, err
	}
	defer tx.Rollback()

	company, err := getCompanyForUpdate(ctx, tx, userID, companyID)
	if err != nil {
		return Company{}, err
	}

	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO selection_steps (id, company_id, kind, title, status, scheduled_at, duration_minutes, note, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		step.ID,
		company.ID,
		step.Kind,
		step.Title,
		step.Status,
		step.ScheduledAt,
		step.DurationMinutes,
		step.Note,
		time.Now().UTC(),
		time.Now().UTC(),
	); err != nil {
		return Company{}, err
	}

	updatedSteps, err := listStepsTx(ctx, tx, company.ID)
	if err != nil {
		return Company{}, err
	}
	company.SelectionSteps = updatedSteps
	company.SelectionFlow = composeSelectionFlow(updatedSteps)
	company.UpdatedAt = time.Now().UTC()

	if _, err := tx.ExecContext(
		ctx,
		`UPDATE companies SET selection_flow=$1, updated_at=$2 WHERE user_id=$3 AND id=$4`,
		company.SelectionFlow,
		company.UpdatedAt,
		userID,
		companyID,
	); err != nil {
		return Company{}, err
	}

	if err := tx.Commit(); err != nil {
		return Company{}, err
	}
	return company, nil
}

func (r *PostgresRepository) UpdateStep(userID, companyID, stepID string, input SelectionStepUpdateInput) (Company, error) {
	return r.UpdateSteps(userID, companyID, []SelectionStepBulkUpdateItem{
		{
			ID:              stepID,
			Title:           input.Title,
			Status:          input.Status,
			ScheduledAt:     input.ScheduledAt,
			DurationMinutes: input.DurationMinutes,
			Note:            input.Note,
		},
	})
}

func (r *PostgresRepository) UpdateSteps(userID, companyID string, steps []SelectionStepBulkUpdateItem) (Company, error) {
	if strings.TrimSpace(userID) == "" {
		return Company{}, invalidInput("user id is required")
	}
	if len(steps) == 0 {
		return Company{}, fmt.Errorf("%w: steps is required", ErrInvalidInput)
	}

	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Company{}, err
	}
	defer tx.Rollback()

	company, err := getCompanyForUpdate(ctx, tx, userID, companyID)
	if err != nil {
		return Company{}, err
	}

	currentSteps, err := listStepsTx(ctx, tx, company.ID)
	if err != nil {
		return Company{}, err
	}
	stepByID := make(map[string]SelectionStep, len(currentSteps))
	for _, step := range currentSteps {
		stepByID[step.ID] = step
	}

	for _, patch := range steps {
		stepID := strings.TrimSpace(patch.ID)
		if stepID == "" {
			return Company{}, invalidInput("step id is required")
		}
		if patch.Title == nil && patch.Status == nil && patch.ScheduledAt == nil && patch.DurationMinutes == nil && patch.Note == nil {
			return Company{}, fmt.Errorf("%w: title or status or scheduledAt or durationMinutes or note is required", ErrInvalidInput)
		}

		current, exists := stepByID[stepID]
		if !exists {
			return Company{}, ErrStepNotFound
		}

		if patch.Title != nil {
			title := strings.TrimSpace(*patch.Title)
			if title == "" {
				title = current.Kind
			}
			current.Title = title
		}
		if patch.Status != nil {
			normalizedStatus, err := normalizeSelectionStepStatus(*patch.Status)
			if err != nil {
				return Company{}, err
			}
			current.Status = normalizedStatus
		}
		if patch.ScheduledAt != nil {
			scheduledAt, err := parseScheduledAt(*patch.ScheduledAt)
			if err != nil {
				return Company{}, err
			}
			current.ScheduledAt = scheduledAt
		}
		if patch.DurationMinutes != nil {
			durationMinutes, err := normalizeDurationMinutes(*patch.DurationMinutes)
			if err != nil {
				return Company{}, err
			}
			current.DurationMinutes = durationMinutes
		}
		if patch.Note != nil {
			current.Note = strings.TrimSpace(*patch.Note)
		}

		if _, err := tx.ExecContext(
			ctx,
			`UPDATE selection_steps SET title=$1, status=$2, scheduled_at=$3, duration_minutes=$4, note=$5, updated_at=$6 WHERE id = $7 AND company_id = $8`,
			current.Title,
			current.Status,
			current.ScheduledAt,
			current.DurationMinutes,
			current.Note,
			time.Now().UTC(),
			current.ID,
			companyID,
		); err != nil {
			return Company{}, err
		}
	}

	updatedSteps, err := listStepsTx(ctx, tx, company.ID)
	if err != nil {
		return Company{}, err
	}
	company.SelectionSteps = updatedSteps
	company.SelectionFlow = composeSelectionFlow(updatedSteps)
	company.UpdatedAt = time.Now().UTC()

	if _, err := tx.ExecContext(
		ctx,
		`UPDATE companies SET selection_flow=$1, updated_at=$2 WHERE user_id=$3 AND id=$4`,
		company.SelectionFlow,
		company.UpdatedAt,
		userID,
		companyID,
	); err != nil {
		return Company{}, err
	}

	if err := tx.Commit(); err != nil {
		return Company{}, err
	}
	return company, nil
}

func (r *PostgresRepository) DeleteStep(userID, companyID, stepID string) (Company, error) {
	if strings.TrimSpace(userID) == "" {
		return Company{}, invalidInput("user id is required")
	}
	if strings.TrimSpace(stepID) == "" {
		return Company{}, invalidInput("step id is required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return Company{}, err
	}
	defer tx.Rollback()

	company, err := getCompanyForUpdate(ctx, tx, userID, companyID)
	if err != nil {
		return Company{}, err
	}

	result, err := tx.ExecContext(
		ctx,
		`DELETE FROM selection_steps WHERE company_id = $1 AND id = $2`,
		companyID,
		stepID,
	)
	if err != nil {
		return Company{}, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return Company{}, err
	}
	if affected == 0 {
		return Company{}, ErrStepNotFound
	}

	steps, err := listStepsTx(ctx, tx, company.ID)
	if err != nil {
		return Company{}, err
	}
	company.SelectionSteps = steps
	company.SelectionFlow = composeSelectionFlow(steps)
	company.UpdatedAt = time.Now().UTC()

	if _, err := tx.ExecContext(
		ctx,
		`UPDATE companies SET selection_flow=$1, updated_at=$2 WHERE user_id=$3 AND id=$4`,
		company.SelectionFlow,
		company.UpdatedAt,
		userID,
		companyID,
	); err != nil {
		return Company{}, err
	}

	if err := tx.Commit(); err != nil {
		return Company{}, err
	}
	return company, nil
}

func (r *PostgresRepository) Delete(userID, id string) error {
	if strings.TrimSpace(userID) == "" {
		return invalidInput("user id is required")
	}
	ctx, cancel := context.WithTimeout(context.Background(), queryTimeout)
	defer cancel()

	result, err := r.db.ExecContext(ctx, `DELETE FROM companies WHERE user_id=$1 AND id=$2`, userID, id)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresRepository) listSteps(ctx context.Context, companyID string) ([]SelectionStep, error) {
	return listStepsWithQuerier(ctx, r.db, companyID)
}

type querier interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func listStepsTx(ctx context.Context, q querier, companyID string) ([]SelectionStep, error) {
	return listStepsWithQuerier(ctx, q, companyID)
}

func listStepsWithQuerier(ctx context.Context, q querier, companyID string) ([]SelectionStep, error) {
	rows, err := q.QueryContext(
		ctx,
		`SELECT id, kind, title, status, scheduled_at, duration_minutes, note FROM selection_steps WHERE company_id=$1 ORDER BY created_at ASC`,
		companyID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	steps := []SelectionStep{}
	for rows.Next() {
		var step SelectionStep
		var scheduledAt sql.NullTime
		if err := rows.Scan(&step.ID, &step.Kind, &step.Title, &step.Status, &scheduledAt, &step.DurationMinutes, &step.Note); err != nil {
			return nil, err
		}
		if scheduledAt.Valid {
			t := scheduledAt.Time.UTC()
			step.ScheduledAt = &t
		}
		steps = append(steps, step)
	}
	return steps, nil
}

func getCompanyForUpdate(ctx context.Context, q querier, userID, companyID string) (Company, error) {
	var company Company
	err := q.QueryRowContext(
		ctx,
		`SELECT id, name, mypage_link, mypage_id, interest_level, selection_flow, selection_status, es_content, research_content, created_at, updated_at
		FROM companies WHERE user_id = $1 AND id = $2 FOR UPDATE`,
		userID,
		companyID,
	).Scan(
		&company.ID,
		&company.Name,
		&company.MypageLink,
		&company.MypageID,
		&company.InterestLevel,
		&company.SelectionFlow,
		&company.SelectionStatus,
		&company.ESContent,
		&company.ResearchContent,
		&company.CreatedAt,
		&company.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Company{}, ErrNotFound
		}
		return Company{}, err
	}
	return company, nil
}

func insertSteps(ctx context.Context, tx *sql.Tx, companyID string, steps []SelectionStep) error {
	for _, step := range steps {
		if _, err := tx.ExecContext(
			ctx,
			`INSERT INTO selection_steps (id, company_id, kind, title, status, scheduled_at, duration_minutes, note, created_at, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			step.ID,
			companyID,
			step.Kind,
			step.Title,
			step.Status,
			step.ScheduledAt,
			step.DurationMinutes,
			step.Note,
			time.Now().UTC(),
			time.Now().UTC(),
		); err != nil {
			return err
		}
	}
	return nil
}
