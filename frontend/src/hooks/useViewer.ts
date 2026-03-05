import { useCallback, useState } from "react"
import type { ToastTone } from "./useToast"
import type { AuthConfig, AuthUser } from "../types"

type UseViewerArgs = {
  apiBase: string
  onToast?: (message: string, tone?: ToastTone) => void
}

type LoadViewerOptions = {
  silent?: boolean
}

export function useViewer({ apiBase, onToast }: UseViewerArgs) {
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

  const loadViewer = useCallback(
    async (options: LoadViewerOptions = {}): Promise<boolean> => {
      const { silent = false } = options

      setViewerError("")
      try {
        const response = await fetch(`${apiBase}/me`)
        if (response.status === 401) {
          setViewer(null)
          let message = "未ログインです。"
          if (authConfig.mode === "local") {
            message = "未ログインです。ID/パスワードでログインしてください。"
          } else if (authConfig.mode === "proxy_header") {
            message = "未ログインです。Autheliaのログイン状態を確認してください。"
          }

          setViewerError(message)
          if (!silent) {
            onToast?.(message, "error")
          }
          return false
        }
        if (!response.ok) throw new Error(`failed to load user: ${response.status}`)
        const data = (await response.json()) as AuthUser
        setViewer(data)
        return true
      } catch (_error) {
        setViewer(null)
        setViewerError("アカウント情報の取得に失敗しました。")
        if (!silent) {
          onToast?.("アカウント情報の取得に失敗しました。", "error")
        }
        return false
      }
    },
    [apiBase, authConfig.mode, onToast]
  )

  return {
    viewer,
    viewerError,
    authConfig,
    loadAuthConfig,
    loadViewer
  }
}
