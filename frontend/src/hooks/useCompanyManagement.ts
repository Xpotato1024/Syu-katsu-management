import { useCallback, useEffect, useState } from "react"
import { companyInterestOptions, companyStatusOptions, stepStatusOptions } from "../constants"
import type { Company, CompanyDetailEdit, StepDraft, StepEdit } from "../types"
import { toDateTimeInputValue, toDurationInputValue, toDurationMinutesPayload, toScheduledAtPayload } from "../utils/date"
import { newStepDraft } from "../utils/selection"
import type { ToastTone } from "./useToast"

type UseCompanyManagementArgs = {
  apiBase: string
  onToast?: (message: string, tone?: ToastTone) => void
}

type LoadCompaniesOptions = {
  silent?: boolean
}

const allCompanyStatuses = [...companyStatusOptions]

export function useCompanyManagement({ apiBase, onToast }: UseCompanyManagementArgs) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [nameInput, setNameInput] = useState("")
  const [newCompanyStatus, setNewCompanyStatus] = useState<string>(companyStatusOptions[0])
  const [newCompanyInterest, setNewCompanyInterest] = useState<string>(companyInterestOptions[0])
  const [newSteps, setNewSteps] = useState<StepDraft[]>([newStepDraft()])
  const [stepDraftByCompany, setStepDraftByCompany] = useState<Record<string, StepDraft>>({})
  const [stepEdits, setStepEdits] = useState<Record<string, StepEdit>>({})
  const [companyEdits, setCompanyEdits] = useState<Record<string, CompanyDetailEdit>>({})
  const [expandedCompanyIDs, setExpandedCompanyIDs] = useState<Record<string, boolean>>({})
  const [filterName, setFilterName] = useState("")
  const [filterStatuses, setFilterStatuses] = useState<string[]>(allCompanyStatuses)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingFlowCompanyID, setSavingFlowCompanyID] = useState("")
  const [deletingStepID, setDeletingStepID] = useState("")
  const [savingCompanyInfoID, setSavingCompanyInfoID] = useState("")
  const [savingDocumentsCompanyID, setSavingDocumentsCompanyID] = useState("")
  const [deletingCompanyID, setDeletingCompanyID] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const loadCompanies = useCallback(
    async (nameQuery = "", statuses?: string[], options: LoadCompaniesOptions = {}): Promise<boolean> => {
      const { silent = false } = options
      const activeStatuses = statuses ?? allCompanyStatuses
      const params = new URLSearchParams()
      if (nameQuery.trim()) params.set("q", nameQuery.trim())

      const url = params.toString() ? `${apiBase}/companies?${params.toString()}` : `${apiBase}/companies`
      setLoading(true)
      setErrorMessage("")
      try {
        const response = await fetch(url)
        if (response.status === 401) {
          setCompanies([])
          const message = "ログインセッションがありません。Autheliaでログインしてください。"
          setErrorMessage(message)
          if (!silent) {
            onToast?.(message, "error")
          }
          return false
        }
        if (!response.ok) throw new Error(`failed to load companies: ${response.status}`)
        const data = (await response.json()) as Company[]
        const allowedStatuses = new Set(activeStatuses)
        const filteredData =
          activeStatuses.length === 0
            ? []
            : activeStatuses.length >= allCompanyStatuses.length
              ? data
              : data.filter((company) => allowedStatuses.has(company.selectionStatus))

        setCompanies(filteredData)
        setStepEdits(() => {
          const next: Record<string, StepEdit> = {}
          for (const company of filteredData) {
            for (const step of company.selectionSteps || []) {
              next[step.id] = {
                title: step.title || "",
                status: step.status || stepStatusOptions[0],
                scheduledAt: toDateTimeInputValue(step.scheduledAt),
                durationMinutes: toDurationInputValue(step.durationMinutes),
                note: step.note || ""
              }
            }
          }
          return next
        })
        setCompanyEdits((prev) => {
          const next = { ...prev }
          for (const company of filteredData) {
            if (!next[company.id]) {
              next[company.id] = {
                mypageLink: company.mypageLink || "",
                mypageId: company.mypageId || "",
                interestLevel: company.interestLevel || companyInterestOptions[0],
                selectionStatus: company.selectionStatus || companyStatusOptions[0],
                researchContent: company.researchContent || "",
                esContent: company.esContent || ""
              }
            } else if (!next[company.id].selectionStatus || !next[company.id].interestLevel) {
              next[company.id] = {
                ...next[company.id],
                interestLevel: company.interestLevel || companyInterestOptions[0],
                selectionStatus: company.selectionStatus || companyStatusOptions[0]
              }
            }
          }
          return next
        })
        return true
      } catch (_error) {
        const message = "企業一覧の取得に失敗しました。"
        setErrorMessage(message)
        if (!silent) {
          onToast?.(message, "error")
        }
        return false
      } finally {
        setLoading(false)
      }
    },
    [apiBase, onToast]
  )

  const createCompany = useCallback(async () => {
    if (!nameInput.trim()) {
      onToast?.("企業名を入力してください。", "error")
      return
    }

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
          interestLevel: newCompanyInterest,
          selectionStatus: newCompanyStatus,
          selectionSteps: newSteps.map((step) => ({
            kind: step.kind,
            title: step.title,
            status: step.status,
            scheduledAt: toScheduledAtPayload(step.scheduledAt),
            durationMinutes: toDurationMinutesPayload(step.durationMinutes),
            note: step.note
          })),
          esContent: "",
          researchContent: ""
        })
      })
      if (response.status === 401) {
        const message = "ログインセッションがありません。Autheliaでログインしてください。"
        setErrorMessage(message)
        onToast?.(message, "error")
        return
      }
      if (!response.ok) throw new Error(`failed to create company: ${response.status}`)
    } catch (_error) {
      const message = "企業の追加に失敗しました。"
      setErrorMessage(message)
      onToast?.(message, "error")
      return
    } finally {
      setSubmitting(false)
    }

    setNameInput("")
    setNewCompanyStatus(companyStatusOptions[0])
    setNewCompanyInterest(companyInterestOptions[0])
    setNewSteps([newStepDraft()])
    await loadCompanies(filterName, filterStatuses, { silent: true })
    onToast?.("企業を追加しました。", "success")
  }, [apiBase, filterName, filterStatuses, loadCompanies, nameInput, newCompanyInterest, newCompanyStatus, newSteps, onToast])

  const applyFilter = useCallback(async () => {
    const ok = await loadCompanies(filterName, filterStatuses, { silent: true })
    if (ok) {
      onToast?.("企業一覧を更新しました。", "info")
    }
  }, [filterName, filterStatuses, loadCompanies, onToast])

  const clearFilter = useCallback(async () => {
    setFilterName("")
    setFilterStatuses([])
    const ok = await loadCompanies("", [], { silent: true })
    if (ok) {
      onToast?.("絞り込みを解除しました。", "info")
    }
  }, [loadCompanies, onToast])

  const toggleFilterStatus = useCallback((status: string) => {
    setFilterStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) {
        next.delete(status)
      } else {
        next.add(status)
      }
      return allCompanyStatuses.filter((candidate) => next.has(candidate))
    })
  }, [])

  const selectAllFilterStatuses = useCallback(() => {
    setFilterStatuses(allCompanyStatuses)
  }, [])

  const mergeCompanyFromServer = useCallback((updatedCompany: Company, syncStepEdits = true) => {
    setCompanies((prev) => prev.map((company) => (company.id === updatedCompany.id ? updatedCompany : company)))

    if (!syncStepEdits) {
      return
    }

    setStepEdits((prev) => {
      const next = { ...prev }
      for (const step of updatedCompany.selectionSteps || []) {
        next[step.id] = {
          title: step.title || "",
          status: step.status || stepStatusOptions[0],
          scheduledAt: toDateTimeInputValue(step.scheduledAt),
          durationMinutes: toDurationInputValue(step.durationMinutes),
          note: step.note || ""
        }
      }
      return next
    })
  }, [])

  const addStepToCompany = useCallback(
    async (companyID: string) => {
      const draft = stepDraftByCompany[companyID] ?? newStepDraft("面接")
      setErrorMessage("")
      try {
        const response = await fetch(`${apiBase}/companies/${companyID}/steps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: draft.kind,
            title: draft.title,
            status: draft.status,
            scheduledAt: toScheduledAtPayload(draft.scheduledAt),
            durationMinutes: toDurationMinutesPayload(draft.durationMinutes),
            note: draft.note
          })
        })
        if (response.status === 401) {
          const message = "ログインセッションがありません。Autheliaでログインしてください。"
          setErrorMessage(message)
          onToast?.(message, "error")
          return
        }
        if (!response.ok) throw new Error(`failed to add step: ${response.status}`)
        setStepDraftByCompany((prev) => ({ ...prev, [companyID]: newStepDraft("面接") }))
        await loadCompanies(filterName, filterStatuses, { silent: true })
        onToast?.("選考ステップを追加しました。", "success")
      } catch (_error) {
        const message = "選考ステップの追加に失敗しました。"
        setErrorMessage(message)
        onToast?.(message, "error")
      }
    },
    [apiBase, filterName, filterStatuses, loadCompanies, onToast, stepDraftByCompany]
  )

  const saveFlow = useCallback(
    async (companyID: string) => {
      const company = companies.find((item) => item.id === companyID)
      if (!company) return

      const payloadSteps = (company.selectionSteps || []).map((step) => {
        const edit = stepEdits[step.id] ?? {
          title: step.title || "",
          status: step.status || stepStatusOptions[0],
          scheduledAt: toDateTimeInputValue(step.scheduledAt),
          durationMinutes: toDurationInputValue(step.durationMinutes),
          note: step.note || ""
        }
        return {
          id: step.id,
          title: edit.title,
          status: edit.status,
          scheduledAt: toScheduledAtPayload(edit.scheduledAt),
          durationMinutes: toDurationMinutesPayload(edit.durationMinutes),
          note: edit.note
        }
      })
      if (payloadSteps.length === 0) {
        onToast?.("保存対象の選考ステップがありません。", "info")
        return
      }

      setSavingFlowCompanyID(companyID)
      setErrorMessage("")
      try {
        const response = await fetch(`${apiBase}/companies/${companyID}/steps/bulk`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steps: payloadSteps })
        })
        if (response.status === 401) {
          const message = "ログインセッションがありません。Autheliaでログインしてください。"
          setErrorMessage(message)
          onToast?.(message, "error")
          return
        }
        if (!response.ok) throw new Error(`failed to update steps: ${response.status}`)
        const updatedCompany = (await response.json()) as Company
        mergeCompanyFromServer(updatedCompany, true)
        onToast?.("選考フローを保存しました。", "success")
      } catch (_error) {
        const message = "選考フローの更新に失敗しました。"
        setErrorMessage(message)
        onToast?.(message, "error")
      } finally {
        setSavingFlowCompanyID("")
      }
    },
    [apiBase, companies, mergeCompanyFromServer, onToast, stepEdits]
  )

  const updateCompanyEdit = useCallback((companyID: string, patch: Partial<CompanyDetailEdit>) => {
    setCompanyEdits((prev) => {
      const current = prev[companyID] ?? {
        mypageLink: "",
        mypageId: "",
        interestLevel: companyInterestOptions[0],
        selectionStatus: companyStatusOptions[0],
        researchContent: "",
        esContent: ""
      }
      return { ...prev, [companyID]: { ...current, ...patch } }
    })
  }, [])

  const applyResearchTemplate = useCallback((companyID: string) => {
    const template = [
      "# 企業研究ノート",
      "",
      "## 基本情報",
      "- 企業名:",
      "- 業界:",
      "- 創立:",
      "- 本社所在地:",
      "",
      "## 企業理念・ビジョン",
      "- ",
      "",
      "## 注力分野 / 主力事業",
      "- ",
      "",
      "## 業績・成長性",
      "- 売上:",
      "- 利益:",
      "- 成長率:",
      "",
      "## 競合比較",
      "- 競合企業:",
      "- 強み:",
      "- 懸念点:",
      "",
      "## 志望動機メモ",
      "- 共感ポイント:",
      "- 活かせる経験:",
      "",
      "## 面接で確認したいこと",
      "- "
    ].join("\n")
    updateCompanyEdit(companyID, { researchContent: template })
  }, [updateCompanyEdit])

  const saveCompanyInfo = useCallback(
    async (companyID: string) => {
      const company = companies.find((item) => item.id === companyID)
      if (!company) return
      const edit = companyEdits[companyID]
      if (!edit) return

      setSavingCompanyInfoID(companyID)
      setErrorMessage("")
      try {
        const response = await fetch(`${apiBase}/companies/${companyID}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: company.name,
            mypageLink: edit.mypageLink,
            mypageId: edit.mypageId,
            interestLevel: edit.interestLevel || company.interestLevel || companyInterestOptions[0],
            selectionFlow: company.selectionFlow || "",
            selectionStatus: edit.selectionStatus || company.selectionStatus,
            selectionSteps: (company.selectionSteps || []).map((step) => ({
              kind: step.kind,
              title: step.title,
              status: step.status,
              scheduledAt: step.scheduledAt || "",
              durationMinutes: step.durationMinutes || 0,
              note: step.note || ""
            })),
            esContent: company.esContent || "",
            researchContent: company.researchContent || ""
          })
        })
        if (response.status === 401) {
          const message = "ログインセッションがありません。Autheliaでログインしてください。"
          setErrorMessage(message)
          onToast?.(message, "error")
          return
        }
        if (!response.ok) throw new Error(`failed to update company: ${response.status}`)
        const updatedCompany = (await response.json()) as Company
        mergeCompanyFromServer(updatedCompany, false)
        onToast?.("企業情報を保存しました。", "success")
      } catch (_error) {
        const message = "企業情報の更新に失敗しました。"
        setErrorMessage(message)
        onToast?.(message, "error")
      } finally {
        setSavingCompanyInfoID("")
      }
    },
    [apiBase, companies, companyEdits, mergeCompanyFromServer, onToast]
  )

  const saveCompanyDocuments = useCallback(
    async (companyID: string) => {
      const company = companies.find((item) => item.id === companyID)
      if (!company) return
      const edit = companyEdits[companyID]
      if (!edit) return

      setSavingDocumentsCompanyID(companyID)
      setErrorMessage("")
      try {
        const response = await fetch(`${apiBase}/companies/${companyID}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: company.name,
            mypageLink: company.mypageLink || "",
            mypageId: company.mypageId || "",
            interestLevel: company.interestLevel || companyInterestOptions[0],
            selectionFlow: company.selectionFlow || "",
            selectionStatus: company.selectionStatus || companyStatusOptions[0],
            selectionSteps: (company.selectionSteps || []).map((step) => ({
              kind: step.kind,
              title: step.title,
              status: step.status,
              scheduledAt: step.scheduledAt || "",
              durationMinutes: step.durationMinutes || 0,
              note: step.note || ""
            })),
            esContent: edit.esContent,
            researchContent: edit.researchContent
          })
        })
        if (response.status === 401) {
          const message = "ログインセッションがありません。Autheliaでログインしてください。"
          setErrorMessage(message)
          onToast?.(message, "error")
          return
        }
        if (!response.ok) throw new Error(`failed to update company documents: ${response.status}`)
        const updatedCompany = (await response.json()) as Company
        mergeCompanyFromServer(updatedCompany, false)
        onToast?.("ドキュメントを保存しました。", "success")
      } catch (_error) {
        const message = "ドキュメントの保存に失敗しました。"
        setErrorMessage(message)
        onToast?.(message, "error")
      } finally {
        setSavingDocumentsCompanyID("")
      }
    },
    [apiBase, companies, companyEdits, mergeCompanyFromServer, onToast]
  )

  const deleteStep = useCallback(
    async (companyID: string, stepID: string) => {
      setDeletingStepID(stepID)
      setErrorMessage("")
      try {
        const response = await fetch(`${apiBase}/companies/${companyID}/steps/${stepID}`, {
          method: "DELETE"
        })
        if (response.status === 401) {
          const message = "ログインセッションがありません。Autheliaでログインしてください。"
          setErrorMessage(message)
          onToast?.(message, "error")
          return
        }
        if (!response.ok) throw new Error(`failed to delete step: ${response.status}`)
        await loadCompanies(filterName, filterStatuses, { silent: true })
        onToast?.("選考ステップを削除しました。", "success")
      } catch (_error) {
        const message = "選考ステップの削除に失敗しました。"
        setErrorMessage(message)
        onToast?.(message, "error")
      } finally {
        setDeletingStepID("")
      }
    },
    [apiBase, filterName, filterStatuses, loadCompanies, onToast]
  )

  const deleteCompany = useCallback(
    async (companyID: string) => {
      setDeletingCompanyID(companyID)
      setErrorMessage("")
      try {
        const response = await fetch(`${apiBase}/companies/${companyID}`, {
          method: "DELETE"
        })
        if (response.status === 401) {
          const message = "ログインセッションがありません。Autheliaでログインしてください。"
          setErrorMessage(message)
          onToast?.(message, "error")
          return
        }
        if (!response.ok) throw new Error(`failed to delete company: ${response.status}`)
        setExpandedCompanyIDs((prev) => {
          const next = { ...prev }
          delete next[companyID]
          return next
        })
        await loadCompanies(filterName, filterStatuses, { silent: true })
        onToast?.("企業を削除しました。", "success")
      } catch (_error) {
        const message = "企業の削除に失敗しました。"
        setErrorMessage(message)
        onToast?.(message, "error")
      } finally {
        setDeletingCompanyID("")
      }
    },
    [apiBase, filterName, filterStatuses, loadCompanies, onToast]
  )

  const toggleCompanyDetail = useCallback((companyID: string) => {
    setExpandedCompanyIDs((prev) => ({ ...prev, [companyID]: !prev[companyID] }))
  }, [])

  const updateNewStep = useCallback((index: number, patch: Partial<StepDraft>) => {
    setNewSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...patch } : step)))
  }, [])

  const removeNewStep = useCallback((index: number) => {
    setNewSteps((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const appendNewStep = useCallback(() => {
    setNewSteps((prev) => [...prev, newStepDraft("面接")])
  }, [])

  const updateStepEdit = useCallback((stepID: string, patch: Partial<StepEdit>) => {
    setStepEdits((prev) => {
      const current = prev[stepID] ?? { title: "", status: stepStatusOptions[0], scheduledAt: "", durationMinutes: "", note: "" }
      return { ...prev, [stepID]: { ...current, ...patch } }
    })
  }, [])

  const updateInlineDraft = useCallback((companyID: string, patch: Partial<StepDraft>) => {
    setStepDraftByCompany((prev) => {
      const current = prev[companyID] ?? newStepDraft("面接")
      return { ...prev, [companyID]: { ...current, ...patch } }
    })
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

  return {
    companies,
    nameInput,
    setNameInput,
    newCompanyStatus,
    setNewCompanyStatus,
    newCompanyInterest,
    setNewCompanyInterest,
    newSteps,
    stepDraftByCompany,
    stepEdits,
    companyEdits,
    expandedCompanyIDs,
    filterName,
    setFilterName,
    filterStatuses,
    toggleFilterStatus,
    selectAllFilterStatuses,
    loading,
    submitting,
    savingFlowCompanyID,
    deletingStepID,
    savingCompanyInfoID,
    savingDocumentsCompanyID,
    deletingCompanyID,
    errorMessage,
    loadCompanies,
    createCompany,
    applyFilter,
    clearFilter,
    addStepToCompany,
    saveFlow,
    deleteStep,
    updateCompanyEdit,
    applyResearchTemplate,
    saveCompanyInfo,
    saveCompanyDocuments,
    deleteCompany,
    toggleCompanyDetail,
    updateNewStep,
    removeNewStep,
    appendNewStep,
    updateStepEdit,
    updateInlineDraft
  }
}
