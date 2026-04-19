/**
 * Sistema de sincronização em tempo real entre abas do navegador.
 *
 * Usa BroadcastChannel como canal primário e o evento 'storage'
 * do localStorage como fallback para navegadores sem suporte.
 */

const CHANNEL_NAME = 'chatwoot-crm'
const STORAGE_EVENT_KEY = 'chatwoot-crm-realtime-event'

const TAB_ID =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export type RealtimeEventType =
  | 'card_moved'
  | 'card_added'
  | 'card_updated'
  | 'card_deleted'
  | 'pipeline_updated'
  | 'labels_changed'
  | 'note_added'
  | 'checklist_updated'
  | 'priority_changed'
  | 'value_changed'
  | 'products_changed'
  | 'pipeline_added'
  | 'pipeline_deleted'
  | 'product_added'
  | 'product_updated'
  | 'product_deleted'
  | 'auto_move_changed'
  | 'data_refreshed'

export interface RealtimeEvent {
  type: RealtimeEventType
  payload: Record<string, unknown>
  timestamp: number
  tabId: string
}

type EventHandler = (event: RealtimeEvent) => void

let channel: BroadcastChannel | null = null
let storageHandler: ((e: StorageEvent) => void) | null = null
let broadcastSupported = false

/**
 * Inicializa o sistema de sincronização em tempo real.
 * Configura BroadcastChannel (primário) e storage events (fallback).
 * Retorna uma função de cleanup para desmontar os listeners.
 */
export function initRealtime(onEvent: EventHandler): () => void {
  // Primário: BroadcastChannel API
  if (typeof BroadcastChannel !== 'undefined') {
    broadcastSupported = true
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (e: MessageEvent<RealtimeEvent>) => {
      const event = e.data
      if (event.tabId === TAB_ID) return // ignora eco da própria aba
      onEvent(event)
    }
  }

  // Secundário/fallback: storage events (dispara apenas em OUTRAS abas)
  storageHandler = (e: StorageEvent) => {
    if (e.key !== STORAGE_EVENT_KEY || !e.newValue) return
    try {
      const event = JSON.parse(e.newValue) as RealtimeEvent
      if (event.tabId === TAB_ID) return
      onEvent(event)
    } catch {
      // JSON inválido — ignorar
    }
  }
  window.addEventListener('storage', storageHandler)

  return () => {
    if (channel) {
      channel.close()
      channel = null
    }
    if (storageHandler) {
      window.removeEventListener('storage', storageHandler)
      storageHandler = null
    }
    broadcastSupported = false
  }
}

/**
 * Envia um evento para todas as outras abas/janelas abertas.
 * Usa BroadcastChannel quando disponível; caso contrário, dispara
 * via localStorage para acionar o evento 'storage' nas demais abas.
 */
export function broadcastEvent(
  event: Omit<RealtimeEvent, 'timestamp' | 'tabId'>,
): void {
  const fullEvent: RealtimeEvent = {
    ...event,
    timestamp: Date.now(),
    tabId: TAB_ID,
  }

  // Canal primário
  if (broadcastSupported && channel) {
    channel.postMessage(fullEvent)
  }

  // Fallback via localStorage (funciona em todos os navegadores)
  try {
    localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(fullEvent))
    // Remove imediatamente para permitir reenviar o mesmo valor
    localStorage.removeItem(STORAGE_EVENT_KEY)
  } catch {
    // localStorage cheio ou indisponível — ignorar
  }
}

/**
 * Retorna true se o BroadcastChannel está ativo.
 */
export function isBroadcastChannelActive(): boolean {
  return broadcastSupported && channel !== null
}

/**
 * Retorna o ID único desta aba.
 */
export function getTabId(): string {
  return TAB_ID
}
