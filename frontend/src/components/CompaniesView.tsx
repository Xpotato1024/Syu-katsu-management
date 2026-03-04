import { Fragment, type FormEvent, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { companyStatusOptions, stepKindOptions, stepStatusOptions } from "../constants"
import type { Company, CompanyDetailEdit, StepDraft, StepEdit } from "../types"
import { newStepDraft, resolveCurrentStepIndex, stepLabel, stepVisualState } from "../utils/selection"
import { toDateInputValue } from "../utils/date"

type CompaniesViewProps = {
  companies: Company[]
  loading: boolean
  submitting: boolean
  savingStepID: string
  errorMessage: string
  filterName: string
  filterStatus: string
  nameInput: string
  newCompanyStatus: string
  newSteps: StepDraft[]
  stepDraftByCompany: Record<string, StepDraft>
  stepEdits: Record<string, StepEdit>
  companyEdits: Record<string, CompanyDetailEdit>
  expandedCompanyIDs: Record<string, boolean>
  onFilterNameChange: (value: string) => void
  onFilterStatusChange: (value: string) => void
  onFilterSubmit: (event: FormEvent) => void
  onClearFilter: () => void
  onNameInputChange: (value: string) => void
  onNewCompanyStatusChange: (value: string) => void
  onUpdateNewStep: (index: number, patch: Partial<StepDraft>) => void
  onRemoveNewStep: (index: number) => void
  onAddNewStep: () => void
  onCreateCompany: (event: FormEvent) => void
  onToggleCompanyDetail: (companyID: string) => void
  onUpdateStepEdit: (stepID: string, patch: Partial<StepEdit>) => void
  onSaveStep: (companyID: string, stepID: string) => void
  onUpdateCompanyEdit: (companyID: string, patch: Partial<CompanyDetailEdit>) => void
  onApplyResearchTemplate: (companyID: string) => void
  onSaveCompanyDetail: (companyID: string) => void
  savingCompanyID: string
  onUpdateInlineDraft: (companyID: string, patch: Partial<StepDraft>) => void
  onAddStepToCompany: (companyID: string) => void
}

export function CompaniesView({
  companies,
  loading,
  submitting,
  savingStepID,
  errorMessage,
  filterName,
  filterStatus,
  nameInput,
  newCompanyStatus,
  newSteps,
  stepDraftByCompany,
  stepEdits,
  companyEdits,
  expandedCompanyIDs,
  onFilterNameChange,
  onFilterStatusChange,
  onFilterSubmit,
  onClearFilter,
  onNameInputChange,
  onNewCompanyStatusChange,
  onUpdateNewStep,
  onRemoveNewStep,
  onAddNewStep,
  onCreateCompany,
  onToggleCompanyDetail,
  onUpdateStepEdit,
  onSaveStep,
  onUpdateCompanyEdit,
  onApplyResearchTemplate,
  onSaveCompanyDetail,
  savingCompanyID,
  onUpdateInlineDraft,
  onAddStepToCompany
}: CompaniesViewProps) {
  const [docModeByKey, setDocModeByKey] = useState<Record<string, "edit" | "view">>({})
  const markdownPlugins = useMemo(() => [remarkGfm], [])

  function docMode(companyID: string, kind: "research" | "es"): "edit" | "view" {
    return docModeByKey[`${companyID}:${kind}`] ?? "edit"
  }

  function setDocMode(companyID: string, kind: "research" | "es", mode: "edit" | "view") {
    setDocModeByKey((prev) => ({ ...prev, [`${companyID}:${kind}`]: mode }))
  }

  return (
    <>
      <section className="hero">
        <p className="hero-sub">企業カードは初期表示でフローのみ。必要な企業だけ詳細を展開して編集できます。</p>
      </section>

      <section className="panel">
        <h2>企業検索</h2>
        <form onSubmit={onFilterSubmit} className="row">
          <input value={filterName} onChange={(e) => onFilterNameChange(e.target.value)} placeholder="企業名で検索" />
          <select value={filterStatus} onChange={(e) => onFilterStatusChange(e.target.value)}>
            <option value="">全ステータス</option>
            {companyStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="submit">絞り込み</button>
          <button type="button" className="button-secondary" onClick={onClearFilter}>
            クリア
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>企業追加</h2>
        <form onSubmit={onCreateCompany} className="stack">
          <div className="row">
            <input value={nameInput} onChange={(e) => onNameInputChange(e.target.value)} placeholder="企業名" />
            <select value={newCompanyStatus} onChange={(e) => onNewCompanyStatusChange(e.target.value)}>
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
                <select value={step.kind} onChange={(e) => onUpdateNewStep(index, { kind: e.target.value })}>
                  {stepKindOptions.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
                <input
                  value={step.title}
                  onChange={(e) => onUpdateNewStep(index, { title: e.target.value })}
                  placeholder="表示名（任意）"
                />
                <select value={step.status} onChange={(e) => onUpdateNewStep(index, { status: e.target.value })}>
                  {stepStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => onRemoveNewStep(index)}
                  disabled={newSteps.length <= 1}
                >
                  削除
                </button>
              </div>
            ))}
            <button type="button" className="button-secondary" onClick={onAddNewStep}>
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
          const companyEdit = companyEdits[company.id] ?? {
            mypageLink: company.mypageLink || "",
            mypageId: company.mypageId || "",
            researchContent: company.researchContent || "",
            esContent: company.esContent || ""
          }

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
                  onClick={() => onToggleCompanyDetail(company.id)}
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
                      const className = index === currentStepIndex ? `flow-node ${stateClass} current` : `flow-node ${stateClass}`
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
                  <p className="muted detail-caption">ステップ詳細を編集できます。フロー: {company.selectionFlow || "未設定"}</p>

                  <section className="doc-editor">
                    <h4>企業情報・ドキュメント</h4>
                    <div className="row">
                      <input
                        value={companyEdit.mypageLink}
                        onChange={(e) => onUpdateCompanyEdit(company.id, { mypageLink: e.target.value })}
                        placeholder="エントリーページURL"
                      />
                      <input
                        value={companyEdit.mypageId}
                        onChange={(e) => onUpdateCompanyEdit(company.id, { mypageId: e.target.value })}
                        placeholder="エントリーID"
                      />
                    </div>
                    {companyEdit.mypageLink && (
                      <a className="doc-link" href={companyEdit.mypageLink} target="_blank" rel="noreferrer">
                        エントリーページを開く
                      </a>
                    )}

                    <label className="doc-label" htmlFor={`research-${company.id}`}>
                      企業研究ドキュメント（Markdown）
                    </label>
                    <div className="row">
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                          if (companyEdit.researchContent.trim()) {
                            const shouldOverwrite = window.confirm("企業研究ドキュメントをテンプレートで上書きします。続行しますか？")
                            if (!shouldOverwrite) return
                          }
                          onApplyResearchTemplate(company.id)
                          setDocMode(company.id, "research", "edit")
                        }}
                      >
                        企業研究テンプレート挿入
                      </button>
                    </div>
                    <div className="doc-mode-toggle" role="tablist" aria-label="企業研究ドキュメント表示モード">
                      <button
                        type="button"
                        className={docMode(company.id, "research") === "edit" ? "button-secondary active-toggle" : "button-secondary"}
                        onClick={() => setDocMode(company.id, "research", "edit")}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={docMode(company.id, "research") === "view" ? "button-secondary active-toggle" : "button-secondary"}
                        onClick={() => setDocMode(company.id, "research", "view")}
                      >
                        View
                      </button>
                    </div>
                    {docMode(company.id, "research") === "edit" ? (
                      <textarea
                        id={`research-${company.id}`}
                        className="doc-textarea"
                        value={companyEdit.researchContent}
                        onChange={(e) => onUpdateCompanyEdit(company.id, { researchContent: e.target.value })}
                        placeholder="# 企業研究ノート"
                      />
                    ) : (
                      <div className="doc-preview">
                        {companyEdit.researchContent.trim() ? (
                          <ReactMarkdown remarkPlugins={markdownPlugins}>{companyEdit.researchContent}</ReactMarkdown>
                        ) : (
                          <p className="muted">企業研究ドキュメントが未入力です。</p>
                        )}
                      </div>
                    )}

                    <label className="doc-label" htmlFor={`es-${company.id}`}>
                      ESドキュメント（Markdown）
                    </label>
                    <div className="doc-mode-toggle" role="tablist" aria-label="ESドキュメント表示モード">
                      <button
                        type="button"
                        className={docMode(company.id, "es") === "edit" ? "button-secondary active-toggle" : "button-secondary"}
                        onClick={() => setDocMode(company.id, "es", "edit")}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={docMode(company.id, "es") === "view" ? "button-secondary active-toggle" : "button-secondary"}
                        onClick={() => setDocMode(company.id, "es", "view")}
                      >
                        View
                      </button>
                    </div>
                    {docMode(company.id, "es") === "edit" ? (
                      <textarea
                        id={`es-${company.id}`}
                        className="doc-textarea"
                        value={companyEdit.esContent}
                        onChange={(e) => onUpdateCompanyEdit(company.id, { esContent: e.target.value })}
                        placeholder="# ES下書き"
                      />
                    ) : (
                      <div className="doc-preview">
                        {companyEdit.esContent.trim() ? (
                          <ReactMarkdown remarkPlugins={markdownPlugins}>{companyEdit.esContent}</ReactMarkdown>
                        ) : (
                          <p className="muted">ESドキュメントが未入力です。</p>
                        )}
                      </div>
                    )}

                    <div className="actions">
                      <button type="button" onClick={() => onSaveCompanyDetail(company.id)} disabled={savingCompanyID === company.id}>
                        {savingCompanyID === company.id ? "保存中..." : "企業情報を保存"}
                      </button>
                    </div>
                  </section>

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
                            <select value={edit.status} onChange={(e) => onUpdateStepEdit(step.id, { status: e.target.value })}>
                              {stepStatusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={edit.scheduledAt}
                              onChange={(e) => onUpdateStepEdit(step.id, { scheduledAt: e.target.value })}
                            />
                            <button type="button" onClick={() => onSaveStep(company.id, step.id)} disabled={savingStepID === step.id}>
                              {savingStepID === step.id ? "保存中..." : "保存"}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="inline-step-add">
                    <div className="row">
                      <select value={inlineDraft.kind} onChange={(e) => onUpdateInlineDraft(company.id, { kind: e.target.value })}>
                        {stepKindOptions.map((kind) => (
                          <option key={kind} value={kind}>
                            {kind}
                          </option>
                        ))}
                      </select>
                      <input
                        value={inlineDraft.title}
                        onChange={(e) => onUpdateInlineDraft(company.id, { title: e.target.value })}
                        placeholder="追加ステップ名（任意）"
                      />
                      <select value={inlineDraft.status} onChange={(e) => onUpdateInlineDraft(company.id, { status: e.target.value })}>
                        {stepStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="button" className="button-secondary" onClick={() => onAddStepToCompany(company.id)}>
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
  )
}
