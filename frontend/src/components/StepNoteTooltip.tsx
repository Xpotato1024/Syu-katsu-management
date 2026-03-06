type StepNoteTooltipProps = {
  note?: string
  triggerLabel?: string
}

const urlPattern = /(https?:\/\/[^\s<>"')]+)/g

function extractURLs(note: string): string[] {
  const matches = note.match(urlPattern) || []
  return Array.from(new Set(matches))
}

export function StepNoteTooltip({ note, triggerLabel = "詳細" }: StepNoteTooltipProps) {
  const text = (note || "").trim()
  if (!text) return null

  const urls = extractURLs(text)

  return (
    <span className="note-tooltip" tabIndex={0}>
      <span className="note-tooltip-trigger">{triggerLabel}</span>
      <span className="note-tooltip-content" role="tooltip">
        <span className="note-tooltip-text">{text}</span>
        {urls.length > 0 && (
          <span className="note-tooltip-links">
            {urls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            ))}
          </span>
        )}
      </span>
    </span>
  )
}
