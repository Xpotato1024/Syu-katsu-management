package company

import "time"

type Company struct {
	ID              string          `json:"id"`
	Name            string          `json:"name"`
	MypageLink      string          `json:"mypageLink"`
	MypageID        string          `json:"mypageId"`
	SelectionFlow   string          `json:"selectionFlow"`
	SelectionStatus string          `json:"selectionStatus"`
	SelectionSteps  []SelectionStep `json:"selectionSteps"`
	ESContent       string          `json:"esContent"`
	ResearchContent string          `json:"researchContent"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

type SelectionStep struct {
	ID          string     `json:"id"`
	Kind        string     `json:"kind"`
	Title       string     `json:"title"`
	Status      string     `json:"status"`
	ScheduledAt *time.Time `json:"scheduledAt,omitempty"`
}

type UpsertInput struct {
	Name            string               `json:"name" binding:"required"`
	MypageLink      string               `json:"mypageLink"`
	MypageID        string               `json:"mypageId"`
	SelectionFlow   string               `json:"selectionFlow"`
	SelectionStatus string               `json:"selectionStatus"`
	SelectionSteps  []SelectionStepInput `json:"selectionSteps"`
	ESContent       string               `json:"esContent"`
	ResearchContent string               `json:"researchContent"`
}

type SelectionStepInput struct {
	Kind        string `json:"kind"`
	Title       string `json:"title"`
	Status      string `json:"status"`
	ScheduledAt string `json:"scheduledAt"`
}

type SelectionStepUpdateInput struct {
	Status      *string `json:"status"`
	ScheduledAt *string `json:"scheduledAt"`
}
