import { useMemo } from "react"
import { buildMonthOptions, buildYearOptions, splitMonthInputValue, toMonthInputValue } from "../utils/date"

type MonthSelectorProps = {
  value: Date
  onSetMonth: (value: string) => void
  onPrevMonth?: () => void
  onNextMonth?: () => void
}

export function MonthSelector({ value, onSetMonth, onPrevMonth, onNextMonth }: MonthSelectorProps) {
  const monthValue = useMemo(() => toMonthInputValue(value), [value])
  const { year, month } = useMemo(() => splitMonthInputValue(monthValue), [monthValue])
  const yearOptions = useMemo(() => buildYearOptions(year, 2, 5, value), [value, year])
  const monthOptions = useMemo(() => buildMonthOptions(), [])

  return (
    <div className="month-selector-grid">
      {onPrevMonth && (
        <button type="button" className="button-secondary month-selector-nav month-selector-prev" onClick={onPrevMonth}>
          前月
        </button>
      )}
      <label className="month-selector-field month-selector-year">
        <select value={year} onChange={(event) => onSetMonth(`${event.target.value}-${month || "01"}`)} aria-label="表示年を変更">
          {yearOptions.map((option) => (
            <option key={option} value={option}>
              {option}年
            </option>
          ))}
        </select>
      </label>
      <label className="month-selector-field month-selector-month">
        <select value={month} onChange={(event) => onSetMonth(`${year || String(value.getFullYear())}-${event.target.value}`)} aria-label="表示月を変更">
          {monthOptions.map((option) => (
            <option key={option} value={option}>
              {option}月
            </option>
          ))}
        </select>
      </label>
      {onNextMonth && (
        <button type="button" className="button-secondary month-selector-nav month-selector-next" onClick={onNextMonth}>
          次月
        </button>
      )}
    </div>
  )
}
