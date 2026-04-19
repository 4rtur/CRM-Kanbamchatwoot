const WEBHOOK_URL_STORAGE_KEY = 'chatwoot-crm-webhook-url'
const WEBHOOK_ENABLED_STORAGE_KEY = 'chatwoot-crm-webhook-enabled'

export interface WebhookPayload {
  event: 'card.moved' | 'card.created' | 'card.label_changed' | 'card.pipeline_moved'
  card: {
    id: string
    contactId: number
    contactName: string
    stageId: string
  }
  from_stage?: string
  to_stage?: string
  from_pipeline?: string
  to_pipeline?: string
  pipeline?: string
  timestamp: string
}

export function getWebhookUrl(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(WEBHOOK_URL_STORAGE_KEY) ?? ''
}

export function setWebhookUrl(url: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(WEBHOOK_URL_STORAGE_KEY, url)
}

export function isWebhookEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(WEBHOOK_ENABLED_STORAGE_KEY) === 'true'
}

export function setWebhookEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(WEBHOOK_ENABLED_STORAGE_KEY, String(enabled))
}

export async function fireWebhook(payload: WebhookPayload): Promise<boolean> {
  const url = getWebhookUrl()
  if (!url || !isWebhookEnabled()) return false

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return true
  } catch {
    return false
  }
}
