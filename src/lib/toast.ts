type ToastType = 'success' | 'error' | 'info'

interface ToastEvent {
  id: string
  message: string
  type: ToastType
  duration: number
}

type ToastListener = (toasts: ToastEvent[]) => void

let toasts: ToastEvent[] = []
let listeners: ToastListener[] = []

function notify(): void {
  for (const listener of listeners) {
    listener([...toasts])
  }
}

export function showToast(message: string, type: ToastType = 'info', duration = 3000): void {
  const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
  const toast: ToastEvent = { id, message, type, duration }
  toasts = [...toasts, toast]
  notify()

  setTimeout(() => {
    dismissToast(id)
  }, duration)
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export type { ToastEvent, ToastType }
