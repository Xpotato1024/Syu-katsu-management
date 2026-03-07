import { completedStepStatuses, pendingStepStatuses, stoppedStepStatuses } from "../constants"
import type { SelectionStep, StepDraft } from "../types"

export function newStepDraft(kind = "エントリー"): StepDraft {
  return { kind, title: "", status: "未着手", scheduledAt: "", durationMinutes: "", note: "" }
}

export function stepLabel(step: SelectionStep): string {
  return step.title || step.kind
}

export function resolveCurrentStepIndex(steps: SelectionStep[]): number {
  if (steps.length === 0) return -1

  const firstPending = steps.findIndex((step) => pendingStepStatuses.has(step.status))
  if (firstPending >= 0) return firstPending

  const firstStopped = steps.findIndex((step) => stoppedStepStatuses.has(step.status))
  if (firstStopped >= 0) return firstStopped

  return steps.length - 1
}

export function stepVisualState(status: string): "pending" | "done" | "stopped" {
  if (completedStepStatuses.has(status)) return "done"
  if (stoppedStepStatuses.has(status)) return "stopped"
  return "pending"
}

export function stepKindTone(kind: string): "entry" | "es" | "webtest" | "interview" | "gd" | "session" | "other" {
  const normalized = kind.trim().toLowerCase()
  if (normalized === "エントリー") return "entry"
  if (normalized === "es") return "es"
  if (normalized === "webテスト") return "webtest"
  if (normalized === "面接") return "interview"
  if (normalized === "gd") return "gd"
  if (normalized === "面談" || normalized === "説明会") return "session"
  return "other"
}
