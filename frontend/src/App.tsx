import { FormEvent, Fragment, useEffect, useMemo, useState } from "react"
import "./App.css"

type SelectionStep = {
  id: string
  kind: string
  title: string
  status: string
  scheduledAt?: string
}

type Company = {
  id: string
  name: string
  selectionStatus: string
  selectionFlow: string
  selectionSteps: SelectionStep[]
}

type StepDraft = {
  kind: string
  title: string
  status: string
}

type StepEdit = {
  status: string
  scheduledAt: string
}

type AuthUser = {
  id: string
  name?: string
  email?: string
  provider: string
}

type ViewKey = "companies" | "timeline" | "agenda"

type TimelineOverflowState = {
  hasBefore: boolean
  hasAfter: boolean
}

type AgendaEvent = {
  dayKey: string
  companyID: string
  companyName: string
  companyStatus: string
  stepID: string
  stepLabel: string
  stepStatus: string
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api"
const logoutURL = import.meta.env.VITE_LOGOUT_URL ?? ""
const companyStatusOptions = ["未着手", "選考中", "内定", "お見送り", "辞退"]
const stepKindOptions = ["エントリー", "ES", "Webテスト", "GD", "面接", "面談", "説明会", "その他"]
const stepStatusOptions = ["未着手", "予定", "実施済", "通過", "不通過", "辞退"]
const weekdayShort = ["日", "月", "火", "水", "木", "金", "土"]

const pendingStepStatuses = new Set(["未着手", "予定"])
const completedStepStatuses = new Set(["実施済", "通過"])
const stoppedStepStatuses = new Set(["不通過", "辞退"])

function newStepDraft(kind = "エントリー"): StepDraft {
  return { kind, title: "", status: "未着手" }
}

function parseViewFromHash(hash: string): ViewKey {
  const normalized = hash.replace(/^#\/?/, "")
  if (normalized === "timeline") return "timeline"
  if (normalized === "agenda") return "agenda"
  return "companies"
}

function viewHash(view: ViewKey): string {
  if (view === "timeline") return "#/timeline"
  if (view === "agenda") return "#/agenda"
  return "#/companies"
}

function viewLabel(view: ViewKey): string {
  if (view === "timeline") return "企業別カレンダー"
  if (view === "agenda") return "統合予定"
  return "企業管理"
}

function toDateInputValue(value?: string): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function startOfMonth(base = new Date()): Date {
  return new Date(base.getFullYear(), base.getMonth(), 1)
}

function shiftMonth(base: Date, delta: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1)
}

function buildMonthDays(base: Date): Date[] {
  const days: Date[] = []
  const year = base.getFullYear()
  const month = base.getMonth()
  const last = new Date(year, month + 1, 0).getDate()
  for (let i = 1; i <= last; i++) {
    days.push(new Date(year, month, i))
  }
  return days
}

function stepLabel(step: SelectionStep): string {
  return step.title || step.kind
}

function resolveCurrentStepIndex(steps: SelectionStep[]): number {
  if (steps.length === 0) return -1

  const firstPending = steps.findIndex((step) => pendingStepStatuses.has(step.status))
  if (firstPending >= 0) return firstPending

  const firstStopped = steps.findIndex((step) => stoppedStepStatuses.has(step.status))
  if (firstStopped >= 0) return firstStopped

  return steps.length - 1
}

function stepVisualState(status: string): "pending" | "done" | "stopped" {
  if (completedStepStatuses.has(status)) return "done"
  if (stoppedStepStatuses.has(status)) return "stopped"
  return "pending"
}

function formatDayLabel(dayKey: string): string {
  const day = new Date(`${dayKey}T00:00:00`)
  return `${day.getMonth() + 1}/${day.getDate()}（${weekdayShort[day.getDay()]}）`
}

export function App() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [nameInput, setNameInput] = useState("")
  const [newCompanyStatus, setNewCompanyStatus] = useState(companyStatusOptions[0])
  const [newSteps, setNewSteps] = useState<StepDraft[]>([newStepDraft()])
  const [stepDraftByCompany, setStepDraftByCompany] = useState<Record<string, StepDraft>>({})
  const [stepEdits, setStepEdits] = useState<Record<string, StepEdit>>({})
  const [expandedCompanyIDs, setExpandedCompanyIDs] = useState<Record<string, boolean>>({})
  const [filterName, setFilterName] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [calendarCompanyFilter, setCalendarCompanyFilter] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingStepID, setSavingStepID] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [viewer, setViewer] = useState<AuthUser | null>(null)
  const [viewerError, setViewerError] = useState("")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeView, setActiveView] = useState<ViewKey>(() => parseViewFromHash(window.location.hash))
  const [timelineMonth, setTimelineMonth] = useState<Date>(() => startOfMonth())

  async function loadViewer() {
    setViewerError("")
    try {
      const response = await fetch(`${apiBase}/me`)
      if (response.status === 401) {
        setViewer(null)
        setViewerError("未ログインです。Autheliaのログイン状態を確認してください。")
        return
      }
      if (!response.ok) throw new Error(`failed to load user: ${response.status}`)
      const data = (await response.json()) as AuthUser
      setViewer(data)
    } catch (_error) {
      setViewer(null)
      setViewerError("アカウント情報の取得に失敗しました。")
    }
  }

  async function loadCompanies(nameQuery = filterName, status = filterStatus) {
    const params = new URLSearchParams()
    if (nameQuery.trim()) params.set("q", nameQuery.trim())
    if (status) params.set("status", status)

    const url = params.toString() ? `${apiBase}/companies?${params.toString()}` : `${apiBase}/companies`
    setLoading(true)
    setErrorMessage("")
    try {
      const response = await fetch(url)
      if (response.status === 401) {
        setCompanies([])
        setErrorMessage("ログインセッションがありません。Autheliaでログインしてください。")
        return
      }
      if (!response.ok) throw new Error(`failed to load companies: ${response.status}`)
      const data = (await response.json()) as Company[]
      setCompanies(data)
      setStepEdits((prev) => {
        const next = { ...prev }
        for (const company of data) {
          for (const step of company.selectionSteps || []) {
            if (!next[step.id]) {
              next[step.id] = {
                status: step.status || stepStatusOptions[0],
                scheduledAt: toDateInputValue(step.scheduledAt)
              }
            }
          }
        }
        return next
      })
    } catch (_error) {
      setErrorMessage("企業一覧の取得に失敗しました。")
    } finally {
      setLoading(false)
    }
  }

  async function onCreateCompany(e: FormEvent) {
    e.preventDefault()
    if (!nameInput.trim()) return

    setSubmitting(true)
    setErrorMessage("")
    try {
      const response = await fetch(`${apiBase}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput,
          mypageLink: "",
          mypageId: "",
          selectionStatus: newCompanyStatus,
          selectionSteps: newSteps.map((step) => ({
            kind: step.kind,
            title: step.title,
            status: step.status
          })),
          esContent: "",
          researchContent: ""
        })
      })
      if (response.status === 401) {
        setErrorMessage("ログインセッションがありません。Autheliaでログインしてください。")
        return
      }
      if (!response.ok) throw new Error(`failed to create company: ${response.status}`)
    } catch (_error) {
      setErrorMessage("企業の追加に失敗しました。")
      return
    } finally {
      setSubmitting(false)
    }

    setNameInput("")
    setNewCompanyStatus(companyStatusOptions[0])
    setNewSteps([newStepDraft()])
    await loadCompanies()
  }

  async function onFilterSubmit(e: FormEvent) {
    e.preventDefault()
    await loadCompanies(filterName, filterStatus)
  }

  async function onClearFilter() {
    setFilterName("")
    setFilterStatus("")
    await loadCompanies("", "")
  }

  async function onAddStepToCompany(companyID: string) {
    const draft = stepDraftByCompany[companyID] ?? newStepDraft("面接")
    setErrorMessage("")
    try {
      const response = await fetch(`${apiBase}/companies/${companyID}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: draft.kind,
          title: draft.title,
          status: draft.status
        })
      })
      if (response.status === 401) {
        setErrorMessage("ログインセッションがありません。Autheliaでログインしてください。")
        return
      }
      if (!response.ok) throw new Error(`failed to add step: ${response.status}`)
      setStepDraftByCompany((prev) => ({ ...prev, [companyID]: newStepDraft("面接") }))
      await loadCompanies()
    } catch (_error) {
      setErrorMessage("選考ステップの追加に失敗しました。")
    }
  }

  async function onSaveStep(companyID: string, stepID: string) {
    const edit = stepEdits[stepID]
    if (!edit) return

    setSavingStepID(stepID)
    setErrorMessage("")
    try {
      const response = await fetch(`${apiBase}/companies/${companyID}/steps/${stepID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: edit.status,
          scheduledAt: edit.scheduledAt
        })
      })
      if (response.status === 401) {
        setErrorMessage("ログインセッションがありません。Autheliaでログインしてください。")
        return
      }
      if (!response.ok) throw new Error(`failed to update step: ${response.status}`)
      await loadCompanies()
    } catch (_error) {
      setErrorMessage("選考ステップの更新に失敗しました。")
    } finally {
      setSavingStepID("")
    }
  }
  function navigateTo(view: ViewKey) {
    setIsMenuOpen(false)
    setActiveView(view)
    const hash = viewHash(view)
    if (window.location.hash !== hash) {
      window.location.hash = hash
    }
  }

  function toggleCompanyDetail(companyID: string) {
    setExpandedCompanyIDs((prev) => ({ ...prev, [companyID]: !prev[companyID] }))
  }

  useEffect(() => {
    void loadViewer()
    void loadCompanies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      setActiveView(parseViewFromHash(window.location.hash))
    }
    onHashChange()
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    setExpandedCompanyIDs((prev) => {
      const next: Record<string, boolean> = {}
      for (const company of companies) {
        if (prev[company.id]) next[company.id] = true
      }
      return next
    })
  }, [companies])

  const timelineDays = useMemo(() => buildMonthDays(timelineMonth), [timelineMonth])
  const timelineMonthStartKey = useMemo(() => {
    if (timelineDays.length === 0) return ""
    return toDateInputValue(timelineDays[0].toISOString())
  }, [timelineDays])
  const timelineMonthEndKey = useMemo(() => {
    if (timelineDays.length === 0) return ""
    return toDateInputValue(timelineDays[timelineDays.length - 1].toISOString())
  }, [timelineDays])

  const timelineRows = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name, "ja")),
    [companies]
  )

  const calendarFilteredCompanies = useMemo(() => {
    const query = calendarCompanyFilter.trim().toLowerCase()
    if (!query) return timelineRows
    return timelineRows.filter((company) => company.name.toLowerCase().includes(query))
  }, [timelineRows, calendarCompanyFilter])

  const stepsByCompanyDay = useMemo(() => {
    const map: Record<string, Record<string, SelectionStep[]>> = {}
    for (const company of companies) {
      map[company.id] = {}
      for (const step of company.selectionSteps || []) {
        const dayKey = toDateInputValue(step.scheduledAt)
        if (!dayKey) continue
        if (!map[company.id][dayKey]) {
          map[company.id][dayKey] = []
        }
        map[company.id][dayKey].push(step)
      }
    }
    return map
  }, [companies])

  const scheduleRangeByCompany = useMemo(() => {
    const map: Record<string, TimelineOverflowState> = {}
    for (const company of companies) {
      const dayKeys = (company.selectionSteps || [])
        .map((step) => toDateInputValue(step.scheduledAt))
        .filter((value) => value !== "")

      map[company.id] = {
        hasBefore: timelineMonthStartKey ? dayKeys.some((dayKey) => dayKey < timelineMonthStartKey) : false,
        hasAfter: timelineMonthEndKey ? dayKeys.some((dayKey) => dayKey > timelineMonthEndKey) : false
      }
    }
    return map
  }, [companies, timelineMonthStartKey, timelineMonthEndKey])

  const hasScheduledSteps = useMemo(() => {
    return companies.some((company) => company.selectionSteps.some((step) => !!toDateInputValue(step.scheduledAt)))
  }, [companies])

  const hasScheduledStepsForFilteredCompanies = useMemo(() => {
    return calendarFilteredCompanies.some((company) =>
      company.selectionSteps.some((step) => !!toDateInputValue(step.scheduledAt))
    )
  }, [calendarFilteredCompanies])

  const agendaEvents = useMemo(() => {
    if (!timelineMonthStartKey || !timelineMonthEndKey) return []

    const events: AgendaEvent[] = []
    for (const company of calendarFilteredCompanies) {
      for (const step of company.selectionSteps || []) {
        const dayKey = toDateInputValue(step.scheduledAt)
        if (!dayKey) continue
        if (dayKey < timelineMonthStartKey || dayKey > timelineMonthEndKey) continue

        events.push({
          dayKey,
          companyID: company.id,
          companyName: company.name,
          companyStatus: company.selectionStatus,
          stepID: step.id,
          stepLabel: stepLabel(step),
          stepStatus: step.status
        })
      }
    }

    events.sort((a, b) => {
      if (a.dayKey !== b.dayKey) return a.dayKey.localeCompare(b.dayKey)
      const companyCompare = a.companyName.localeCompare(b.companyName, "ja")
      if (companyCompare !== 0) return companyCompare
      return a.stepLabel.localeCompare(b.stepLabel, "ja")
    })

    return events
  }, [calendarFilteredCompanies, timelineMonthStartKey, timelineMonthEndKey])

  const agendaGroups = useMemo(() => {
    const groups = new Map<string, AgendaEvent[]>()
    for (const event of agendaEvents) {
      if (!groups.has(event.dayKey)) {
        groups.set(event.dayKey, [])
      }
      groups.get(event.dayKey)?.push(event)
    }
    return Array.from(groups.entries()).map(([dayKey, events]) => ({ dayKey, events }))
  }, [agendaEvents])

  return (
    <main className="app-shell">
      <header className="topbar">
        <button
          className="icon-button"
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-label="メニュー"
          aria-expanded={isMenuOpen}
          aria-controls="global-menu"
        >
          <span />
          <span />
          <span />
        </button>
        <div className="topbar-title">
          <p className="eyebrow">Job Hunting Tracker</p>
          <h1>就活フロー管理</h1>
        </div>
        <div className="topbar-meta">
          <span className="view-chip">{viewLabel(activeView)}</span>
          <span className="user-chip">{viewer?.name || viewer?.id || "ゲスト"}</span>
        </div>
      </header>

      <aside id="global-menu" className={isMenuOpen ? "drawer open" : "drawer"}>
        <p className="drawer-title">メニュー</p>
        <div className="drawer-group">
          <button
            type="button"
            className={activeView === "companies" ? "drawer-item active" : "drawer-item"}
            onClick={() => navigateTo("companies")}
          >
            企業管理
          </button>
          <button
            type="button"
            className={activeView === "timeline" ? "drawer-item active" : "drawer-item"}
            onClick={() => navigateTo("timeline")}
          >
            企業別カレンダー
          </button>
          <button
            type="button"
            className={activeView === "agenda" ? "drawer-item active" : "drawer-item"}
            onClick={() => navigateTo("agenda")}
          >
            統合予定
          </button>
        </div>
        <div className="drawer-divider" />
        <div className="drawer-group">
          <p className="drawer-subtitle">アカウント</p>
          {viewer ? (
            <div className="account-card">
              <strong>{viewer.name || viewer.id}</strong>
              <small>ID: {viewer.id}</small>
              {viewer.email && <small>{viewer.email}</small>}
              <small>provider: {viewer.provider}</small>
            </div>
          ) : (
            <p className="muted">{viewerError || "アカウント情報を読み込み中..."}</p>
          )}
          <button
            type="button"
            className="drawer-item"
            onClick={() => {
              setIsMenuOpen(false)
              void loadViewer()
              void loadCompanies()
            }}
          >
            情報を再読み込み
          </button>
          {logoutURL && (
            <a className="drawer-link" href={logoutURL}>
              ログアウト
            </a>
          )}
        </div>
      </aside>
      <button
        type="button"
        className={isMenuOpen ? "drawer-backdrop show" : "drawer-backdrop"}
        aria-label="メニューを閉じる"
        onClick={() => setIsMenuOpen(false)}
      />

      {activeView === "companies" && (
        <>
          <section className="hero">
            <p className="hero-sub">企業カードは初期表示でフローのみ。必要な企業だけ詳細を展開して編集できます。</p>
          </section>

          <section className="panel">
            <h2>企業検索</h2>
            <form onSubmit={onFilterSubmit} className="row">
              <input value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder="企業名で検索" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">全ステータス</option>
                {companyStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button type="submit">絞り込み</button>
              <button type="button" className="button-secondary" onClick={() => void onClearFilter()}>
                クリア
              </button>
            </form>
          </section>

          <section className="panel">
            <h2>企業追加</h2>
            <form onSubmit={onCreateCompany} className="stack">
              <div className="row">
                <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="企業名" />
                <select value={newCompanyStatus} onChange={(e) => setNewCompanyStatus(e.target.value)}>
                  {companyStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="step-builder">
                <p>初期選考フロー</p>
                {newSteps.map((step, index) => (
                  <div className="row" key={`new-step-${index}`}>
                    <select
                      value={step.kind}
                      onChange={(e) =>
                        setNewSteps((prev) =>
                          prev.map((s, i) => (i === index ? { ...s, kind: e.target.value } : s))
                        )
                      }
                    >
                      {stepKindOptions.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                    <input
                      value={step.title}
                      onChange={(e) =>
                        setNewSteps((prev) =>
                          prev.map((s, i) => (i === index ? { ...s, title: e.target.value } : s))
                        )
                      }
                      placeholder="表示名（任意）"
                    />
                    <select
                      value={step.status}
                      onChange={(e) =>
                        setNewSteps((prev) =>
                          prev.map((s, i) => (i === index ? { ...s, status: e.target.value } : s))
                        )
                      }
                    >
                      {stepStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => setNewSteps((prev) => prev.filter((_, i) => i !== index))}
                      disabled={newSteps.length <= 1}
                    >
                      削除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setNewSteps((prev) => [...prev, newStepDraft("面接")])}
                >
                  ステップ追加
                </button>
              </div>

              <div className="actions">
                <button type="submit" disabled={submitting}>
                  {submitting ? "追加中..." : "企業を追加"}
                </button>
              </div>
            </form>
          </section>

          {errorMessage && <p className="error">{errorMessage}</p>}
          {loading && <p className="muted">読み込み中...</p>}

          <section className="company-grid">
            {companies.map((company) => {
              const steps = company.selectionSteps || []
              const currentStepIndex = resolveCurrentStepIndex(steps)
              const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null
              const isExpanded = !!expandedCompanyIDs[company.id]
              const inlineDraft = stepDraftByCompany[company.id] ?? newStepDraft("面接")

              return (
                <article key={company.id} className="company-card">
                  <header className="company-head">
                    <div className="company-heading">
                      <h3>{company.name}</h3>
                      <span className="badge">{company.selectionStatus || "未設定"}</span>
                    </div>
                    <button
                      type="button"
                      className="button-secondary company-toggle"
                      onClick={() => toggleCompanyDetail(company.id)}
                    >
                      {isExpanded ? "詳細を閉じる" : "詳細を開く"}
                    </button>
                  </header>

                  <div className="flow-summary">
                    <p className="flow-current">
                      {currentStep
                        ? `現在: ${stepLabel(currentStep)}（${currentStep.status}）`
                        : `現在: ${company.selectionStatus || "未設定"}`}
                    </p>
                    <div className="flow-strip">
                      {steps.length === 0 ? (
                        <span className="flow-empty">選考フロー未設定</span>
                      ) : (
                        steps.map((step, index) => {
                          const stateClass = stepVisualState(step.status)
                          const className =
                            index === currentStepIndex
                              ? `flow-node ${stateClass} current`
                              : `flow-node ${stateClass}`
                          return (
                            <Fragment key={step.id}>
                              <div className={className}>
                                <strong>{stepLabel(step)}</strong>
                                <small>{step.status}</small>
                              </div>
                              {index < steps.length - 1 && <span className="flow-arrow">→</span>}
                            </Fragment>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="company-detail">
                      <p className="muted detail-caption">
                        ステップ詳細を編集できます。フロー: {company.selectionFlow || "未設定"}
                      </p>

                      <div className="step-list">
                        {steps.map((step) => {
                          const edit = stepEdits[step.id] ?? {
                            status: step.status || stepStatusOptions[0],
                            scheduledAt: toDateInputValue(step.scheduledAt)
                          }
                          return (
                            <div key={step.id} className="step-item">
                              <div className="step-label">
                                <span className="kind">{step.kind}</span>
                                <strong>{stepLabel(step)}</strong>
                              </div>
                              <div className="row step-row">
                                <select
                                  value={edit.status}
                                  onChange={(e) =>
                                    setStepEdits((prev) => ({
                                      ...prev,
                                      [step.id]: { ...edit, status: e.target.value }
                                    }))
                                  }
                                >
                                  {stepStatusOptions.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="date"
                                  value={edit.scheduledAt}
                                  onChange={(e) =>
                                    setStepEdits((prev) => ({
                                      ...prev,
                                      [step.id]: { ...edit, scheduledAt: e.target.value }
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() => void onSaveStep(company.id, step.id)}
                                  disabled={savingStepID === step.id}
                                >
                                  {savingStepID === step.id ? "保存中..." : "保存"}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="inline-step-add">
                        <div className="row">
                          <select
                            value={inlineDraft.kind}
                            onChange={(e) =>
                              setStepDraftByCompany((prev) => ({
                                ...prev,
                                [company.id]: { ...inlineDraft, kind: e.target.value }
                              }))
                            }
                          >
                            {stepKindOptions.map((kind) => (
                              <option key={kind} value={kind}>
                                {kind}
                              </option>
                            ))}
                          </select>
                          <input
                            value={inlineDraft.title}
                            onChange={(e) =>
                              setStepDraftByCompany((prev) => ({
                                ...prev,
                                [company.id]: { ...inlineDraft, title: e.target.value }
                              }))
                            }
                            placeholder="追加ステップ名（任意）"
                          />
                          <select
                            value={inlineDraft.status}
                            onChange={(e) =>
                              setStepDraftByCompany((prev) => ({
                                ...prev,
                                [company.id]: { ...inlineDraft, status: e.target.value }
                              }))
                            }
                          >
                            {stepStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => void onAddStepToCompany(company.id)}
                        >
                          この企業にステップ追加
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </section>

          {!loading && companies.length === 0 && <p className="muted">該当する企業はありません。</p>}
        </>
      )}
      {activeView === "timeline" && (
        <>
          <section className="panel timeline-toolbar">
            <h2>企業別カレンダー</h2>
            <p className="muted">表示範囲外の予定がある企業は、行の左右端を強調表示します。</p>
            <div className="row">
              <button type="button" className="button-secondary" onClick={() => setTimelineMonth((prev) => shiftMonth(prev, -1))}>
                前月
              </button>
              <div className="month-badge">{`${timelineMonth.getFullYear()}年${timelineMonth.getMonth() + 1}月`}</div>
              <button type="button" className="button-secondary" onClick={() => setTimelineMonth((prev) => shiftMonth(prev, 1))}>
                次月
              </button>
              <button type="button" onClick={() => setTimelineMonth(startOfMonth())}>
                今月へ
              </button>
            </div>
            <div className="row">
              <input
                value={calendarCompanyFilter}
                onChange={(e) => setCalendarCompanyFilter(e.target.value)}
                placeholder="企業名でカレンダー表示を絞り込み"
              />
              <button type="button" className="button-secondary" onClick={() => setCalendarCompanyFilter("")}>
                絞り込み解除
              </button>
            </div>
            <p className="muted timeline-meta">表示企業: {calendarFilteredCompanies.length} / 全{companies.length}</p>
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
            {calendarFilteredCompanies.length === 0 && (
              <p className="muted">絞り込み条件に一致する企業がありません。</p>
            )}
            <div className="timeline-scroll">
              <div
                className="timeline-grid"
                style={{ gridTemplateColumns: `220px repeat(${timelineDays.length}, minmax(84px, 1fr))` }}
              >
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
                  const companyClassName = [
                    "timeline-company",
                    "sticky-col",
                    overflow.hasBefore ? "has-before" : "",
                    overflow.hasAfter ? "has-after" : ""
                  ]
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
      )}

      {activeView === "agenda" && (
        <>
          <section className="panel timeline-toolbar">
            <h2>統合予定</h2>
            <p className="muted">企業別ではなく、ユーザー全体の予定を日付ごとにまとめて表示します。</p>
            <div className="row">
              <button type="button" className="button-secondary" onClick={() => setTimelineMonth((prev) => shiftMonth(prev, -1))}>
                前月
              </button>
              <div className="month-badge">{`${timelineMonth.getFullYear()}年${timelineMonth.getMonth() + 1}月`}</div>
              <button type="button" className="button-secondary" onClick={() => setTimelineMonth((prev) => shiftMonth(prev, 1))}>
                次月
              </button>
              <button type="button" onClick={() => setTimelineMonth(startOfMonth())}>
                今月へ
              </button>
            </div>
            <div className="row">
              <input
                value={calendarCompanyFilter}
                onChange={(e) => setCalendarCompanyFilter(e.target.value)}
                placeholder="企業名で予定を絞り込み"
              />
              <button type="button" className="button-secondary" onClick={() => setCalendarCompanyFilter("")}>
                絞り込み解除
              </button>
            </div>
            <p className="muted timeline-meta">
              当月の予定件数: {agendaEvents.length}（表示企業 {calendarFilteredCompanies.length} / 全{companies.length}）
            </p>
          </section>

          <section className="panel agenda-panel">
            {agendaEvents.length === 0 && (
              <p className="muted">絞り込み条件に一致する予定がありません。企業管理で日程を追加して確認してください。</p>
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
      )}
    </main>
  )
}
