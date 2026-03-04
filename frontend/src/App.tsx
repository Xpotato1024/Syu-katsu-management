import { FormEvent, useEffect, useState } from 'react'

type Company = {
  id: string
  name: string
  selectionStatus: string
  mypageLink: string
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export function App() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [name, setName] = useState('')

  async function loadCompanies() {
    const response = await fetch(`${apiBase}/companies`)
    if (!response.ok) return
    const data = (await response.json()) as Company[]
    setCompanies(data)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    await fetch(`${apiBase}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mypageLink: '',
        mypageId: '',
        selectionFlow: '',
        selectionStatus: '未着手',
        esContent: '',
        researchContent: ''
      })
    })

    setName('')
    await loadCompanies()
  }

  useEffect(() => {
    void loadCompanies()
  }, [])

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>就活企業管理</h1>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="企業名" style={{ flex: 1 }} />
        <button type="submit">追加</button>
      </form>

      <ul>
        {companies.map((company) => (
          <li key={company.id} style={{ marginBottom: 12 }}>
            <strong>{company.name}</strong> / {company.selectionStatus || '未設定'}
          </li>
        ))}
      </ul>
    </main>
  )
}
