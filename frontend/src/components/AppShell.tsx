import type { ReactNode } from "react"
import { viewLabel } from "../utils/view"
import type { AuthUser, ViewKey } from "../types"

type AppShellProps = {
  children: ReactNode
  isMenuOpen: boolean
  activeView: ViewKey
  viewer: AuthUser | null
  viewerError: string
  logoutURL: string
  onToggleMenu: () => void
  onCloseMenu: () => void
  onNavigate: (view: ViewKey) => void
  onReload: () => void
}

export function AppShell({
  children,
  isMenuOpen,
  activeView,
  viewer,
  viewerError,
  logoutURL,
  onToggleMenu,
  onCloseMenu,
  onNavigate,
  onReload
}: AppShellProps) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <button
          className="icon-button"
          type="button"
          onClick={onToggleMenu}
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
            onClick={() => onNavigate("companies")}
          >
            企業管理
          </button>
          <button
            type="button"
            className={activeView === "timeline" ? "drawer-item active" : "drawer-item"}
            onClick={() => onNavigate("timeline")}
          >
            企業別カレンダー
          </button>
          <button
            type="button"
            className={activeView === "agenda" ? "drawer-item active" : "drawer-item"}
            onClick={() => onNavigate("agenda")}
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
          <button type="button" className="drawer-item" onClick={onReload}>
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
        onClick={onCloseMenu}
      />

      {children}
    </main>
  )
}
