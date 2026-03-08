import { type FormEvent, useEffect, useState } from "react"
import type { AgendaEvent, AgendaGroup } from "../types"
import { formatDayLabel, formatDurationLabel, formatRemainingLabel, formatTimeLabel } from "../utils/date"
import { stepKindTone } from "../utils/selection"
import { MonthSelector } from "./MonthSelector"
import { StepDetailModal } from "./StepDetailModal"

type AgendaViewProps = {
  timelineMonth: Date
  onSetMonth: (value: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  calendarCompanyFilter: string
  onCalendarCompanyFilterChange: (value: string) => void
  onClearCalendarCompanyFilter: () => void
  agendaEvents: AgendaEvent[]
  agendaGroups: AgendaGroup[]
  calendarFilteredCompanyCount: number
  companiesCount: number
}

export function AgendaView({
  timelineMonth,
  onSetMonth,
  onPrevMonth,
  onNextMonth,
  calendarCompanyFilter,
  onCalendarCompanyFilterChange,
  onClearCalendarCompanyFilter,
  agendaEvents,
  agendaGroups,
  calendarFilteredCompanyCount,
  companiesCount
}: AgendaViewProps) {
  const [filterInput, setFilterInput] = useState(calendarCompanyFilter)
  const [activeEvent, setActiveEvent] = useState<AgendaEvent | null>(null)

  useEffect(() => {
    setFilterInput(calendarCompanyFilter)
  }, [calendarCompanyFilter])

  function onFilterSubmit(event: FormEvent) {
    event.preventDefault()
    onCalendarCompanyFilterChange(filterInput)
  }

  return (
    <>
      <section className="hero">
        <p className="hero-sub">企業横断で当月予定を一覧化します。日付単位で時刻・ステータス・備考を確認できます。</p>
      </section>

      <section className="panel timeline-toolbar">
        <h2>統合予定</h2>
        <div className="row timeline-row-month">
          <MonthSelector value={timelineMonth} onSetMonth={onSetMonth} onPrevMonth={onPrevMonth} onNextMonth={onNextMonth} />
        </div>
        <form className="stack timeline-filter-form" onSubmit={onFilterSubmit}>
          <div className="row timeline-filter-primary">
            <input value={filterInput} onChange={(e) => setFilterInput(e.target.value)} placeholder="企業名で予定を絞り込み" />
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
        <p className="muted timeline-meta">
          当月の予定件数: {agendaEvents.length}（表示企業 {calendarFilteredCompanyCount} / 全{companiesCount}）
        </p>
      </section>

      <section className="panel agenda-panel">
        {agendaEvents.length === 0 && (
          <p className="empty-state">絞り込み条件に一致する予定がありません。企業管理で日程を追加して確認してください。</p>
        )}

        <div className="agenda-days">
          {agendaGroups.map((group) => (
            <article key={`agenda-${group.dayKey}`} className="agenda-day">
              <header className="agenda-day-head">
                <strong>{formatDayLabel(group.dayKey)}</strong>
                <span>{group.events.length}件</span>
              </header>
              <div className="agenda-list">
                {group.events.map((event) => {
                  const remainingLabel = formatRemainingLabel(event.scheduledAt)
                  const durationLabel = formatDurationLabel(event.durationMinutes)
                  return (
                    <button
                      key={`${event.companyID}-${event.stepID}`}
                      type="button"
                      className="agenda-item agenda-item-button"
                      onClick={() => setActiveEvent(event)}
                    >
                      <div className="agenda-main">
                        <span className="agenda-company">{event.companyName}</span>
                        <span className="agenda-step-line">
                          <span className={`step-kind-tag ${stepKindTone(event.stepKind)}`}>{event.stepKind}</span>
                          <span className="agenda-step">{event.stepLabel}</span>
                          {event.note?.trim() && <span className="agenda-note-indicator">備考あり</span>}
                          {remainingLabel && <span className="agenda-remaining-label">{remainingLabel}</span>}
                        </span>
                      </div>
                      <div className="agenda-side">
                        <span className="agenda-company-status">{event.companyStatus || "未設定"}</span>
                        <span className="agenda-step-status">{event.stepStatus}</span>
                        {event.scheduledAt && <span className="agenda-step-time">{formatTimeLabel(event.scheduledAt)}</span>}
                        {durationLabel && <span className="agenda-step-time">{durationLabel}</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
      <StepDetailModal event={activeEvent} onClose={() => setActiveEvent(null)} />
    </>
  )
}
