import { type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import type { AgendaEvent, AgendaGroup } from "../types"
import { formatDayLabel, formatTimeLabel, toMonthInputValue } from "../utils/date"
import { stepKindTone } from "../utils/selection"
import { StepDetailModal } from "./StepDetailModal"

type AgendaViewProps = {
  timelineMonth: Date
  onSetMonth: (value: string) => void
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
  calendarCompanyFilter,
  onCalendarCompanyFilterChange,
  onClearCalendarCompanyFilter,
  agendaEvents,
  agendaGroups,
  calendarFilteredCompanyCount,
  companiesCount
}: AgendaViewProps) {
  const monthPickerRef = useRef<HTMLInputElement | null>(null)
  const [filterInput, setFilterInput] = useState(calendarCompanyFilter)
  const [activeEvent, setActiveEvent] = useState<AgendaEvent | null>(null)
  const monthInputValue = useMemo(() => toMonthInputValue(timelineMonth), [timelineMonth])
  const [isMonthEditorOpen, setIsMonthEditorOpen] = useState(false)
  const [monthDraft, setMonthDraft] = useState(() => toMonthInputValue(timelineMonth))

  useEffect(() => {
    setFilterInput(calendarCompanyFilter)
  }, [calendarCompanyFilter])

  function onFilterSubmit(event: FormEvent) {
    event.preventDefault()
    onCalendarCompanyFilterChange(filterInput)
  }

  function openMonthPicker() {
    const picker = monthPickerRef.current
    if (picker) {
      try {
        if (typeof picker.showPicker === "function") {
          picker.showPicker()
          return
        }
        picker.focus()
        picker.click()
        return
      } catch (_error) {
        // showPicker/click が使えない環境ではインライン入力へフォールバックする
      }
    }
    setMonthDraft(monthInputValue)
    setIsMonthEditorOpen(true)
  }

  function onMonthDraftSubmit(event: FormEvent) {
    event.preventDefault()
    onSetMonth(monthDraft)
    setIsMonthEditorOpen(false)
  }

  useEffect(() => {
    setMonthDraft(monthInputValue)
  }, [monthInputValue])

  return (
    <>
      <section className="hero">
        <p className="hero-sub">企業横断で当月予定を一覧化します。日付単位で時刻・ステータス・備考を確認できます。</p>
      </section>

      <section className="panel timeline-toolbar">
        <h2>統合予定</h2>
        <div className="row timeline-row-month">
          <button type="button" className="month-badge month-badge-button" onClick={openMonthPicker}>
            {`${timelineMonth.getFullYear()}年${timelineMonth.getMonth() + 1}月`}
            <small>クリックで変更</small>
          </button>
          <input
            ref={monthPickerRef}
            className="month-picker-hidden"
            type="month"
            value={monthInputValue}
            onChange={(changeEvent) => {
              onSetMonth(changeEvent.target.value)
              setIsMonthEditorOpen(false)
            }}
            aria-label="表示月を変更"
          />
        </div>
        {isMonthEditorOpen && (
          <form className="row month-fallback-form" onSubmit={onMonthDraftSubmit}>
            <input
              className="month-fallback-input"
              type="month"
              value={monthDraft}
              onChange={(event) => setMonthDraft(event.target.value)}
              aria-label="表示月を YYYY-MM で入力"
            />
            <button type="submit">適用</button>
            <button type="button" className="button-secondary" onClick={() => setIsMonthEditorOpen(false)}>
              閉じる
            </button>
          </form>
        )}
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
                {group.events.map((event) => (
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
                      </span>
                    </div>
                    <div className="agenda-side">
                      <span className="agenda-company-status">{event.companyStatus || "未設定"}</span>
                      <span className="agenda-step-status">{event.stepStatus}</span>
                      {event.scheduledAt && <span className="agenda-step-time">{formatTimeLabel(event.scheduledAt)}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      <StepDetailModal event={activeEvent} onClose={() => setActiveEvent(null)} />
    </>
  )
}
