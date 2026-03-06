export type SelectionStep = {
  id: string
  kind: string
  title: string
  status: string
  scheduledAt?: string
  note?: string
}

export type Company = {
  id: string
  name: string
  mypageLink?: string
  mypageId?: string
  selectionStatus: string
  selectionFlow: string
  selectionSteps: SelectionStep[]
  esContent?: string
  researchContent?: string
}

export type StepDraft = {
  kind: string
  title: string
  status: string
  scheduledAt: string
  note: string
}

export type StepEdit = {
  status: string
  scheduledAt: string
  note: string
}

export type CompanyDetailEdit = {
  mypageLink: string
  mypageId: string
  selectionStatus: string
  researchContent: string
  esContent: string
}

export type AuthUser = {
  id: string
  name?: string
  email?: string
  provider: string
}

export type AuthConfig = {
  mode: "none" | "proxy_header" | "local" | string
  allowRegistration: boolean
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
  stepKind: string
  stepLabel: string
  stepStatus: string
  scheduledAt?: string
  note?: string
}

export type AgendaGroup = {
  dayKey: string
  events: AgendaEvent[]
}
