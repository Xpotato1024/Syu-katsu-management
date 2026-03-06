import { useCallback, useMemo, useState } from "react"
import type { AgendaEvent, AgendaGroup, Company, SelectionStep } from "../types"
import { buildMonthDays, shiftMonth, startOfMonth, toDateInputValue } from "../utils/date"
import { stepLabel } from "../utils/selection"

type UseTimelineArgs = {
  companies: Company[]
}

export function useTimeline({ companies }: UseTimelineArgs) {
  const [timelineMonth, setTimelineMonth] = useState<Date>(() => startOfMonth())
  const [calendarCompanyFilter, setCalendarCompanyFilter] = useState("")

  const timelineDays = useMemo(() => buildMonthDays(timelineMonth), [timelineMonth])
  const timelineMonthStartKey = useMemo(() => {
    if (timelineDays.length === 0) return ""
    return toDateInputValue(timelineDays[0].toISOString())
  }, [timelineDays])
  const timelineMonthEndKey = useMemo(() => {
    if (timelineDays.length === 0) return ""
    return toDateInputValue(timelineDays[timelineDays.length - 1].toISOString())
  }, [timelineDays])

  const timelineRows = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name, "ja")),
    [companies]
  )

  const calendarFilteredCompanies = useMemo(() => {
    const query = calendarCompanyFilter.trim().toLowerCase()
    if (!query) return timelineRows
    return timelineRows.filter((company) => company.name.toLowerCase().includes(query))
  }, [timelineRows, calendarCompanyFilter])

  const stepsByCompanyDay = useMemo(() => {
    const map: Record<string, Record<string, SelectionStep[]>> = {}
    for (const company of companies) {
      map[company.id] = {}
      for (const step of company.selectionSteps || []) {
        const dayKey = toDateInputValue(step.scheduledAt)
        if (!dayKey) continue
        if (!map[company.id][dayKey]) {
          map[company.id][dayKey] = []
        }
        map[company.id][dayKey].push(step)
      }
    }
    return map
  }, [companies])

  const hasScheduledSteps = useMemo(() => {
    return companies.some((company) => company.selectionSteps.some((step) => !!toDateInputValue(step.scheduledAt)))
  }, [companies])

  const hasScheduledStepsForFilteredCompanies = useMemo(() => {
    return calendarFilteredCompanies.some((company) =>
      company.selectionSteps.some((step) => !!toDateInputValue(step.scheduledAt))
    )
  }, [calendarFilteredCompanies])

  const agendaEvents = useMemo(() => {
    if (!timelineMonthStartKey || !timelineMonthEndKey) return []

    const events: AgendaEvent[] = []
    for (const company of calendarFilteredCompanies) {
      for (const step of company.selectionSteps || []) {
        const dayKey = toDateInputValue(step.scheduledAt)
        if (!dayKey) continue
        if (dayKey < timelineMonthStartKey || dayKey > timelineMonthEndKey) continue

        events.push({
          dayKey,
          companyID: company.id,
          companyName: company.name,
          companyStatus: company.selectionStatus,
          stepID: step.id,
          stepKind: step.kind,
          stepLabel: stepLabel(step),
          stepStatus: step.status,
          scheduledAt: step.scheduledAt,
          note: step.note || ""
        })
      }
    }

    events.sort((a, b) => {
      if (a.dayKey !== b.dayKey) return a.dayKey.localeCompare(b.dayKey)
      const at = a.scheduledAt || ""
      const bt = b.scheduledAt || ""
      if (at !== bt) return at.localeCompare(bt)
      const companyCompare = a.companyName.localeCompare(b.companyName, "ja")
      if (companyCompare !== 0) return companyCompare
      return a.stepLabel.localeCompare(b.stepLabel, "ja")
    })

    return events
  }, [calendarFilteredCompanies, timelineMonthStartKey, timelineMonthEndKey])

  const agendaGroups = useMemo<AgendaGroup[]>(() => {
    const groups = new Map<string, AgendaEvent[]>()
    for (const event of agendaEvents) {
      if (!groups.has(event.dayKey)) groups.set(event.dayKey, [])
      groups.get(event.dayKey)?.push(event)
    }
    return Array.from(groups.entries()).map(([dayKey, events]) => ({ dayKey, events }))
  }, [agendaEvents])

  const prevMonth = useCallback(() => {
    setTimelineMonth((prev) => shiftMonth(prev, -1))
  }, [])

  const nextMonth = useCallback(() => {
    setTimelineMonth((prev) => shiftMonth(prev, 1))
  }, [])

  const resetMonth = useCallback(() => {
    setTimelineMonth(startOfMonth())
  }, [])

  const clearCalendarCompanyFilter = useCallback(() => {
    setCalendarCompanyFilter("")
  }, [])

  return {
    timelineMonth,
    calendarCompanyFilter,
    setCalendarCompanyFilter,
    timelineDays,
    calendarFilteredCompanies,
    stepsByCompanyDay,
    hasScheduledSteps,
    hasScheduledStepsForFilteredCompanies,
    agendaEvents,
    agendaGroups,
    prevMonth,
    nextMonth,
    resetMonth,
    clearCalendarCompanyFilter
  }
}
