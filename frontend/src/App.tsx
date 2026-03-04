import { FormEvent, Fragment, useEffect, useMemo, useState } from 'react'
import './App.css'

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

type ViewKey = 'companies' | 'timeline'

const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api'
const logoutURL = import.meta.env.VITE_LOGOUT_URL ?? ''
const companyStatusOptions = ['未着手', '選考中', '内定', 'お見送り', '辞退']
const stepKindOptions = ['エントリー', 'ES', 'Webテスト', 'GD', '面接', '面談', '説明会', 'その他']
const stepStatusOptions = ['未着手', '予定', '実施済', '通過', '不通過', '辞退']
const weekdayShort = ['日', '月', '火', '水', '木', '金', '土']

function newStepDraft(kind = 'エントリー'): StepDraft {
  return { kind, title: '', status: '未着手' }
}

function parseViewFromHash(hash: string): ViewKey {
  const normalized = hash.replace(/^#\/?/, '')
  if (normalized === 'timeline') return 'timeline'
  return 'companies'
}

function viewHash(view: ViewKey): string {
  return view === 'timeline' ? '#/timeline' : '#/companies'
}

function toDateInputValue(value?: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
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

export function App() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [nameInput, setNameInput] = useState('')
  const [newCompanyStatus, setNewCompanyStatus] = useState(companyStatusOptions[0])
  const [newSteps, setNewSteps] = useState<StepDraft[]>([newStepDraft()])
  const [stepDraftByCompany, setStepDraftByCompany] = useState<Record<string, StepDraft>>({})
  const [stepEdits, setStepEdits] = useState<Record<string, StepEdit>>({})
  const [filterName, setFilterName] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingStepID, setSavingStepID] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [viewer, setViewer] = useState<AuthUser | null>(null)
  const [viewerError, setViewerError] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeView, setActiveView] = useState<ViewKey>(() => parseViewFromHash(window.location.hash))
  const [timelineMonth, setTimelineMonth] = useState<Date>(() => startOfMonth())

  async function loadViewer() {
    setViewerError('')
    try {
      const response = await fetch(`${apiBase}/me`)
      if (response.status === 401) {
        setViewer(null)
        setViewerError('未ログインです。Autheliaのログイン状態を確認してください。')
        return
      }
      if (!response.ok) throw new Error(`failed to load user: ${response.status}`)
      const data = (await response.json()) as AuthUser
      setViewer(data)
    } catch (_error) {
      setViewer(null)
      setViewerError('アカウント情報の取得に失敗しました。')
    }
  }

  async function loadCompanies(nameQuery = filterName, status = filterStatus) {
    const params = new URLSearchParams()
    if (nameQuery.trim()) params.set('q', nameQuery.trim())
    if (status) params.set('status', status)

    const url = params.toString() ? `${apiBase}/companies?${params.toString()}` : `${apiBase}/companies`
    setLoading(true)
    setErrorMessage('')
    try {
      const response = await fetch(url)
      if (response.status === 401) {
        setCompanies([])
        setErrorMessage('ログインセッションがありません。Autheliaでログインしてください。')
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
      setErrorMessage('企業一覧の取得に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  async function onCreateCompany(e: FormEvent) {
    e.preventDefault()
    if (!nameInput.trim()) return

    setSubmitting(true)
    setErrorMessage('')
    try {
      const response = await fetch(`${apiBase}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput,
          mypageLink: '',
          mypageId: '',
          selectionStatus: newCompanyStatus,
          selectionSteps: newSteps.map((step) => ({
            kind: step.kind,
            title: step.title,
            status: step.status
          })),
          esContent: '',
          researchContent: ''
        })
      })
      if (response.status === 401) {
        setErrorMessage('ログインセッションがありません。Autheliaでログインしてください。')
        return
      }
      if (!response.ok) throw new Error(`failed to create company: ${response.status}`)
    } catch (_error) {
      setErrorMessage('企業の追加に失敗しました。')
      return
    } finally {
      setSubmitting(false)
    }

    setNameInput('')
    setNewCompanyStatus(companyStatusOptions[0])
    setNewSteps([newStepDraft()])
    await loadCompanies()
  }

  async function onFilterSubmit(e: FormEvent) {
    e.preventDefault()
    await loadCompanies(filterName, filterStatus)
  }

  async function onClearFilter() {
    setFilterName('')
    setFilterStatus('')
    await loadCompanies('', '')
  }

  async function onAddStepToCompany(companyID: string) {
    const draft = stepDraftByCompany[companyID] ?? newStepDraft('面接')
    setErrorMessage('')
    try {
      const response = await fetch(`${apiBase}/companies/${companyID}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: draft.kind,
          title: draft.title,
          status: draft.status
        })
      })
      if (response.status === 401) {
        setErrorMessage('ログインセッションがありません。Autheliaでログインしてください。')
        return
      }
      if (!response.ok) throw new Error(`failed to add step: ${response.status}`)
      setStepDraftByCompany((prev) => ({ ...prev, [companyID]: newStepDraft('面接') }))
      await loadCompanies()
    } catch (_error) {
      setErrorMessage('選考ステップの追加に失敗しました。')
    }
  }

  async function onSaveStep(companyID: string, stepID: string) {
    const edit = stepEdits[stepID]
    if (!edit) return

    setSavingStepID(stepID)
    setErrorMessage('')
    try {
      const response = await fetch(`${apiBase}/companies/${companyID}/steps/${stepID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: edit.status,
          scheduledAt: edit.scheduledAt
        })
      })
      if (response.status === 401) {
        setErrorMessage('ログインセッションがありません。Autheliaでログインしてください。')
        return
      }
      if (!response.ok) throw new Error(`failed to update step: ${response.status}`)
      await loadCompanies()
    } catch (_error) {
      setErrorMessage('選考ステップの更新に失敗しました。')
    } finally {
      setSavingStepID('')
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
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const timelineDays = useMemo(() => buildMonthDays(timelineMonth), [timelineMonth])
  const timelineRows = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name, 'ja')),
    [companies]
  )
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
  const hasScheduledSteps = useMemo(() => {
    return companies.some((company) => company.selectionSteps.some((step) => !!toDateInputValue(step.scheduledAt)))
  }, [companies])

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
          <span className="view-chip">{activeView === 'companies' ? '企業管理' : '選考カレンダー'}</span>
          <span className="user-chip">{viewer?.name || viewer?.id || 'ゲスト'}</span>
        </div>
      </header>

      <aside id="global-menu" className={isMenuOpen ? 'drawer open' : 'drawer'}>
        <p className="drawer-title">メニュー</p>
        <div className="drawer-group">
          <button
            type="button"
            className={activeView === 'companies' ? 'drawer-item active' : 'drawer-item'}
            onClick={() => navigateTo('companies')}
          >
            企業管理
          </button>
          <button
            type="button"
            className={activeView === 'timeline' ? 'drawer-item active' : 'drawer-item'}
            onClick={() => navigateTo('timeline')}
          >
            選考カレンダー
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
            <p className="muted">{viewerError || 'アカウント情報を読み込み中...'}</p>
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
        className={isMenuOpen ? 'drawer-backdrop show' : 'drawer-backdrop'}
        aria-label="メニューを閉じる"
        onClick={() => setIsMenuOpen(false)}
      />

      {activeView === 'companies' && (
        <>
          <section className="hero">
            <p className="hero-sub">企業ごとの選考ステップを登録し、日程と進捗をあとから更新できます。</p>
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
                <button type="button" className="button-secondary" onClick={() => setNewSteps((prev) => [...prev, newStepDraft('面接')])}>
                  ステップ追加
                </button>
              </div>

              <div className="actions">
                <button type="submit" disabled={submitting}>
                  {submitting ? '追加中...' : '企業を追加'}
                </button>
              </div>
            </form>
          </section>

          {errorMessage && <p className="error">{errorMessage}</p>}
          {loading && <p className="muted">読み込み中...</p>}

          <section className="company-grid">
            {companies.map((company) => {
              const inlineDraft = stepDraftByCompany[company.id] ?? newStepDraft('面接')
              return (
                <article key={company.id} className="company-card">
                  <header className="company-head">
                    <h3>{company.name}</h3>
                    <span className="badge">{company.selectionStatus || '未設定'}</span>
                  </header>
                  <p className="muted">{company.selectionFlow || '選考フロー未設定'}</p>

                  <div className="step-list">
                    {(company.selectionSteps || []).map((step) => {
                      const edit = stepEdits[step.id] ?? {
                        status: step.status || stepStatusOptions[0],
                        scheduledAt: toDateInputValue(step.scheduledAt)
                      }
                      return (
                        <div key={step.id} className="step-item">
                          <div className="step-label">
                            <span className="kind">{step.kind}</span>
                            <strong>{step.title || step.kind}</strong>
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
                              {savingStepID === step.id ? '保存中...' : '保存'}
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
                    <button type="button" className="button-secondary" onClick={() => void onAddStepToCompany(company.id)}>
                      この企業にステップ追加
                    </button>
                  </div>
                </article>
              )
            })}
          </section>

          {!loading && companies.length === 0 && <p className="muted">該当する企業はありません。</p>}
        </>
      )}

      {activeView === 'timeline' && (
        <>
          <section className="panel timeline-toolbar">
            <h2>選考カレンダー</h2>
            <p className="muted">縦軸に企業、横軸に日付を配置しています。日程は企業管理画面で編集できます。</p>
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
          </section>

          <section className="panel timeline-panel">
            {!hasScheduledSteps && (
              <p className="muted">
                日程が設定された選考ステップがありません。企業管理画面でステップの日程を入力すると、ここに表示されます。
              </p>
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
                    <div key={`head-${day.toISOString()}`} className={isWeekend ? 'timeline-header weekend' : 'timeline-header'}>
                      <div>{day.getDate()}</div>
                      <small>{weekdayShort[day.getDay()]}</small>
                    </div>
                  )
                })}

                {timelineRows.map((company) => (
                  <Fragment key={`row-${company.id}`}>
                    <div className="timeline-company sticky-col">
                      <strong>{company.name}</strong>
                      <small>{company.selectionStatus}</small>
                    </div>
                    {timelineDays.map((day) => {
                      const dayKey = toDateInputValue(day.toISOString())
                      const entries = stepsByCompanyDay[company.id]?.[dayKey] ?? []
                      return (
                        <div key={`${company.id}-${dayKey}`} className="timeline-cell">
                          {entries.map((step) => (
                            <div key={step.id} className="timeline-event">
                              <span>{step.title || step.kind}</span>
                              <small>{step.status}</small>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
