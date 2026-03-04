import { type FormEvent, useState } from "react"
import type { AuthConfig, AuthUser } from "../types"

type AuthPanelProps = {
  apiBase: string
  authConfig: AuthConfig
  viewer: AuthUser | null
  viewerError: string
  onAuthChanged: () => void
}

export function AuthPanel({ apiBase, authConfig, viewer, viewerError, onAuthChanged }: AuthPanelProps) {
  const [loginID, setLoginID] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [registerID, setRegisterID] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerName, setRegisterName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [authMessage, setAuthMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function onLogin(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setAuthMessage("")
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: loginID,
          password: loginPassword
        })
      })
      if (!response.ok) throw new Error("failed")
      setLoginPassword("")
      setAuthMessage("ログインしました。")
      onAuthChanged()
    } catch (_error) {
      setAuthMessage("ログインに失敗しました。")
    } finally {
      setLoading(false)
    }
  }

  async function onRegister(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setAuthMessage("")
    try {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: registerID,
          password: registerPassword,
          name: registerName,
          email: registerEmail
        })
      })
      if (!response.ok) throw new Error("failed")
      setRegisterPassword("")
      setAuthMessage("ユーザー登録が完了し、ログインしました。")
      onAuthChanged()
    } catch (_error) {
      setAuthMessage("ユーザー登録に失敗しました。")
    } finally {
      setLoading(false)
    }
  }

  async function onLogout() {
    setLoading(true)
    setAuthMessage("")
    try {
      await fetch(`${apiBase}/auth/logout`, { method: "POST" })
      setAuthMessage("ログアウトしました。")
      onAuthChanged()
    } finally {
      setLoading(false)
    }
  }

  if (authConfig.mode === "none") {
    return null
  }

  return (
    <section className="panel auth-panel">
      <h2>ログイン</h2>
      {viewer && (
        <div className="auth-current">
          <p className="muted">ログイン中: {viewer.name || viewer.id}</p>
          {authConfig.mode === "local" && (
            <button type="button" onClick={() => void onLogout()} disabled={loading}>
              ログアウト
            </button>
          )}
        </div>
      )}
      {!viewer && authConfig.mode === "proxy_header" && (
        <p className="muted">{viewerError || "Authelia 側でログイン後に再読み込みしてください。"}</p>
      )}
      {!viewer && authConfig.mode === "local" && (
        <div className="auth-grid">
          <form className="stack" onSubmit={onLogin}>
            <h3>ID/パスワードでログイン</h3>
            <input value={loginID} onChange={(e) => setLoginID(e.target.value)} placeholder="ユーザーID" />
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="パスワード" />
            <button type="submit" disabled={loading}>
              ログイン
            </button>
          </form>

          {authConfig.allowRegistration && (
            <form className="stack" onSubmit={onRegister}>
              <h3>ユーザー登録</h3>
              <input value={registerID} onChange={(e) => setRegisterID(e.target.value)} placeholder="ユーザーID" />
              <input
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="パスワード"
              />
              <input value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="表示名（任意）" />
              <input value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} placeholder="メール（任意）" />
              <button type="submit" disabled={loading}>
                登録
              </button>
            </form>
          )}
        </div>
      )}
      {authMessage && <p className="muted">{authMessage}</p>}
    </section>
  )
}
