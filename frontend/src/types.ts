export type SelectionStep = {
  id: string
  kind: string
  title: string
  status: string
  scheduledAt?: string
}

export type Company = {
  id: string
  name: string
  selectionStatus: string
  selectionFlow: string
  selectionSteps: SelectionStep[]
}

export type StepDraft = {
  kind: string
  title: string
  status: string
}

export type StepEdit = {
  status: string
  scheduledAt: string
}

export type AuthUser = {
  id: string
  name?: string
  email?: string
  provider: string
}

export type ViewKey = "companies" | "timeline" | "agenda"

export type TimelineOverflowState = {
  hasBefore: boolean
  hasAfter: boolean
}

export type AgendaEvent = {
  dayKey: string
  companyID: string
  companyName: string
  companyStatus: string
  stepID: string
  stepLabel: string
  stepStatus: string
}

export type AgendaGroup = {
  dayKey: string
  events: AgendaEvent[]
}
