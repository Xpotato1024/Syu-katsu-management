import { Fragment, type FormEvent, useEffect, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { companyStatusOptions, stepKindOptions, stepStatusOptions } from "../constants"
import type { Company, CompanyDetailEdit, StepDraft, StepEdit } from "../types"
import { newStepDraft, resolveCurrentStepIndex, stepLabel, stepVisualState } from "../utils/selection"
import { toDateTimeInputValue } from "../utils/date"

type CompaniesViewProps = {
  companies: Company[]
  loading: boolean
  submitting: boolean
  savingFlowCompanyID: string
  deletingStepID: string
  deletingCompanyID: string
  errorMessage: string
  filterName: string
  filterStatuses: string[]
  nameInput: string
  newCompanyStatus: string
  newSteps: StepDraft[]
  stepDraftByCompany: Record<string, StepDraft>
  stepEdits: Record<string, StepEdit>
  companyEdits: Record<string, CompanyDetailEdit>
  expandedCompanyIDs: Record<string, boolean>
  onFilterNameChange: (value: string) => void
  onToggleFilterStatus: (status: string) => void
  onSelectAllFilterStatuses: () => void
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
  onSaveFlow: (companyID: string) => void
  onDeleteStep: (companyID: string, stepID: string) => void
  onUpdateCompanyEdit: (companyID: string, patch: Partial<CompanyDetailEdit>) => void
  onApplyResearchTemplate: (companyID: string) => void
  onSaveCompanyInfo: (companyID: string) => void
  onSaveCompanyDocuments: (companyID: string) => void
  onDeleteCompany: (companyID: string) => void
  savingCompanyInfoID: string
  savingDocumentsCompanyID: string
  onUpdateInlineDraft: (companyID: string, patch: Partial<StepDraft>) => void
  onAddStepToCompany: (companyID: string) => void
}

type DeleteConfirmTarget =
  | {
      mode: "company"
      companyID: string
      companyName: string
    }
  | {
      mode: "step"
      companyID: string
      stepID: string
      stepName: string
    }

export function CompaniesView({
  companies,
  loading,
  submitting,
  savingFlowCompanyID,
  deletingStepID,
  deletingCompanyID,
  errorMessage,
  filterName,
  filterStatuses,
  nameInput,
  newCompanyStatus,
  newSteps,
  stepDraftByCompany,
  stepEdits,
  companyEdits,
  expandedCompanyIDs,
  onFilterNameChange,
  onToggleFilterStatus,
  onSelectAllFilterStatuses,
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
  onSaveFlow,
  onDeleteStep,
  onUpdateCompanyEdit,
  onApplyResearchTemplate,
  onSaveCompanyInfo,
  onSaveCompanyDocuments,
  onDeleteCompany,
  savingCompanyInfoID,
  savingDocumentsCompanyID,
  onUpdateInlineDraft,
  onAddStepToCompany
}: CompaniesViewProps) {
  const [docModeByKey, setDocModeByKey] = useState<Record<string, "edit" | "view">>({})
  const [isFilterOptionsOpen, setIsFilterOptionsOpen] = useState(false)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<DeleteConfirmTarget | null>(null)
  const markdownPlugins = useMemo(() => [remarkGfm], [])

  useEffect(() => {
    if (!deleteConfirmTarget) return
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") setDeleteConfirmTarget(null)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [deleteConfirmTarget])

  useEffect(() => {
    if (!deleteConfirmTarget) return
    if (deleteConfirmTarget.mode === "company" && !companies.some((company) => company.id === deleteConfirmTarget.companyID)) {
      setDeleteConfirmTarget(null)
      return
    }
    if (
      deleteConfirmTarget.mode === "step" &&
      !companies.some((company) => (company.selectionSteps || []).some((step) => step.id === deleteConfirmTarget.stepID))
    ) {
      setDeleteConfirmTarget(null)
    }
  }, [companies, deleteConfirmTarget])

  const isDeleteSubmitting = useMemo(() => {
    if (!deleteConfirmTarget) return false
    if (deleteConfirmTarget.mode === "company") return deletingCompanyID === deleteConfirmTarget.companyID
    return deletingStepID === deleteConfirmTarget.stepID
  }, [deleteConfirmTarget, deletingCompanyID, deletingStepID])

  function onConfirmDelete() {
    if (!deleteConfirmTarget) return
    if (deleteConfirmTarget.mode === "company") {
      onDeleteCompany(deleteConfirmTarget.companyID)
      return
    }
    onDeleteStep(deleteConfirmTarget.companyID, deleteConfirmTarget.stepID)
  }

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
        <form onSubmit={onFilterSubmit} className="stack filter-form">
          <div className="row filter-row-primary">
            <input value={filterName} onChange={(e) => onFilterNameChange(e.target.value)} placeholder="企業名で検索" />
            <button type="submit">絞り込み</button>
          </div>
          <div className="row filter-row-secondary">
            <button type="button" className="button-secondary" onClick={onClearFilter}>
              クリア
            </button>
            <button
              type="button"
              className={isFilterOptionsOpen ? "button-secondary active-toggle filter-toggle-fixed" : "button-secondary filter-toggle-fixed"}
              onClick={() => setIsFilterOptionsOpen((prev) => !prev)}
            >
              {isFilterOptionsOpen ? "詳細を閉じる" : "詳細を開く"}
            </button>
          </div>
          <p className="muted filter-summary">選考状況フィルタ: {filterStatuses.length} / {companyStatusOptions.length} を選択中</p>
          {isFilterOptionsOpen && (
            <fieldset className="status-filter-set">
              <legend>選考状況（複数選択）</legend>
              <div className="status-filter-list">
                {companyStatusOptions.map((status) => {
                  const checked = filterStatuses.includes(status)
                  return (
                    <label key={status} className={checked ? "status-filter-chip checked" : "status-filter-chip"}>
                      <input type="checkbox" checked={checked} onChange={() => onToggleFilterStatus(status)} />
                      <span>{status}</span>
                    </label>
                  )
                })}
                <button
                  type="button"
                  className="button-secondary status-filter-select-all"
                  onClick={onSelectAllFilterStatuses}
                  disabled={filterStatuses.length === companyStatusOptions.length}
                >
                  全選択
                </button>
              </div>
            </fieldset>
          )}
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
            <div className="step-builder-header">
              <p>初期選考フロー</p>
            </div>
            <div className="step-builder-list">
              {newSteps.map((step, index) => (
                <article className="step-builder-item" key={`new-step-${index}`}>
                  <div className="step-builder-item-head">
                    <span className="step-order">STEP {index + 1}</span>
                    <button
                      type="button"
                      className="button-danger step-input-delete"
                      onClick={() => onRemoveNewStep(index)}
                      disabled={newSteps.length <= 1}
                    >
                      削除
                    </button>
                  </div>
                  <div className="step-builder-row">
                    <select className="step-input-kind" value={step.kind} onChange={(e) => onUpdateNewStep(index, { kind: e.target.value })}>
                      {stepKindOptions.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                    <input
                      className="step-input-title"
                      value={step.title}
                      onChange={(e) => onUpdateNewStep(index, { title: e.target.value })}
                      placeholder="表示名（任意）"
                    />
                    <select className="step-input-status" value={step.status} onChange={(e) => onUpdateNewStep(index, { status: e.target.value })}>
                      {stepStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <input
                      className="step-input-datetime"
                      type="datetime-local"
                      value={step.scheduledAt}
                      onChange={(e) => onUpdateNewStep(index, { scheduledAt: e.target.value })}
                      aria-label="日時"
                    />
                    <input
                      className="step-input-note"
                      value={step.note}
                      onChange={(e) => onUpdateNewStep(index, { note: e.target.value })}
                      placeholder="備考（URL / 会場 / 持ち物）"
                    />
                  </div>
                </article>
              ))}
            </div>
            <div className="step-builder-footer">
              <span className="step-count">{newSteps.length} step</span>
              <button type="button" className="button-secondary button-add-step-inline" onClick={onAddNewStep}>
                + ステップ追加
              </button>
            </div>
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
            selectionStatus: company.selectionStatus || companyStatusOptions[0],
            researchContent: company.researchContent || "",
            esContent: company.esContent || ""
          }

          return (
            <article key={company.id} className="company-card">
              <header className="company-head">
                <div className="company-heading">
                  <button
                    type="button"
                    className={isExpanded ? "company-expand-trigger expanded" : "company-expand-trigger"}
                    onClick={() => onToggleCompanyDetail(company.id)}
                    aria-label={isExpanded ? "詳細を閉じる" : "詳細を開く"}
                    aria-expanded={isExpanded}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d={isExpanded ? "M3 10l5-5 5 5z" : "M3 6l5 5 5-5z"} />
                    </svg>
                  </button>
                  <button type="button" className="company-name-link" onClick={() => onToggleCompanyDetail(company.id)}>
                    {company.name}
                  </button>
                  <span className="badge">{company.selectionStatus || "未設定"}</span>
                </div>
                <div className="company-actions">
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => setDeleteConfirmTarget({ mode: "company", companyID: company.id, companyName: company.name })}
                    disabled={deletingCompanyID === company.id}
                  >
                    {deletingCompanyID === company.id ? "削除中..." : "企業削除"}
                  </button>
                </div>
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
                    <h4>企業情報</h4>
                    <div className="row">
                      <select
                        value={companyEdit.selectionStatus}
                        onChange={(e) => onUpdateCompanyEdit(company.id, { selectionStatus: e.target.value })}
                      >
                        {companyStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
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
                    <div className="actions section-save-actions company-info-actions">
                      {companyEdit.mypageLink && (
                        <a className="doc-link inline-action-link" href={companyEdit.mypageLink} target="_blank" rel="noreferrer">
                          エントリーページを開く
                        </a>
                      )}
                      <button type="button" onClick={() => onSaveCompanyInfo(company.id)} disabled={savingCompanyInfoID === company.id}>
                        {savingCompanyInfoID === company.id ? "保存中..." : "企業情報を保存"}
                      </button>
                    </div>

                    <h4>ドキュメント</h4>
                    <label className="doc-label" htmlFor={`research-${company.id}`}>
                      企業研究ドキュメント（Markdown）
                    </label>
                    <div className="row">
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                          const shouldOverwrite = window.confirm(
                            "企業研究ドキュメントにテンプレートを挿入します。現在の入力は上書きされます。続行しますか？"
                          )
                          if (!shouldOverwrite) return
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
                      <button type="button" onClick={() => onSaveCompanyDocuments(company.id)} disabled={savingDocumentsCompanyID === company.id}>
                        {savingDocumentsCompanyID === company.id ? "保存中..." : "ドキュメントを保存"}
                      </button>
                    </div>
                  </section>

                  <div className="step-list">
                    <div className="step-list-head">
                      <h4>選考フロー</h4>
                    </div>
                    {steps.map((step) => {
                      const edit = stepEdits[step.id] ?? {
                        title: step.title || "",
                        status: step.status || stepStatusOptions[0],
                        scheduledAt: toDateTimeInputValue(step.scheduledAt),
                        note: step.note || ""
                      }
                      const liveLabel = edit.title.trim() || step.kind

                      return (
                        <div key={step.id} className="step-item">
                          <div className="step-item-head">
                            <div className="step-label">
                              <span className="kind">{step.kind}</span>
                              <strong>{liveLabel}</strong>
                            </div>
                            <button
                              type="button"
                              className="button-danger step-head-delete"
                              onClick={() =>
                                setDeleteConfirmTarget({
                                  mode: "step",
                                  companyID: company.id,
                                  stepID: step.id,
                                  stepName: stepLabel(step)
                                })
                              }
                              disabled={deletingStepID === step.id}
                            >
                              {deletingStepID === step.id ? "削除中..." : "削除"}
                            </button>
                          </div>
                          <div className="row step-row">
                            <input
                              className="step-edit-title"
                              value={edit.title}
                              onChange={(e) => onUpdateStepEdit(step.id, { title: e.target.value })}
                              placeholder="表示名（任意）"
                            />
                            <select className="step-edit-status" value={edit.status} onChange={(e) => onUpdateStepEdit(step.id, { status: e.target.value })}>
                              {stepStatusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <input
                              className="step-edit-datetime"
                              type="datetime-local"
                              value={edit.scheduledAt}
                              onChange={(e) => onUpdateStepEdit(step.id, { scheduledAt: e.target.value })}
                            />
                            <input
                              className="step-edit-note"
                              value={edit.note}
                              onChange={(e) => onUpdateStepEdit(step.id, { note: e.target.value })}
                              placeholder="備考（URL / 会場 / 持ち物）"
                            />
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
                      <input
                        type="datetime-local"
                        value={inlineDraft.scheduledAt}
                        onChange={(e) => onUpdateInlineDraft(company.id, { scheduledAt: e.target.value })}
                      />
                      <input
                        value={inlineDraft.note}
                        onChange={(e) => onUpdateInlineDraft(company.id, { note: e.target.value })}
                        placeholder="備考（URL / 会場 / 持ち物）"
                      />
                    </div>
                    <button type="button" className="button-secondary" onClick={() => onAddStepToCompany(company.id)}>
                      この企業にステップ追加
                    </button>
                  </div>

                  <div className="actions section-save-actions flow-save-actions">
                    <button type="button" onClick={() => onSaveFlow(company.id)} disabled={savingFlowCompanyID === company.id}>
                      {savingFlowCompanyID === company.id ? "保存中..." : "フローを保存"}
                    </button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </section>

      {!loading && companies.length === 0 && <p className="empty-state">該当する企業はありません。</p>}

      {deleteConfirmTarget && (
        <div className="event-modal-backdrop" role="presentation" onClick={() => setDeleteConfirmTarget(null)}>
          <section
            className="event-modal confirm-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-label="削除確認"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="event-modal-head">
              <div className="event-modal-title-wrap">
                <h3>削除の確認</h3>
              </div>
              <button type="button" className="event-modal-close" onClick={() => setDeleteConfirmTarget(null)} aria-label="閉じる">
                ×
              </button>
            </header>

            <p className="confirm-delete-message">
              {deleteConfirmTarget.mode === "company"
                ? "企業を削除すると関連する選考ステップも削除されます。元に戻せません。"
                : "この選考ステップを削除します。元に戻せません。"}
            </p>
            <p className="confirm-delete-target">
              {deleteConfirmTarget.mode === "company"
                ? `対象企業: ${deleteConfirmTarget.companyName}`
                : `対象ステップ: ${deleteConfirmTarget.stepName}`}
            </p>

            <div className="event-modal-actions confirm-delete-actions">
              <button type="button" className="button-secondary" onClick={() => setDeleteConfirmTarget(null)} disabled={isDeleteSubmitting}>
                キャンセル
              </button>
              <button type="button" className="button-danger" onClick={onConfirmDelete} disabled={isDeleteSubmitting}>
                {isDeleteSubmitting ? "削除中..." : "削除する"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
