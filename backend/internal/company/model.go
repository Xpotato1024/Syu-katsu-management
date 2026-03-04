package company

import "time"

type Company struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	MypageLink      string    `json:"mypageLink"`
	MypageID        string    `json:"mypageId"`
	SelectionFlow   string    `json:"selectionFlow"`
	SelectionStatus string    `json:"selectionStatus"`
	ESContent       string    `json:"esContent"`
	ResearchContent string    `json:"researchContent"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type UpsertInput struct {
	Name            string `json:"name" binding:"required"`
	MypageLink      string `json:"mypageLink"`
	MypageID        string `json:"mypageId"`
	SelectionFlow   string `json:"selectionFlow"`
	SelectionStatus string `json:"selectionStatus"`
	ESContent       string `json:"esContent"`
	ResearchContent string `json:"researchContent"`
}
