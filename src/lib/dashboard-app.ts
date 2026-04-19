export interface DashboardAppEvent {
  event: string
  data: {
    contact?: { id: number; name: string }
    conversation?: { id: number }
    currentAgent?: { id: number; name: string; email: string }
  }
}

export function isEmbedded(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

type DashboardEventHandler = (event: DashboardAppEvent) => void

export function listenToDashboardEvents(handler: DashboardEventHandler): () => void {
  if (typeof window === 'undefined') return () => {}

  const listener = (event: MessageEvent) => {
    if (event.data && typeof event.data === 'object' && 'event' in event.data) {
      handler(event.data as DashboardAppEvent)
    }
  }

  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}
