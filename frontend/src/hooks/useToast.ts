import { useCallback, useEffect, useRef, useState } from "react"

export type ToastTone = "success" | "error" | "info"

export type ToastItem = {
  id: number
  tone: ToastTone
  message: string
}

const DEFAULT_DURATION_MS = 3200

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(1)
  const timerRef = useRef<Record<number, number>>({})

  const dismissToast = useCallback((id: number) => {
    const timer = timerRef.current[id]
    if (timer) {
      window.clearTimeout(timer)
      delete timerRef.current[id]
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    (message: string, tone: ToastTone = "info", durationMs = DEFAULT_DURATION_MS) => {
      if (!message.trim()) return

      const id = idRef.current
      idRef.current += 1

      setToasts((prev) => [...prev, { id, tone, message }])

      timerRef.current[id] = window.setTimeout(() => {
        dismissToast(id)
      }, durationMs)
    },
    [dismissToast]
  )

  useEffect(() => {
    return () => {
      for (const timer of Object.values(timerRef.current)) {
        window.clearTimeout(timer)
      }
      timerRef.current = {}
    }
  }, [])

  return {
    toasts,
    pushToast,
    dismissToast
  }
}
