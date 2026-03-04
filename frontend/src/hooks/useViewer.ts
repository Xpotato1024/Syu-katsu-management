import { useCallback, useState } from "react"
import type { AuthUser } from "../types"

type UseViewerArgs = {
  apiBase: string
}

export function useViewer({ apiBase }: UseViewerArgs) {
  const [viewer, setViewer] = useState<AuthUser | null>(null)
  const [viewerError, setViewerError] = useState("")

  const loadViewer = useCallback(async () => {
    setViewerError("")
    try {
      const response = await fetch(`${apiBase}/me`)
      if (response.status === 401) {
        setViewer(null)
        setViewerError("未ログインです。Autheliaのログイン状態を確認してください。")
        return
      }
      if (!response.ok) throw new Error(`failed to load user: ${response.status}`)
      const data = (await response.json()) as AuthUser
      setViewer(data)
    } catch (_error) {
      setViewer(null)
      setViewerError("アカウント情報の取得に失敗しました。")
    }
  }, [apiBase])

  return {
    viewer,
    viewerError,
    loadViewer
  }
}
