import { FormEvent, useEffect, useState } from 'react'

type Company = {
  id: string
  name: string
  selectionStatus: string
  mypageLink: string
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const selectionStatusOptions = ['未着手', '進行中', '完了', '不合格', '辞退']

export function App() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [nameInput, setNameInput] = useState('')
  const [newCompanyStatus, setNewCompanyStatus] = useState(selectionStatusOptions[0])
  const [filterName, setFilterName] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function loadCompanies(nameQuery = filterName, status = filterStatus) {
    const params = new URLSearchParams()
    if (nameQuery.trim()) params.set('q', nameQuery.trim())
    if (status) params.set('status', status)

    const url = params.toString() ? `${apiBase}/companies?${params.toString()}` : `${apiBase}/companies`

    setLoading(true)
    setErrorMessage('')
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`failed to load companies: ${response.status}`)
      const data = (await response.json()) as Company[]
      setCompanies(data)
    } catch (_error) {
      setErrorMessage('企業一覧の取得に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nameInput.trim()) return

    setErrorMessage('')
    try {
      const response = await fetch(`${apiBase}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput,
          mypageLink: '',
          mypageId: '',
          selectionFlow: '',
          selectionStatus: newCompanyStatus,
          esContent: '',
          researchContent: ''
        })
      })

      if (!response.ok) throw new Error(`failed to create company: ${response.status}`)
    } catch (_error) {
      setErrorMessage('企業の追加に失敗しました。')
      return
    }

    setNameInput('')
    setNewCompanyStatus(selectionStatusOptions[0])
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

  useEffect(() => {
    void loadCompanies()
  }, [])

  return (
    <main style={{ maxWidth: 760, margin: '40px auto', fontFamily: '"Noto Sans JP", Meiryo, sans-serif' }}>
      <h1>就活企業管理</h1>

      <form onSubmit={onFilterSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          placeholder="企業名で検索"
          style={{ flex: 1 }}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">全ステータス</option>
          {selectionStatusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button type="submit">絞り込み</button>
        <button type="button" onClick={() => void onClearFilter()}>
          クリア
        </button>
      </form>

      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="企業名"
          style={{ flex: 1 }}
        />
        <select value={newCompanyStatus} onChange={(e) => setNewCompanyStatus(e.target.value)}>
          {selectionStatusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button type="submit">追加</button>
      </form>

      {errorMessage && <p style={{ color: '#a52222' }}>{errorMessage}</p>}
      {loading && <p>読み込み中...</p>}

      <ul style={{ padding: 0, listStyle: 'none' }}>
        {companies.map((company) => (
          <li key={company.id} style={{ marginBottom: 12, borderBottom: '1px solid #ddd', paddingBottom: 8 }}>
            <strong>{company.name}</strong> / {company.selectionStatus || '未設定'}
            {company.mypageLink && (
              <>
                {' '}
                /{' '}
                <a href={company.mypageLink} target="_blank" rel="noreferrer">
                  マイページ
                </a>
              </>
            )}
          </li>
        ))}
      </ul>
      {!loading && companies.length === 0 && <p>該当する企業はありません。</p>}
    </main>
  )
}
