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

export function DateTimeField({ value, onChange, className, ariaLabel = "日時", step = 300 }: DateTimeFieldProps) {
  const [useSplitInput, setUseSplitInput] = useState(shouldUseSplitInput)
  const { date, time } = useMemo(() => splitDateTimeValue(value), [value])

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

  return (
    <div className={wrapperClass}>
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
          onChange(`${nextDate}T${time || "09:00"}`)
        }}
        aria-label={`${ariaLabel} 日付`}
      />
      <input
        className="datetime-split-time"
        type="time"
        step={step}
        value={time}
        onChange={(event) => {
          const nextTime = event.target.value
          if (!date) {
            return
          }
          onChange(`${date}T${nextTime || "00:00"}`)
        }}
        aria-label={`${ariaLabel} 時刻`}
      />
    </div>
  )
}
