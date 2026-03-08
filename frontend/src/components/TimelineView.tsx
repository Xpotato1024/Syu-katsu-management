import { Fragment, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { weekdayShort } from "../constants"
import type { AgendaEvent, Company, SelectionStep } from "../types"
import { formatDurationLabel, formatRemainingLabel, formatTimeLabel, toDateInputValue } from "../utils/date"
import { stepKindTone, stepLabel } from "../utils/selection"
import { MonthSelector } from "./MonthSelector"
import { StepDetailModal } from "./StepDetailModal"

type TimelineViewProps = {
  timelineMonth: Date
  onSetMonth: (value: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  calendarCompanyFilter: string
  onCalendarCompanyFilterChange: (value: string) => void
  onClearCalendarCompanyFilter: () => void
  calendarFilteredCompanies: Company[]
  companiesCount: number
  hasScheduledSteps: boolean
  hasScheduledStepsForFilteredCompanies: boolean
  timelineDays: Date[]
  stepsByCompanyDay: Record<string, Record<string, SelectionStep[]>>
}

type TimelineRangeMode = "3d" | "7d" | "month"

function isSameLocalDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function defaultCompactMode(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(max-width: 960px)").matches
}

function rangeSize(mode: TimelineRangeMode, daysLength: number): number {
  if (mode === "3d") return Math.min(3, daysLength)
  if (mode === "7d") return Math.min(7, daysLength)
  return daysLength
}

function formatRangeLabel(days: Date[]): string {
  if (days.length === 0) return ""
  const first = days[0]
  const last = days[days.length - 1]
  return `${first.getMonth() + 1}/${first.getDate()} - ${last.getMonth() + 1}/${last.getDate()}`
}

export function TimelineView({
  timelineMonth,
  onSetMonth,
  onPrevMonth,
  onNextMonth,
  calendarCompanyFilter,
  onCalendarCompanyFilterChange,
  onClearCalendarCompanyFilter,
  calendarFilteredCompanies,
  companiesCount,
  hasScheduledSteps,
  hasScheduledStepsForFilteredCompanies,
  timelineDays,
  stepsByCompanyDay
}: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const headerRefs = useRef<Array<HTMLDivElement | null>>([])
  const [compactMode, setCompactMode] = useState(defaultCompactMode)
  const [collapsedCompanyIDs, setCollapsedCompanyIDs] = useState<Record<string, boolean>>({})
  const [rangeMode, setRangeMode] = useState<TimelineRangeMode>("month")
  const [rangeStartIndex, setRangeStartIndex] = useState(0)
  const [filterInput, setFilterInput] = useState(calendarCompanyFilter)
  const [activeEvent, setActiveEvent] = useState<AgendaEvent | null>(null)

  const today = useMemo(() => new Date(), [])
  const rangeSpan = useMemo(() => rangeSize(rangeMode, timelineDays.length), [rangeMode, timelineDays.length])
  const maxRangeStart = useMemo(() => Math.max(0, timelineDays.length - rangeSpan), [timelineDays.length, rangeSpan])
  const displayedDays = useMemo(() => {
    if (rangeMode === "month") return timelineDays
    return timelineDays.slice(rangeStartIndex, rangeStartIndex + rangeSpan)
  }, [rangeMode, rangeSpan, rangeStartIndex, timelineDays])

  const [visibleDayRange, setVisibleDayRange] = useState({ start: 0, end: Math.max(0, displayedDays.length - 1) })

  const allRowsCollapsed = useMemo(() => {
    if (calendarFilteredCompanies.length === 0) return false
    return calendarFilteredCompanies.every((company) => !!collapsedCompanyIDs[company.id])
  }, [calendarFilteredCompanies, collapsedCompanyIDs])

  const stickyColumnWidth = allRowsCollapsed ? (compactMode ? 96 : 116) : compactMode ? 136 : 220
  const dayColumnMinWidth = compactMode ? 56 : 84

  useEffect(() => {
    if (rangeMode === "month") {
      setRangeStartIndex(0)
      return
    }

    const todayIndex = timelineDays.findIndex((day) => isSameLocalDate(day, today))
    setRangeStartIndex((prev) => {
      if (prev >= 0 && prev <= maxRangeStart) return prev
      if (todayIndex >= 0) return Math.min(todayIndex, maxRangeStart)
      return 0
    })
  }, [maxRangeStart, rangeMode, timelineDays, today])

  useEffect(() => {
    setFilterInput(calendarCompanyFilter)
  }, [calendarCompanyFilter])

  const dayIndexByKey = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 0; i < displayedDays.length; i++) {
      map.set(toDateInputValue(displayedDays[i].toISOString()), i)
    }
    return map
  }, [displayedDays])

  const updateVisibleRange = useCallback(() => {
    const container = scrollRef.current
    if (!container || displayedDays.length === 0) {
      setVisibleDayRange({ start: 0, end: Math.max(0, displayedDays.length - 1) })
      return
    }

    const containerRect = container.getBoundingClientRect()
    const visibleLeft = containerRect.left + stickyColumnWidth
    const visibleRight = containerRect.right
    let start = -1
    let end = -1

    for (let i = 0; i < displayedDays.length; i++) {
      const header = headerRefs.current[i]
      if (!header) continue
      const rect = header.getBoundingClientRect()
      const isVisible = rect.right > visibleLeft && rect.left < visibleRight
      if (!isVisible) continue
      if (start < 0) start = i
      end = i
    }

    if (start < 0 || end < 0) {
      setVisibleDayRange({ start: 0, end: Math.max(0, displayedDays.length - 1) })
      return
    }
    setVisibleDayRange({ start, end })
  }, [displayedDays, stickyColumnWidth])

  useEffect(() => {
    updateVisibleRange()
  }, [updateVisibleRange, calendarFilteredCompanies.length, displayedDays.length, rangeMode])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const onRecalc = () => updateVisibleRange()
    container.addEventListener("scroll", onRecalc, { passive: true })
    window.addEventListener("resize", onRecalc)
    return () => {
      container.removeEventListener("scroll", onRecalc)
      window.removeEventListener("resize", onRecalc)
    }
  }, [updateVisibleRange])

  useEffect(() => {
    setCollapsedCompanyIDs((prev) => {
      const next: Record<string, boolean> = {}
      for (const company of calendarFilteredCompanies) {
        if (prev[company.id]) next[company.id] = true
      }
      return next
    })
  }, [calendarFilteredCompanies])

  const hasCollapsedRows = useMemo(() => Object.values(collapsedCompanyIDs).some((value) => value), [collapsedCompanyIDs])
  const shownRangeLabel = useMemo(() => formatRangeLabel(displayedDays), [displayedDays])
  const firstVisibleDayKey = displayedDays.length > 0 ? toDateInputValue(displayedDays[0].toISOString()) : ""
  const lastVisibleDayKey =
    displayedDays.length > 0 ? toDateInputValue(displayedDays[displayedDays.length - 1].toISOString()) : ""

  let timelineEmptyMessage = ""
  if (calendarFilteredCompanies.length === 0) {
    timelineEmptyMessage = "絞り込み条件に一致する企業がありません。企業名の絞り込みを解除して再確認してください。"
  } else if (!hasScheduledStepsForFilteredCompanies) {
    timelineEmptyMessage = hasScheduledSteps
      ? "絞り込み条件に一致する日程付きステップがありません。絞り込み条件を調整してください。"
      : "日程が設定された選考ステップがありません。企業管理画面でステップの日程を入力すると、ここに表示されます。"
  }

  const showTimelineGrid = timelineEmptyMessage === ""

  function onFilterSubmit(event: FormEvent) {
    event.preventDefault()
    onCalendarCompanyFilterChange(filterInput)
  }

  const canMoveRangePrev = rangeMode === "month" ? timelineDays.length > 0 : rangeStartIndex > 0
  const canMoveRangeNext = rangeMode === "month" ? timelineDays.length > 0 : rangeStartIndex < maxRangeStart

  function onMoveRangePrev() {
    if (rangeMode === "month") {
      onPrevMonth()
      return
    }
    setRangeStartIndex((prev) => Math.max(0, prev - rangeSpan))
  }

  function onMoveRangeNext() {
    if (rangeMode === "month") {
      onNextMonth()
      return
    }
    setRangeStartIndex((prev) => Math.min(maxRangeStart, prev + rangeSpan))
  }

  return (
    <>
      <section className="hero">
        <p className="hero-sub">企業ごとの予定を 3日 / 7日 / 月表示で確認できます。今日のハイライトと行折りたたみで可読性を維持します。</p>
      </section>

      <section className="panel timeline-toolbar">
        <h2>企業別カレンダー</h2>
        <div className="row timeline-row-month">
          <MonthSelector value={timelineMonth} onSetMonth={onSetMonth} onPrevMonth={onPrevMonth} onNextMonth={onNextMonth} />
        </div>
        <div className="row timeline-range-switch timeline-row-range">
          <div className="timeline-range-modes" role="tablist" aria-label="表示範囲">
            <button
              type="button"
              className={rangeMode === "3d" ? "button-secondary active-toggle timeline-range-mode" : "button-secondary timeline-range-mode"}
              onClick={() => setRangeMode("3d")}
            >
              3日
            </button>
            <button
              type="button"
              className={rangeMode === "7d" ? "button-secondary active-toggle timeline-range-mode" : "button-secondary timeline-range-mode"}
              onClick={() => setRangeMode("7d")}
            >
              7日
            </button>
            <button
              type="button"
              className={rangeMode === "month" ? "button-secondary active-toggle timeline-range-mode" : "button-secondary timeline-range-mode"}
              onClick={() => setRangeMode("month")}
            >
              1月
            </button>
          </div>
          <button type="button" className="button-secondary timeline-range-arrow" disabled={!canMoveRangePrev} onClick={onMoveRangePrev} aria-label="前の期間">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10.5 3 5.5 8l5 5" />
            </svg>
          </button>
          {shownRangeLabel && <span className="timeline-range-label timeline-range-label-fixed">{shownRangeLabel}</span>}
          <button type="button" className="button-secondary timeline-range-arrow" disabled={!canMoveRangeNext} onClick={onMoveRangeNext} aria-label="次の期間">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5.5 3 10.5 8l-5 5" />
            </svg>
          </button>
        </div>
        <form className="stack timeline-filter-form" onSubmit={onFilterSubmit}>
          <div className="row timeline-filter-primary">
            <input value={filterInput} onChange={(e) => setFilterInput(e.target.value)} placeholder="企業名でカレンダー表示を絞り込み" />
            <button type="submit">絞り込み</button>
          </div>
          <div className="row timeline-filter-secondary">
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setFilterInput("")
                onClearCalendarCompanyFilter()
              }}
            >
              クリア
            </button>
          </div>
        </form>
        <div className="row timeline-row-toggles">
          <button
            type="button"
            className={compactMode ? "button-secondary active-toggle timeline-toggle-fixed-compact" : "button-secondary timeline-toggle-fixed-compact"}
            onClick={() => setCompactMode((prev) => !prev)}
          >
            {compactMode ? "標準表示" : "コンパクト表示"}
          </button>
          <button
            type="button"
            className="button-secondary timeline-toggle-fixed-collapse"
            onClick={() => {
              if (!hasCollapsedRows) {
                const next: Record<string, boolean> = {}
                for (const company of calendarFilteredCompanies) {
                  next[company.id] = true
                }
                setCollapsedCompanyIDs(next)
                return
              }
              setCollapsedCompanyIDs({})
            }}
          >
            {hasCollapsedRows ? "折りたたみ解除" : "全行を折りたたむ"}
          </button>
        </div>
        <p className="muted timeline-meta">
          表示企業: {calendarFilteredCompanies.length} / 全{companiesCount}
        </p>
      </section>

      <section className="panel timeline-panel">
        {timelineEmptyMessage && <p className="empty-state timeline-empty-state">{timelineEmptyMessage}</p>}
        {showTimelineGrid && (
          <div className={compactMode ? "timeline-scroll compact" : "timeline-scroll"} ref={scrollRef}>
            <div
              className={compactMode ? "timeline-grid compact" : "timeline-grid"}
              style={{ gridTemplateColumns: `${stickyColumnWidth}px repeat(${displayedDays.length}, minmax(${dayColumnMinWidth}px, 1fr))` }}
            >
              <div className="timeline-header sticky-col">企業 / 日付</div>
              {displayedDays.map((day, dayIndex) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                const isToday = isSameLocalDate(day, today)
                const headerClass = ["timeline-header", isWeekend ? "weekend" : "", isToday ? "today" : ""]
                  .filter((value) => value !== "")
                  .join(" ")
                return (
                  <div
                    key={`head-${day.toISOString()}`}
                    ref={(element) => {
                      headerRefs.current[dayIndex] = element
                    }}
                    className={headerClass}
                  >
                    <div>{day.getDate()}</div>
                    <small>{weekdayShort[day.getDay()]}</small>
                  </div>
                )
              })}

              {calendarFilteredCompanies.map((company) => {
                const rowCollapsed = !!collapsedCompanyIDs[company.id]
                const scheduledDayKeys = Object.keys(stepsByCompanyDay[company.id] ?? {})
                let hasBefore = false
                let hasAfter = false
                for (const dayKey of scheduledDayKeys) {
                  if (firstVisibleDayKey && dayKey < firstVisibleDayKey) hasBefore = true
                  if (lastVisibleDayKey && dayKey > lastVisibleDayKey) hasAfter = true
                  const dayIndex = dayIndexByKey.get(dayKey)
                  if (dayIndex === undefined) continue
                  if (dayIndex < visibleDayRange.start) hasBefore = true
                  if (dayIndex > visibleDayRange.end) hasAfter = true
                }

                const companyClassName = [
                  "timeline-company",
                  "sticky-col",
                  hasBefore ? "has-before" : "",
                  hasAfter ? "has-after" : "",
                  rowCollapsed ? "collapsed" : ""
                ]
                  .filter((value) => value !== "")
                  .join(" ")

                return (
                  <Fragment key={`row-${company.id}`}>
                    <div className={companyClassName}>
                      <div className="timeline-company-main">
                        <button
                          type="button"
                          className={rowCollapsed ? "timeline-collapse collapsed" : "timeline-collapse"}
                          aria-label={rowCollapsed ? "企業行を展開" : "企業行を折りたたむ"}
                          onClick={() =>
                            setCollapsedCompanyIDs((prev) => ({
                              ...prev,
                              [company.id]: !prev[company.id]
                            }))
                          }
                        >
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d={rowCollapsed ? "M6 3l5 5-5 5z" : "M3 6l5 5 5-5z"} />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={rowCollapsed ? "timeline-company-name collapsed" : "timeline-company-name"}
                          onClick={() =>
                            setCollapsedCompanyIDs((prev) => ({
                              ...prev,
                              [company.id]: !prev[company.id]
                            }))
                          }
                          title={company.name}
                        >
                          {company.name}
                        </button>
                      </div>
                      {!rowCollapsed && <small>{company.selectionStatus}</small>}
                      {(hasBefore || hasAfter) && (
                        <span className="timeline-edge-note">
                          {hasBefore ? "← 左側に見切れあり" : ""}
                          {hasBefore && hasAfter ? " / " : ""}
                          {hasAfter ? "右側に見切れあり →" : ""}
                        </span>
                      )}
                    </div>
                    {displayedDays.map((day, index) => {
                      const dayKey = toDateInputValue(day.toISOString())
                      const entries = stepsByCompanyDay[company.id]?.[dayKey] ?? []
                      const isToday = isSameLocalDate(day, today)
                      const cellClassName = [
                        "timeline-cell",
                        index === visibleDayRange.start && hasBefore ? "overflow-left" : "",
                        index === visibleDayRange.end && hasAfter ? "overflow-right" : "",
                        rowCollapsed ? "collapsed" : "",
                        isToday ? "today-col" : ""
                      ]
                        .filter((value) => value !== "")
                        .join(" ")

                      return (
                        <div key={`${company.id}-${dayKey}`} className={cellClassName}>
                          {rowCollapsed && entries.length > 0 && <span className="timeline-event-count">{entries.length}</span>}
                          {!rowCollapsed &&
                            entries.map((step) => {
                              const timeLabel = formatTimeLabel(step.scheduledAt)
                              const durationLabel = formatDurationLabel(step.durationMinutes)
                              const remainingLabel = formatRemainingLabel(step.scheduledAt, today)
                              const kindTone = stepKindTone(step.kind)
                              const hasNote = !!step.note?.trim()
                              return (
                                <button
                                  key={step.id}
                                  type="button"
                                  className="timeline-event timeline-event-button"
                                  onClick={() =>
                                    setActiveEvent({
                                      dayKey,
                                      companyID: company.id,
                                      companyName: company.name,
                                      companyStatus: company.selectionStatus,
                                      stepID: step.id,
                                      stepKind: step.kind,
                                      stepLabel: stepLabel(step),
                                      stepStatus: step.status,
                                      scheduledAt: step.scheduledAt,
                                      durationMinutes: step.durationMinutes || 0,
                                      note: step.note || ""
                                    })
                                  }
                                >
                                  <div className="timeline-event-head">
                                    <span className={`step-kind-tag ${kindTone}`}>{step.kind}</span>
                                    {hasNote && <span className="timeline-note-indicator">備考あり</span>}
                                    {remainingLabel && <span className="timeline-remaining-label">{remainingLabel}</span>}
                                  </div>
                                  <span className="timeline-event-label">{stepLabel(step)}</span>
                                  <small>
                                    {timeLabel ? `${timeLabel} / ${step.status}` : step.status}
                                    {durationLabel ? ` / ${durationLabel}` : ""}
                                  </small>
                                </button>
                              )
                            })}
                        </div>
                      )
                    })}
                  </Fragment>
                )
              })}
            </div>
          </div>
        )}
      </section>
      <StepDetailModal event={activeEvent} onClose={() => setActiveEvent(null)} />
    </>
  )
}
