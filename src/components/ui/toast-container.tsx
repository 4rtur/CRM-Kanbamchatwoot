'use client'

import { useState, useEffect } from 'react'
import { subscribeToasts, dismissToast, type ToastEvent } from '@/lib/toast'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const TYPE_STYLES: Record<string, string> = {
  success: 'border-green-500/30 bg-green-500/10 text-green-400',
  error: 'border-red-500/30 bg-red-500/10 text-red-400',
  info: 'border-[#1F93FF]/30 bg-[#1F93FF]/10 text-[#1F93FF]',
}

const TYPE_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastEvent[]>([])

  useEffect(() => {
    return subscribeToasts(setToasts)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = TYPE_ICONS[toast.type]
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-200 ${TYPE_STYLES[toast.type]}`}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
