import type { ToastItem } from "../hooks/useToast"

type ToastViewportProps = {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="toast-viewport" role="status" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <p>{toast.message}</p>
          <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="通知を閉じる">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
