import { weekdayShort } from "../constants"

export function toDateInputValue(value?: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 10)
}

export function toDateTimeInputValue(value?: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""

  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

export function toScheduledAtPayload(value?: string): string {
  const candidate = value?.trim() ?? ""
  if (!candidate) return ""

  const local = new Date(candidate)
  if (Number.isNaN(local.getTime())) return candidate
  return local.toISOString()
}

export function toDurationInputValue(value?: number): string {
  if (!value || value <= 0) return ""
  return String(value)
}

export function toDurationMinutesPayload(value?: string): number {
  const candidate = value?.trim() ?? ""
  if (!candidate) return 0

  const parsed = Number(candidate)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.round(parsed)
}

export function formatTimeLabel(value?: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
}

export function formatDurationLabel(value?: number): string {
  if (!value || value <= 0) return ""

  const hours = Math.floor(value / 60)
  const minutes = value % 60
  if (hours > 0 && minutes > 0) return `${hours}時間${minutes}分`
  if (hours > 0) return `${hours}時間`
  return `${minutes}分`
}

export function formatRemainingLabel(value?: string, base = new Date()): string {
  if (!value) return ""
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return ""

  const baseDay = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const diffDays = Math.round((targetDay.getTime() - baseDay.getTime()) / 86_400_000)

  if (diffDays > 0) return `D-${diffDays}`
  if (diffDays === 0) return "本日"
  return `期限超過${Math.abs(diffDays)}日`
}

export function startOfMonth(base = new Date()): Date {
  return new Date(base.getFullYear(), base.getMonth(), 1)
}

export function shiftMonth(base: Date, delta: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1)
}

export function buildMonthDays(base: Date): Date[] {
  const days: Date[] = []
  const year = base.getFullYear()
  const month = base.getMonth()
  const last = new Date(year, month + 1, 0).getDate()
  for (let i = 1; i <= last; i++) {
    days.push(new Date(year, month, i))
  }
  return days
}

export function formatDayLabel(dayKey: string): string {
  const day = new Date(`${dayKey}T00:00:00`)
  return `${day.getMonth() + 1}/${day.getDate()}（${weekdayShort[day.getDay()]}）`
}

export function toMonthInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}
