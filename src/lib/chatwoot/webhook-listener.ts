/**
 * Webhook Listener — ponte entre mudanças no Chatwoot e o CRM.
 *
 * Faz polling periódico na API do Chatwoot (a cada 30 s) para detectar
 * novas conversas e mensagens. Quando encontra dados novos, dispara
 * um evento pelo canal de tempo real para que todas as abas atualizem.
 */

import { getChatwootConfig, isConfigured } from '@/lib/config'
import { broadcastEvent } from '@/lib/realtime'

const POLL_INTERVAL_MS = 30_000
const LAST_POLL_KEY = 'chatwoot-crm-webhook-last-poll'

interface ConversationPayload {
  id: number
  status: string
  created_at: string
  messages: Array<{ id: number; content: string; created_at: string }>
}

interface PollResult {
  conversations: ConversationPayload[]
  meta: { all_count: number }
}

let pollTimerId: ReturnType<typeof setInterval> | null = null
let enabled = false

function getLastPollTimestamp(): number {
  try {
    const stored = localStorage.getItem(LAST_POLL_KEY)
    return stored ? Number(stored) : 0
  } catch {
    return 0
  }
}

function saveLastPollTimestamp(ts: number): void {
  try {
    localStorage.setItem(LAST_POLL_KEY, String(ts))
  } catch {
    // ignorar
  }
}

async function fetchLatestConversations(): Promise<PollResult | null> {
  if (!isConfigured()) return null

  const config = getChatwootConfig()
  const baseUrl = config.url.replace(/\/$/, '')
  const url = `${baseUrl}/api/v1/accounts/${config.accountId}/conversations?page=1&status=open`

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        api_access_token: config.apiToken,
      },
    })

    if (!response.ok) return null

    const json = (await response.json()) as { data: PollResult }
    return json.data
  } catch {
    return null
  }
}

async function poll(): Promise<void> {
  const lastPoll = getLastPollTimestamp()
  const result = await fetchLatestConversations()
  if (!result) return

  const now = Date.now()
  saveLastPollTimestamp(now)

  // Filtra conversas criadas após o último poll
  const newConversations = result.conversations.filter((conv) => {
    const createdAt = new Date(conv.created_at).getTime()
    return createdAt > lastPoll
  })

  if (newConversations.length > 0) {
    broadcastEvent({
      type: 'data_refreshed',
      payload: {
        source: 'chatwoot_poll',
        newConversationsCount: newConversations.length,
        conversationIds: newConversations.map((c) => c.id),
      },
    })
  }
}

/**
 * Inicia o polling periódico do Chatwoot.
 * Se o Chatwoot não estiver configurado, não faz nada.
 */
export function startWebhookListener(): void {
  if (enabled) return
  if (!isConfigured()) return

  enabled = true

  // Salva timestamp inicial caso seja a primeira vez
  if (getLastPollTimestamp() === 0) {
    saveLastPollTimestamp(Date.now())
  }

  pollTimerId = setInterval(() => {
    poll()
  }, POLL_INTERVAL_MS)
}

/**
 * Para o polling periódico.
 */
export function stopWebhookListener(): void {
  if (pollTimerId !== null) {
    clearInterval(pollTimerId)
    pollTimerId = null
  }
  enabled = false
}

/**
 * Retorna se o polling está ativo.
 */
export function isWebhookListenerActive(): boolean {
  return enabled
}

/**
 * Alterna o estado do polling (liga/desliga).
 */
export function toggleWebhookListener(): boolean {
  if (enabled) {
    stopWebhookListener()
  } else {
    startWebhookListener()
  }
  return enabled
}
