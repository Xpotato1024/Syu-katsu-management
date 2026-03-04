import type { AgendaEvent, AgendaGroup } from "../types"
import { formatDayLabel } from "../utils/date"

type AgendaViewProps = {
  timelineMonth: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onResetMonth: () => void
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
  onPrevMonth,
  onNextMonth,
  onResetMonth,
  calendarCompanyFilter,
  onCalendarCompanyFilterChange,
  onClearCalendarCompanyFilter,
  agendaEvents,
  agendaGroups,
  calendarFilteredCompanyCount,
  companiesCount
}: AgendaViewProps) {
  return (
    <>
      <section className="panel timeline-toolbar">
        <h2>統合予定</h2>
        <p className="muted">企業別ではなく、ユーザー全体の予定を日付ごとにまとめて表示します。</p>
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
          <input value={calendarCompanyFilter} onChange={(e) => onCalendarCompanyFilterChange(e.target.value)} placeholder="企業名で予定を絞り込み" />
          <button type="button" className="button-secondary" onClick={onClearCalendarCompanyFilter}>
            絞り込み解除
          </button>
        </div>
        <p className="muted timeline-meta">
          当月の予定件数: {agendaEvents.length}（表示企業 {calendarFilteredCompanyCount} / 全{companiesCount}）
        </p>
      </section>

      <section className="panel agenda-panel">
        {agendaEvents.length === 0 && <p className="muted">絞り込み条件に一致する予定がありません。企業管理で日程を追加して確認してください。</p>}

        <div className="agenda-days">
          {agendaGroups.map((group) => (
            <article key={`agenda-${group.dayKey}`} className="agenda-day">
              <header className="agenda-day-head">
                <strong>{formatDayLabel(group.dayKey)}</strong>
                <span>{group.events.length}件</span>
              </header>
              <div className="agenda-list">
                {group.events.map((event) => (
                  <div key={`${event.companyID}-${event.stepID}`} className="agenda-item">
                    <div className="agenda-main">
                      <span className="agenda-company">{event.companyName}</span>
                      <span className="agenda-step">{event.stepLabel}</span>
                    </div>
                    <div className="agenda-side">
                      <span className="agenda-company-status">{event.companyStatus || "未設定"}</span>
                      <span className="agenda-step-status">{event.stepStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
