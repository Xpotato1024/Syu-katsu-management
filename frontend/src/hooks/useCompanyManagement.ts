import { useCallback, useEffect, useState } from "react"
import { companyStatusOptions, stepStatusOptions } from "../constants"
import type { Company, StepDraft, StepEdit } from "../types"
import { toDateInputValue } from "../utils/date"
import { newStepDraft } from "../utils/selection"

type UseCompanyManagementArgs = {
  apiBase: string
}

export function useCompanyManagement({ apiBase }: UseCompanyManagementArgs) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [nameInput, setNameInput] = useState("")
  const [newCompanyStatus, setNewCompanyStatus] = useState<string>(companyStatusOptions[0])
  const [newSteps, setNewSteps] = useState<StepDraft[]>([newStepDraft()])
  const [stepDraftByCompany, setStepDraftByCompany] = useState<Record<string, StepDraft>>({})
  const [stepEdits, setStepEdits] = useState<Record<string, StepEdit>>({})
  const [expandedCompanyIDs, setExpandedCompanyIDs] = useState<Record<string, boolean>>({})
  const [filterName, setFilterName] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingStepID, setSavingStepID] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const loadCompanies = useCallback(
    async (nameQuery = "", status = "") => {
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
    },
    [apiBase]
  )

  const createCompany = useCallback(async () => {
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
    await loadCompanies(filterName, filterStatus)
  }, [apiBase, filterName, filterStatus, loadCompanies, nameInput, newCompanyStatus, newSteps])

  const applyFilter = useCallback(async () => {
    await loadCompanies(filterName, filterStatus)
  }, [filterName, filterStatus, loadCompanies])

  const clearFilter = useCallback(async () => {
    setFilterName("")
    setFilterStatus("")
    await loadCompanies("", "")
  }, [loadCompanies])

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
            status: draft.status
          })
        })
        if (response.status === 401) {
          setErrorMessage("ログインセッションがありません。Autheliaでログインしてください。")
          return
        }
        if (!response.ok) throw new Error(`failed to add step: ${response.status}`)
        setStepDraftByCompany((prev) => ({ ...prev, [companyID]: newStepDraft("面接") }))
        await loadCompanies(filterName, filterStatus)
      } catch (_error) {
        setErrorMessage("選考ステップの追加に失敗しました。")
      }
    },
    [apiBase, filterName, filterStatus, loadCompanies, stepDraftByCompany]
  )

  const saveStep = useCallback(
    async (companyID: string, stepID: string) => {
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
        await loadCompanies(filterName, filterStatus)
      } catch (_error) {
        setErrorMessage("選考ステップの更新に失敗しました。")
      } finally {
        setSavingStepID("")
      }
    },
    [apiBase, filterName, filterStatus, loadCompanies, stepEdits]
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
      const current = prev[stepID] ?? { status: stepStatusOptions[0], scheduledAt: "" }
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
    newSteps,
    stepDraftByCompany,
    stepEdits,
    expandedCompanyIDs,
    filterName,
    setFilterName,
    filterStatus,
    setFilterStatus,
    loading,
    submitting,
    savingStepID,
    errorMessage,
    loadCompanies,
    createCompany,
    applyFilter,
    clearFilter,
    addStepToCompany,
    saveStep,
    toggleCompanyDetail,
    updateNewStep,
    removeNewStep,
    appendNewStep,
    updateStepEdit,
    updateInlineDraft
  }
}
