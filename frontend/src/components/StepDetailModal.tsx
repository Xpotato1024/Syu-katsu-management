import { useEffect } from "react"
import type { AgendaEvent } from "../types"
import { formatDayLabel, formatDurationLabel, formatTimeLabel } from "../utils/date"
import { stepKindTone } from "../utils/selection"

type StepDetailModalProps = {
  event: AgendaEvent | null
  onClose: () => void
}

const urlPattern = /(https?:\/\/[^\s<>"')]+)/g

function extractURLs(note: string): string[] {
  const matches = note.match(urlPattern) || []
  return Array.from(new Set(matches))
}

export function StepDetailModal({ event, onClose }: StepDetailModalProps) {
  useEffect(() => {
    if (!event) return
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [event, onClose])

  if (!event) return null

  const note = (event.note || "").trim()
  const urls = extractURLs(note)
  const timeLabel = formatTimeLabel(event.scheduledAt)
  const durationLabel = formatDurationLabel(event.durationMinutes)

  return (
    <div className="event-modal-backdrop" onClick={onClose}>
      <section
        className="event-modal"
        role="dialog"
        aria-modal="true"
        aria-label="予定詳細"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <header className="event-modal-head">
          <div className="event-modal-title-wrap">
            <span className={`step-kind-tag ${stepKindTone(event.stepKind)}`}>{event.stepKind}</span>
            <h3>{event.stepLabel}</h3>
          </div>
          <button type="button" className="event-modal-close" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </header>

        <dl className="event-modal-grid">
          <dt>企業</dt>
          <dd>{event.companyName}</dd>
          <dt>日付</dt>
          <dd>{formatDayLabel(event.dayKey)}</dd>
          <dt>時刻</dt>
          <dd>{timeLabel || "未設定"}</dd>
          <dt>所要時間</dt>
          <dd>{durationLabel || "未設定"}</dd>
          <dt>ステータス</dt>
          <dd>{event.stepStatus}</dd>
          <dt>企業状況</dt>
          <dd>{event.companyStatus || "未設定"}</dd>
        </dl>

        <div className="event-modal-note">
          <p className="event-modal-note-title">備考</p>
          {note ? <p className="event-modal-note-text">{note}</p> : <p className="muted">備考はありません。</p>}
          {urls.length > 0 && (
            <div className="event-modal-links">
              {urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="event-modal-actions">
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              window.location.hash = "#/companies"
              onClose()
            }}
          >
            企業管理で編集
          </button>
        </div>
      </section>
    </div>
  )
}
