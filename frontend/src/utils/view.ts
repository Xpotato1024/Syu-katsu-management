import type { ViewKey } from "../types"

export function parseViewFromHash(hash: string): ViewKey {
  const normalized = hash.replace(/^#\/?/, "")
  if (normalized === "timeline") return "timeline"
  if (normalized === "agenda") return "agenda"
  return "companies"
}

export function viewHash(view: ViewKey): string {
  if (view === "timeline") return "#/timeline"
  if (view === "agenda") return "#/agenda"
  return "#/companies"
}

export function viewLabel(view: ViewKey): string {
  if (view === "timeline") return "企業別カレンダー"
  if (view === "agenda") return "統合予定"
  return "企業管理"
}
