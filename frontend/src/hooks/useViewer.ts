import { useCallback, useState } from "react"
import type { AuthConfig, AuthUser } from "../types"

type UseViewerArgs = {
  apiBase: string
}

export function useViewer({ apiBase }: UseViewerArgs) {
  const [viewer, setViewer] = useState<AuthUser | null>(null)
  const [viewerError, setViewerError] = useState("")
  const [authConfig, setAuthConfig] = useState<AuthConfig>({ mode: "none", allowRegistration: true })

  const loadAuthConfig = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/auth/config`)
      if (!response.ok) return
      const data = (await response.json()) as AuthConfig
      setAuthConfig(data)
    } catch (_error) {
      // use defaults
    }
  }, [apiBase])

  const loadViewer = useCallback(async () => {
    setViewerError("")
    try {
      const response = await fetch(`${apiBase}/me`)
      if (response.status === 401) {
        setViewer(null)
        if (authConfig.mode === "local") {
          setViewerError("未ログインです。ID/パスワードでログインしてください。")
        } else if (authConfig.mode === "proxy_header") {
          setViewerError("未ログインです。Autheliaのログイン状態を確認してください。")
        } else {
          setViewerError("未ログインです。")
        }
        return
      }
      if (!response.ok) throw new Error(`failed to load user: ${response.status}`)
      const data = (await response.json()) as AuthUser
      setViewer(data)
    } catch (_error) {
      setViewer(null)
      setViewerError("アカウント情報の取得に失敗しました。")
    }
  }, [apiBase, authConfig.mode])

  return {
    viewer,
    viewerError,
    authConfig,
    loadAuthConfig,
    loadViewer
  }
}
