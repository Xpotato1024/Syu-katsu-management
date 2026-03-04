import { Fragment } from "react"
import { weekdayShort } from "../constants"
import type { Company, SelectionStep, TimelineOverflowState } from "../types"
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
  scheduleRangeByCompany: Record<string, TimelineOverflowState>
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
  scheduleRangeByCompany,
  stepsByCompanyDay
}: TimelineViewProps) {
  return (
    <>
      <section className="panel timeline-toolbar">
        <h2>企業別カレンダー</h2>
        <p className="muted">表示範囲外の予定がある企業は、行の左右端を強調表示します。</p>
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
        <div className="timeline-scroll">
          <div className="timeline-grid" style={{ gridTemplateColumns: `220px repeat(${timelineDays.length}, minmax(84px, 1fr))` }}>
            <div className="timeline-header sticky-col">企業 / 日付</div>
            {timelineDays.map((day) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              return (
                <div key={`head-${day.toISOString()}`} className={isWeekend ? "timeline-header weekend" : "timeline-header"}>
                  <div>{day.getDate()}</div>
                  <small>{weekdayShort[day.getDay()]}</small>
                </div>
              )
            })}

            {calendarFilteredCompanies.map((company) => {
              const overflow = scheduleRangeByCompany[company.id] ?? { hasBefore: false, hasAfter: false }
              const companyClassName = ["timeline-company", "sticky-col", overflow.hasBefore ? "has-before" : "", overflow.hasAfter ? "has-after" : ""]
                .filter((value) => value !== "")
                .join(" ")

              return (
                <Fragment key={`row-${company.id}`}>
                  <div className={companyClassName}>
                    <strong>{company.name}</strong>
                    <small>{company.selectionStatus}</small>
                    {(overflow.hasBefore || overflow.hasAfter) && (
                      <span className="timeline-edge-note">
                        {overflow.hasBefore ? "← 前月に予定あり" : ""}
                        {overflow.hasBefore && overflow.hasAfter ? " / " : ""}
                        {overflow.hasAfter ? "翌月に予定あり →" : ""}
                      </span>
                    )}
                  </div>
                  {timelineDays.map((day, index) => {
                    const dayKey = toDateInputValue(day.toISOString())
                    const entries = stepsByCompanyDay[company.id]?.[dayKey] ?? []
                    const cellClassName = [
                      "timeline-cell",
                      index === 0 && overflow.hasBefore ? "overflow-left" : "",
                      index === timelineDays.length - 1 && overflow.hasAfter ? "overflow-right" : ""
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
