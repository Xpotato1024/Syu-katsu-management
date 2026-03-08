import { useEffect, useMemo, useState } from "react"

type DateTimeFieldProps = {
  value: string
  onChange: (value: string) => void
  className?: string
  ariaLabel?: string
  step?: number
}

function shouldUseSplitInput(): boolean {
  if (typeof window === "undefined") return false
  const smallScreen = window.matchMedia("(max-width: 640px)").matches
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches
  return smallScreen || coarsePointer
}

function splitDateTimeValue(value: string): { date: string; time: string } {
  const candidate = value.trim()
  if (!candidate) return { date: "", time: "" }

  const parts = candidate.split("T")
  if (parts.length >= 2) {
    const date = parts[0] || ""
    const time = (parts[1] || "").slice(0, 5)
    return { date, time }
  }
  return { date: "", time: "" }
}

function resolveMinuteStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 5
  const minutes = Math.round(step / 60)
  if (minutes <= 0 || 60 % minutes !== 0) return 5
  return minutes
}

function buildNumberOptions(max: number, step = 1): string[] {
  const values: string[] = []
  for (let current = 0; current <= max; current += step) {
    values.push(String(current).padStart(2, "0"))
  }
  return values
}

export function DateTimeField({ value, onChange, className, ariaLabel = "日時", step = 300 }: DateTimeFieldProps) {
  const [useSplitInput, setUseSplitInput] = useState(shouldUseSplitInput)
  const { date, time } = useMemo(() => splitDateTimeValue(value), [value])
  const [hour = "", minute = ""] = time ? time.split(":") : ["", ""]
  const minuteStep = useMemo(() => resolveMinuteStep(step), [step])
  const hourOptions = useMemo(() => buildNumberOptions(23), [])
  const minuteOptions = useMemo(() => buildNumberOptions(59, minuteStep), [minuteStep])
  const visibleMinuteOptions = useMemo(() => {
    if (!minute || minuteOptions.includes(minute)) return minuteOptions
    return [...minuteOptions, minute].sort((left, right) => Number(left) - Number(right))
  }, [minute, minuteOptions])

  useEffect(() => {
    if (typeof window === "undefined") return
    const mqlScreen = window.matchMedia("(max-width: 640px)")
    const mqlPointer = window.matchMedia("(pointer: coarse)")
    const update = () => setUseSplitInput(mqlScreen.matches || mqlPointer.matches)

    update()
    mqlScreen.addEventListener("change", update)
    mqlPointer.addEventListener("change", update)
    return () => {
      mqlScreen.removeEventListener("change", update)
      mqlPointer.removeEventListener("change", update)
    }
  }, [])

  if (!useSplitInput) {
    return <input className={className} type="datetime-local" step={step} value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel} />
  }

  const wrapperClass = className ? `datetime-split ${className}` : "datetime-split"
  const nextHour = hour || "09"
  const nextMinute = minute || minuteOptions[0] || "00"

  return (
    <div className={wrapperClass}>
      <label className="datetime-split-field">
        <span className="datetime-split-label">日付</span>
        <input
          className="datetime-split-date"
          type="date"
          value={date}
          onChange={(event) => {
            const nextDate = event.target.value
            if (!nextDate) {
              onChange("")
              return
            }
            onChange(`${nextDate}T${nextHour}:${nextMinute}`)
          }}
          aria-label={`${ariaLabel} 日付`}
        />
      </label>
      <div className="datetime-split-field">
        <span className="datetime-split-label">時刻</span>
        <div className="datetime-split-time-group">
          <select
            className="datetime-split-time-select"
            value={hour}
            disabled={!date}
            onChange={(event) => {
              if (!date) return
              onChange(`${date}T${event.target.value || nextHour}:${minute || nextMinute}`)
            }}
            aria-label={`${ariaLabel} 時`}
          >
            {!date && <option value="">時</option>}
            {hourOptions.map((option) => (
              <option key={option} value={option}>
                {option}時
              </option>
            ))}
          </select>
          <span className="datetime-split-time-separator" aria-hidden="true">
            :
          </span>
          <select
            className="datetime-split-time-select"
            value={minute}
            disabled={!date}
            onChange={(event) => {
              if (!date) return
              onChange(`${date}T${hour || nextHour}:${event.target.value || nextMinute}`)
            }}
            aria-label={`${ariaLabel} 分`}
          >
            {!date && <option value="">分</option>}
            {visibleMinuteOptions.map((option) => (
              <option key={option} value={option}>
                {option}分
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
