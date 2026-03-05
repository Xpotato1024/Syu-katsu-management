import type { ToastItem } from "../hooks/useToast"

type ToastViewportProps = {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

function toneLabel(tone: ToastItem["tone"]): string {
  if (tone === "success") return "成功"
  if (tone === "error") return "エラー"
  return "情報"
}

function ToastIcon({ tone }: { tone: ToastItem["tone"] }) {
  if (tone === "success") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.2 16.2 5.8 12.8 4.4 14.2 9.2 19 20 8.2 18.6 6.8z" />
      </svg>
    )
  }

  if (tone === "error") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m13.41 12 4.3-4.29-1.42-1.42L12 10.59 7.71 6.29 6.29 7.71 10.59 12l-4.3 4.29 1.42 1.42L12 13.41l4.29 4.3 1.42-1.42z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 7h2v2h-2zm0 4h2v6h-2z" />
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16" />
    </svg>
  )
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="toast-viewport" role="status" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <span className={`toast-icon toast-icon-${toast.tone}`}>
            <ToastIcon tone={toast.tone} />
          </span>
          <div className="toast-body">
            <span className="toast-title">{toneLabel(toast.tone)}</span>
            <p>{toast.message}</p>
          </div>
          <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="通知を閉じる">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
