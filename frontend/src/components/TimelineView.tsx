import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { weekdayShort } from "../constants"
import type { Company, SelectionStep } from "../types"
import { toDateInputValue } from "../utils/date"
import { stepLabel } from "../utils/selection"

type TimelineViewProps = {
  timelineMonth: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onResetMonth: () => void
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

export function TimelineView({
  timelineMonth,
  onPrevMonth,
  onNextMonth,
  onResetMonth,
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
  const [visibleDayRange, setVisibleDayRange] = useState({ start: 0, end: Math.max(0, timelineDays.length - 1) })

  const dayIndexByKey = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 0; i < timelineDays.length; i++) {
      map.set(toDateInputValue(timelineDays[i].toISOString()), i)
    }
    return map
  }, [timelineDays])

  const updateVisibleRange = useCallback(() => {
    const container = scrollRef.current
    if (!container || timelineDays.length === 0) {
      setVisibleDayRange({ start: 0, end: Math.max(0, timelineDays.length - 1) })
      return
    }

    const containerRect = container.getBoundingClientRect()
    const stickyWidth = 220
    const visibleLeft = containerRect.left + stickyWidth
    const visibleRight = containerRect.right
    let start = -1
    let end = -1

    for (let i = 0; i < timelineDays.length; i++) {
      const header = headerRefs.current[i]
      if (!header) continue
      const rect = header.getBoundingClientRect()
      const isVisible = rect.right > visibleLeft && rect.left < visibleRight
      if (!isVisible) continue
      if (start < 0) start = i
      end = i
    }

    if (start < 0 || end < 0) {
      setVisibleDayRange({ start: 0, end: Math.max(0, timelineDays.length - 1) })
      return
    }
    setVisibleDayRange({ start, end })
  }, [timelineDays])

  useEffect(() => {
    updateVisibleRange()
  }, [updateVisibleRange, calendarFilteredCompanies.length])

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

  return (
    <>
      <section className="panel timeline-toolbar">
        <h2>企業別カレンダー</h2>
        <p className="muted">今見えている範囲の外に予定がある企業は、行の左右端を強調表示します。</p>
        <div className="row">
          <button type="button" className="button-secondary" onClick={onPrevMonth}>
            前月
          </button>
          <div className="month-badge">{`${timelineMonth.getFullYear()}年${timelineMonth.getMonth() + 1}月`}</div>
          <button type="button" className="button-secondary" onClick={onNextMonth}>
            次月
          </button>
          <button type="button" onClick={onResetMonth}>
            今月へ
          </button>
        </div>
        <div className="row">
          <input
            value={calendarCompanyFilter}
            onChange={(e) => onCalendarCompanyFilterChange(e.target.value)}
            placeholder="企業名でカレンダー表示を絞り込み"
          />
          <button type="button" className="button-secondary" onClick={onClearCalendarCompanyFilter}>
            絞り込み解除
          </button>
        </div>
        <p className="muted timeline-meta">
          表示企業: {calendarFilteredCompanies.length} / 全{companiesCount}
        </p>
      </section>

      <section className="panel timeline-panel">
        {!hasScheduledSteps && (
          <p className="muted">
            日程が設定された選考ステップがありません。企業管理画面でステップの日程を入力すると、ここに表示されます。
          </p>
        )}
        {hasScheduledSteps && !hasScheduledStepsForFilteredCompanies && (
          <p className="muted">絞り込み条件に一致する日程付きステップがありません。</p>
        )}
        {calendarFilteredCompanies.length === 0 && <p className="muted">絞り込み条件に一致する企業がありません。</p>}
        <div className="timeline-scroll" ref={scrollRef}>
          <div className="timeline-grid" style={{ gridTemplateColumns: `220px repeat(${timelineDays.length}, minmax(84px, 1fr))` }}>
            <div className="timeline-header sticky-col">企業 / 日付</div>
            {timelineDays.map((day, dayIndex) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              return (
                <div
                  key={`head-${day.toISOString()}`}
                  ref={(element) => {
                    headerRefs.current[dayIndex] = element
                  }}
                  className={isWeekend ? "timeline-header weekend" : "timeline-header"}
                >
                  <div>{day.getDate()}</div>
                  <small>{weekdayShort[day.getDay()]}</small>
                </div>
              )
            })}

            {calendarFilteredCompanies.map((company) => {
              const scheduledDayKeys = Object.keys(stepsByCompanyDay[company.id] ?? {})
              let hasBefore = false
              let hasAfter = false
              for (const dayKey of scheduledDayKeys) {
                const dayIndex = dayIndexByKey.get(dayKey)
                if (dayIndex === undefined) continue
                if (dayIndex < visibleDayRange.start) hasBefore = true
                if (dayIndex > visibleDayRange.end) hasAfter = true
              }

              const companyClassName = ["timeline-company", "sticky-col", hasBefore ? "has-before" : "", hasAfter ? "has-after" : ""]
                .filter((value) => value !== "")
                .join(" ")

              return (
                <Fragment key={`row-${company.id}`}>
                  <div className={companyClassName}>
                    <strong>{company.name}</strong>
                    <small>{company.selectionStatus}</small>
                    {(hasBefore || hasAfter) && (
                      <span className="timeline-edge-note">
                        {hasBefore ? "← 左側に見切れあり" : ""}
                        {hasBefore && hasAfter ? " / " : ""}
                        {hasAfter ? "右側に見切れあり →" : ""}
                      </span>
                    )}
                  </div>
                  {timelineDays.map((day, index) => {
                    const dayKey = toDateInputValue(day.toISOString())
                    const entries = stepsByCompanyDay[company.id]?.[dayKey] ?? []
                    const cellClassName = [
                      "timeline-cell",
                      index === visibleDayRange.start && hasBefore ? "overflow-left" : "",
                      index === visibleDayRange.end && hasAfter ? "overflow-right" : ""
                    ]
                      .filter((value) => value !== "")
                      .join(" ")

                    return (
                      <div key={`${company.id}-${dayKey}`} className={cellClassName}>
                        {entries.map((step) => (
                          <div key={step.id} className="timeline-event">
                            <span>{stepLabel(step)}</span>
                            <small>{step.status}</small>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </Fragment>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
