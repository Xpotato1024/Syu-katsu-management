package company

type Store interface {
	List(userID string, filter ListFilter) []Company
	GetByID(userID, id string) (Company, error)
	Create(userID string, input UpsertInput) (Company, error)
	Update(userID, id string, input UpsertInput) (Company, error)
	AddStep(userID, companyID string, input SelectionStepInput) (Company, error)
	UpdateStep(userID, companyID, stepID string, input SelectionStepUpdateInput) (Company, error)
	Delete(userID, id string) error
}
