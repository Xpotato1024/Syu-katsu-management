import { type FormEvent, useState } from "react"
import type { ToastTone } from "../hooks/useToast"
import type { AuthConfig, AuthUser } from "../types"

type AuthPanelProps = {
  apiBase: string
  loginURL: string
  authConfig: AuthConfig
  viewer: AuthUser | null
  viewerError: string
  onAuthChanged: () => void | Promise<void>
  onToast: (message: string, tone?: ToastTone) => void
}

export function AuthPanel({ apiBase, loginURL, authConfig, viewer, viewerError, onAuthChanged, onToast }: AuthPanelProps) {
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
      onToast("ログインしました。", "success")
      await Promise.resolve(onAuthChanged())
    } catch (_error) {
      setAuthMessage("ログインに失敗しました。")
      onToast("ログインに失敗しました。", "error")
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
      onToast("ユーザー登録が完了し、ログインしました。", "success")
      await Promise.resolve(onAuthChanged())
    } catch (_error) {
      setAuthMessage("ユーザー登録に失敗しました。")
      onToast("ユーザー登録に失敗しました。", "error")
    } finally {
      setLoading(false)
    }
  }

  async function onLogout() {
    setLoading(true)
    setAuthMessage("")
    try {
      const response = await fetch(`${apiBase}/auth/logout`, { method: "POST" })
      if (!response.ok) throw new Error("failed")
      setAuthMessage("ログアウトしました。")
      onToast("ログアウトしました。", "success")
      await Promise.resolve(onAuthChanged())
    } catch (_error) {
      setAuthMessage("ログアウトに失敗しました。")
      onToast("ログアウトに失敗しました。", "error")
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
        <div className="stack">
          <p className="muted">{viewerError || "Authelia 側でログイン後に再読み込みしてください。"}</p>
          {loginURL && (
            <a className="auth-link" href={loginURL}>
              Autheliaでログイン
            </a>
          )}
        </div>
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
          {!authConfig.allowRegistration && (
            <div className="stack auth-note">
              <h3>ユーザー登録</h3>
              <p className="muted">この環境ではアプリ内登録が無効化されています。</p>
              <p className="muted">管理者にユーザー作成を依頼するか、Authelia連携モードを利用してください。</p>
            </div>
          )}
        </div>
      )}
      {authMessage && <p className="muted">{authMessage}</p>}
    </section>
  )
}
