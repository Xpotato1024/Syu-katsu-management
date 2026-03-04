import { weekdayShort } from "../constants"

export function toDateInputValue(value?: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
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
